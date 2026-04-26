from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional
from datetime import date
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/deliveries", tags=["deliveries"])


@router.get("", response_model=schemas.PaginatedDeliveries)
def list_deliveries(
    enterprise_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    has_antibiotics: Optional[bool] = None,
    # Фильтры по показателям качества
    scc_max: Optional[float] = None,
    bact_max: Optional[float] = None,
    fat_min: Optional[float] = None,
    protein_min: Optional[float] = None,
    # Фильтр по сорту
    grade: Optional[str] = Query(None, description="E / I / II / out"),
    ordering: str = Query("-delivery_date", description="Поле сортировки, '-' = убывание"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = (
        db.query(models.Delivery)
        .options(joinedload(models.Delivery.quality), joinedload(models.Delivery.enterprise))
    )

    if enterprise_id:
        q = q.filter(models.Delivery.enterprise_id == enterprise_id)
    if date_from:
        q = q.filter(models.Delivery.delivery_date >= date_from)
    if date_to:
        q = q.filter(models.Delivery.delivery_date <= date_to)
    if has_antibiotics is not None:
        q = q.filter(models.Delivery.has_antibiotics == has_antibiotics)
    if grade == "E":
        q = q.filter(models.Delivery.grade_E_final_kg > 0)
    elif grade == "I":
        q = q.filter(models.Delivery.grade_I_kg > 0)
    elif grade == "II":
        q = q.filter(models.Delivery.grade_II_kg > 0)

    # Фильтры по качеству — джойним quality_results
    if any(v is not None for v in [scc_max, bact_max, fat_min, protein_min]):
        q = q.join(models.QualityResult, isouter=True)
        if scc_max:
            q = q.filter(models.QualityResult.scc <= scc_max)
        if bact_max:
            q = q.filter(models.QualityResult.bact_count_lab <= bact_max)
        if fat_min:
            q = q.filter(models.QualityResult.fat_pct >= fat_min)
        if protein_min:
            q = q.filter(models.QualityResult.protein_pct >= protein_min)

    # Сортировка
    desc = ordering.startswith("-")
    field = ordering.lstrip("-")
    col_map = {
        "delivery_date": models.Delivery.delivery_date,
        "weight_kg": models.Delivery.weight_kg,
        "grade_E_final_kg": models.Delivery.grade_E_final_kg,
    }
    col = col_map.get(field, models.Delivery.delivery_date)
    q = q.order_by(col.desc() if desc else col.asc())

    total = q.count()
    deliveries = q.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for d in deliveries:
        item = schemas.DeliveryOut(
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
            quality=schemas.QualityResultOut.model_validate(d.quality) if d.quality else None,
        )
        items.append(item)

    return schemas.PaginatedDeliveries(total=total, page=page, page_size=page_size, items=items)


@router.get("/{delivery_id}", response_model=schemas.DeliveryOut)
def get_delivery(delivery_id: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    d = (
        db.query(models.Delivery)
        .options(joinedload(models.Delivery.quality), joinedload(models.Delivery.enterprise))
        .filter(models.Delivery.id == delivery_id)
        .first()
    )
    if not d:
        raise HTTPException(status_code=404, detail="Поставка не найдена")
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
        quality=schemas.QualityResultOut.model_validate(d.quality) if d.quality else None,
    )
