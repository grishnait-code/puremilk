from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, text, select
from typing import Optional
from datetime import date
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/deliveries", tags=["deliveries"])


def build_filter_query(db: Session, enterprise_id, date_from, date_to,
                       weight_min, weight_max, has_antibiotics, grade,
                       scc_min, scc_max, bact_min, bact_max,
                       freeze_min, freeze_max, fat_min, fat_max,
                       protein_min, protein_max, lactose_min, lactose_max,
                       snf_min, snf_max, density_min, density_max,
                       alcohol_min, alcohol_max, acidity_min, acidity_max,
                       ph_min, ph_max, coliforms_min, coliforms_max,
                       fatty_acids_min, fatty_acids_max, urea_min, urea_max,
                       clostridium_min, clostridium_max,
                       temp_min=None, temp_max=None,
                       org_min=None, org_max=None,
                       processor_id=None):
    """Строит отфильтрованный запрос для deliveries (переиспользуется в list и stats)."""
    q = db.query(models.Delivery)
    if enterprise_id:
        q = q.filter(models.Delivery.enterprise_id == enterprise_id)
    elif processor_id:
        linked_ids = [
            lnk.enterprise_id for lnk in
            db.query(models.EnterpriseProcessor)
            .filter(models.EnterpriseProcessor.processor_id == processor_id).all()
        ]
        if linked_ids:
            q = q.filter(models.Delivery.enterprise_id.in_(linked_ids))
        else:
            q = q.filter(False)  # нет привязанных предприятий — пустой результат
    if date_from:
        q = q.filter(models.Delivery.delivery_date >= date_from)
    if date_to:
        q = q.filter(models.Delivery.delivery_date <= date_to)
    if weight_min is not None:
        q = q.filter(models.Delivery.weight_kg >= weight_min)
    if weight_max is not None:
        q = q.filter(models.Delivery.weight_kg <= weight_max)
    if has_antibiotics is not None:
        q = q.filter(models.Delivery.has_antibiotics == has_antibiotics)
    if grade in ("E", "I", "II", "out"):
        q = q.filter(func.calculate_grade(models.Delivery.id) == grade)

    quality_filters = [
        temp_min, temp_max, org_min, org_max,
        scc_min, scc_max, bact_min, bact_max, freeze_min, freeze_max,
        fat_min, fat_max, protein_min, protein_max,
        lactose_min, lactose_max, snf_min, snf_max,
        density_min, density_max, alcohol_min, alcohol_max,
        acidity_min, acidity_max, ph_min, ph_max,
        coliforms_min, coliforms_max, fatty_acids_min, fatty_acids_max,
        urea_min, urea_max, clostridium_min, clostridium_max,
    ]
    if any(v is not None for v in quality_filters):
        q = q.join(models.QualityResult,
                   models.Delivery.id == models.QualityResult.delivery_id,
                   isouter=True)
        def rng(col, mn, mx):
            nonlocal q
            if mn is not None: q = q.filter(col >= mn)
            if mx is not None: q = q.filter(col <= mx)
        QR = models.QualityResult
        rng(QR.temperature_lab,    temp_min,       temp_max)
        rng(QR.organoleptic_lab,   org_min,        org_max)
        rng(QR.scc,                scc_min,        scc_max)
        rng(QR.bact_count_lab,     bact_min,       bact_max)
        rng(QR.freeze_point_lab,   freeze_min,     freeze_max)
        rng(QR.fat_pct,            fat_min,        fat_max)
        rng(QR.protein_pct,        protein_min,    protein_max)
        rng(QR.lactose_pct,        lactose_min,    lactose_max)
        rng(QR.snf_pct,            snf_min,        snf_max)
        rng(QR.density,            density_min,    density_max)
        rng(QR.alcohol_pct,        alcohol_min,    alcohol_max)
        rng(QR.acidity,            acidity_min,    acidity_max)
        rng(QR.ph_lab,             ph_min,         ph_max)
        rng(QR.coliforms,          coliforms_min,  coliforms_max)
        rng(QR.fatty_acids,        fatty_acids_min, fatty_acids_max)
        rng(QR.urea,               urea_min,       urea_max)
        rng(QR.clostridium_spores, clostridium_min, clostridium_max)
    return q


def get_calculated_grades(db: Session, delivery_ids: list[int]) -> dict[int, str]:
    """Вызывает calculate_grade() для списка поставок одним запросом."""
    if not delivery_ids:
        return {}
    try:
        result = db.execute(
            select(
                models.Delivery.id,
                func.calculate_grade(models.Delivery.id).label("grade")
            ).where(models.Delivery.id.in_(delivery_ids))
        ).fetchall()
        return {row[0]: row[1] for row in result}
    except Exception as e:
        print(f"[WARN] calculate_grade failed: {e}")
        return {}


def build_delivery_out(d, grade: str | None = None) -> schemas.DeliveryOut:
    return schemas.DeliveryOut(
        id=d.id,
        enterprise_id=d.enterprise_id,
        enterprise_name=d.enterprise.name if d.enterprise else None,
        delivery_date=d.delivery_date,
        weight_kg=float(d.weight_kg) if d.weight_kg else None,
        grade_E_kg=float(d.grade_E_kg) if d.grade_E_kg else None,
        grade_I_kg=float(d.grade_I_kg) if d.grade_I_kg else None,
        grade_II_kg=float(d.grade_II_kg) if d.grade_II_kg else None,
        grade_out_kg=float(d.grade_out_kg) if d.grade_out_kg else None,
        grade_E_final_kg=float(d.grade_E_final_kg) if d.grade_E_final_kg else None,
        has_antibiotics=d.has_antibiotics or False,
        calculated_grade=grade,
        quality=schemas.QualityResultOut.model_validate(d.quality) if d.quality else None,
    )


@router.get("/stats")
def get_deliveries_stats(
    enterprise_id: Optional[int] = None,
    processor_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    weight_min: Optional[float] = None, weight_max: Optional[float] = None,
    grade: Optional[str] = None, has_antibiotics: Optional[bool] = None,
    temp_min: Optional[float] = None, temp_max: Optional[float] = None,
    org_min: Optional[float] = None, org_max: Optional[float] = None,
    scc_min: Optional[float] = None, scc_max: Optional[float] = None,
    bact_min: Optional[float] = None, bact_max: Optional[float] = None,
    freeze_min: Optional[float] = None, freeze_max: Optional[float] = None,
    fat_min: Optional[float] = None, fat_max: Optional[float] = None,
    protein_min: Optional[float] = None, protein_max: Optional[float] = None,
    lactose_min: Optional[float] = None, lactose_max: Optional[float] = None,
    snf_min: Optional[float] = None, snf_max: Optional[float] = None,
    density_min: Optional[float] = None, density_max: Optional[float] = None,
    alcohol_min: Optional[float] = None, alcohol_max: Optional[float] = None,
    acidity_min: Optional[float] = None, acidity_max: Optional[float] = None,
    ph_min: Optional[float] = None, ph_max: Optional[float] = None,
    coliforms_min: Optional[float] = None, coliforms_max: Optional[float] = None,
    fatty_acids_min: Optional[float] = None, fatty_acids_max: Optional[float] = None,
    urea_min: Optional[float] = None, urea_max: Optional[float] = None,
    clostridium_min: Optional[float] = None, clostridium_max: Optional[float] = None,
    db: Session = Depends(get_db),
):
    """Распределение по сортам для текущей выборки (с теми же фильтрами)."""
    q = build_filter_query(
        db, enterprise_id, date_from, date_to, weight_min, weight_max,
        has_antibiotics, grade, scc_min, scc_max, bact_min, bact_max,
        freeze_min, freeze_max, fat_min, fat_max, protein_min, protein_max,
        lactose_min, lactose_max, snf_min, snf_max, density_min, density_max,
        alcohol_min, alcohol_max, acidity_min, acidity_max, ph_min, ph_max,
        coliforms_min, coliforms_max, fatty_acids_min, fatty_acids_max,
        urea_min, urea_max, clostridium_min, clostridium_max,
        temp_min, temp_max, org_min, org_max, processor_id=processor_id,
    )
    delivery_ids = [row.id for row in q.with_entities(models.Delivery.id).all()]
    total = len(delivery_ids)
    if total == 0:
        return {"total": 0, "grades": {}}

    try:
        rows = db.execute(
            select(
                func.calculate_grade(models.Delivery.id).label("g"),
                func.count(models.Delivery.id).label("cnt")
            )
            .where(models.Delivery.id.in_(delivery_ids))
            .group_by(func.calculate_grade(models.Delivery.id))
        ).fetchall()
        grades_map = {r[0]: r[1] for r in rows}
    except Exception:
        return {"total": total, "grades": {}}

    result = {}
    for g, cnt in grades_map.items():
        result[g or "unknown"] = {
            "count": cnt,
            "pct": round(cnt / total * 100, 1)
        }
    return {"total": total, "grades": result}


@router.get("", response_model=schemas.PaginatedDeliveries)
def list_deliveries(
    # Идентификация
    enterprise_id: Optional[int] = None,
    processor_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    weight_min: Optional[float] = None,
    weight_max: Optional[float] = None,
    # Сортность
    grade: Optional[str] = Query(None, description="E / I / II / out"),
    # Антибиотики
    has_antibiotics: Optional[bool] = None,
    # Температура
    temp_min: Optional[float] = None,
    temp_max: Optional[float] = None,
    # Органолептика
    org_min: Optional[float] = None,
    org_max: Optional[float] = None,
    # Соматика
    scc_min: Optional[float] = None,
    scc_max: Optional[float] = None,
    # КМАФАнМ
    bact_min: Optional[float] = None,
    bact_max: Optional[float] = None,
    # Точка замерзания
    freeze_min: Optional[float] = None,
    freeze_max: Optional[float] = None,
    # Состав
    fat_min: Optional[float] = None,
    fat_max: Optional[float] = None,
    protein_min: Optional[float] = None,
    protein_max: Optional[float] = None,
    lactose_min: Optional[float] = None,
    lactose_max: Optional[float] = None,
    snf_min: Optional[float] = None,
    snf_max: Optional[float] = None,
    # Физ. свойства
    density_min: Optional[float] = None,
    density_max: Optional[float] = None,
    alcohol_min: Optional[float] = None,
    alcohol_max: Optional[float] = None,
    acidity_min: Optional[float] = None,
    acidity_max: Optional[float] = None,
    # pH
    ph_min: Optional[float] = None,
    ph_max: Optional[float] = None,
    # БГКП
    coliforms_min: Optional[float] = None,
    coliforms_max: Optional[float] = None,
    # СЖК
    fatty_acids_min: Optional[float] = None,
    fatty_acids_max: Optional[float] = None,
    # Мочевина
    urea_min: Optional[float] = None,
    urea_max: Optional[float] = None,
    # Клостридии
    clostridium_min: Optional[float] = None,
    clostridium_max: Optional[float] = None,
    # Сортировка и пагинация
    ordering: str = Query("-delivery_date"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=500),
    db: Session = Depends(get_db),
):
    q = (
        db.query(models.Delivery)
        .options(joinedload(models.Delivery.quality),
                 joinedload(models.Delivery.enterprise))
    )

    # ── Фильтры по Delivery ────────────────────────────────────────────────
    if enterprise_id:
        q = q.filter(models.Delivery.enterprise_id == enterprise_id)
    elif processor_id:
        linked_ids = [
            lnk.enterprise_id for lnk in
            db.query(models.EnterpriseProcessor)
            .filter(models.EnterpriseProcessor.processor_id == processor_id).all()
        ]
        if linked_ids:
            q = q.filter(models.Delivery.enterprise_id.in_(linked_ids))
        else:
            q = q.filter(False)
    if date_from:
        q = q.filter(models.Delivery.delivery_date >= date_from)
    if date_to:
        q = q.filter(models.Delivery.delivery_date <= date_to)
    if weight_min is not None:
        q = q.filter(models.Delivery.weight_kg >= weight_min)
    if weight_max is not None:
        q = q.filter(models.Delivery.weight_kg <= weight_max)
    if has_antibiotics is not None:
        q = q.filter(models.Delivery.has_antibiotics == has_antibiotics)
    if grade in ("E", "I", "II", "out"):
        q = q.filter(func.calculate_grade(models.Delivery.id) == grade)

    # ── Фильтры по QualityResult ───────────────────────────────────────────
    quality_filters = [
        temp_min, temp_max, org_min, org_max,
        scc_min, scc_max, bact_min, bact_max, freeze_min, freeze_max,
        fat_min, fat_max, protein_min, protein_max,
        lactose_min, lactose_max, snf_min, snf_max,
        density_min, density_max, alcohol_min, alcohol_max,
        acidity_min, acidity_max, ph_min, ph_max,
        coliforms_min, coliforms_max, fatty_acids_min, fatty_acids_max,
        urea_min, urea_max, clostridium_min, clostridium_max,
    ]

    if any(v is not None for v in quality_filters):
        q = q.join(models.QualityResult,
                   models.Delivery.id == models.QualityResult.delivery_id,
                   isouter=True)

        def rng(col, mn, mx):
            nonlocal q
            if mn is not None:
                q = q.filter(col >= mn)
            if mx is not None:
                q = q.filter(col <= mx)

        QR = models.QualityResult
        rng(QR.temperature_lab,      temp_min,       temp_max)
        rng(QR.organoleptic_lab,     org_min,        org_max)
        rng(QR.scc,                  scc_min,        scc_max)
        rng(QR.bact_count_lab,       bact_min,       bact_max)
        rng(QR.freeze_point_lab,     freeze_min,     freeze_max)
        rng(QR.fat_pct,              fat_min,        fat_max)
        rng(QR.protein_pct,          protein_min,    protein_max)
        rng(QR.lactose_pct,          lactose_min,    lactose_max)
        rng(QR.snf_pct,              snf_min,        snf_max)
        rng(QR.density,              density_min,    density_max)
        rng(QR.alcohol_pct,          alcohol_min,    alcohol_max)
        rng(QR.acidity,              acidity_min,    acidity_max)
        rng(QR.ph_lab,               ph_min,         ph_max)
        rng(QR.coliforms,            coliforms_min,  coliforms_max)
        rng(QR.fatty_acids,          fatty_acids_min, fatty_acids_max)
        rng(QR.urea,                 urea_min,       urea_max)
        rng(QR.clostridium_spores,   clostridium_min, clostridium_max)

    # ── Сортировка ─────────────────────────────────────────────────────────
    desc = ordering.startswith("-")
    field = ordering.lstrip("-")
    col_map = {
        "delivery_date":    models.Delivery.delivery_date,
        "weight_kg":        models.Delivery.weight_kg,
        "grade_E_final_kg": models.Delivery.grade_E_final_kg,
    }
    col = col_map.get(field, models.Delivery.delivery_date)
    q = q.order_by(col.desc() if desc else col.asc())

    total = q.count()
    deliveries = q.offset((page - 1) * page_size).limit(page_size).all()

    grades = get_calculated_grades(db, [d.id for d in deliveries])
    items = [build_delivery_out(d, grades.get(d.id)) for d in deliveries]

    return schemas.PaginatedDeliveries(
        total=total, page=page, page_size=page_size, items=items
    )


@router.get("/{delivery_id}", response_model=schemas.DeliveryOut)
def get_delivery(delivery_id: int, db: Session = Depends(get_db)):
    d = (
        db.query(models.Delivery)
        .options(joinedload(models.Delivery.quality),
                 joinedload(models.Delivery.enterprise))
        .filter(models.Delivery.id == delivery_id)
        .first()
    )
    if not d:
        raise HTTPException(status_code=404, detail="Поставка не найдена")
    grades = get_calculated_grades(db, [d.id])
    return build_delivery_out(d, grades.get(d.id))
