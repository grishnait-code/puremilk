from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case
from typing import Optional, List
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Показатели и их целевые значения (как в Report)
REPORT_INDICATORS = [
    {"key": "scc",               "label": "Соматические клетки, тыс. ед./мл", "target": "< 200",     "col": models.QualityResult.scc,               "decimals": 1},
    {"key": "bact_count_lab",    "label": "КМАФАнМ, тыс. КОЕ/мл",             "target": "< 50",      "col": models.QualityResult.bact_count_lab,    "decimals": 1},
    {"key": "coliforms",         "label": "БГКП, КОЕ/мл",                      "target": "< 100",     "col": models.QualityResult.coliforms,         "decimals": 1},
    {"key": "clostridium_spores","label": "Споры клостридий, НВЧ/л",           "target": "< 1000",    "col": models.QualityResult.clostridium_spores,"decimals": 0},
    {"key": "fat_pct",           "label": "Содержание жира, %",                "target": "≥ 3,60",    "col": models.QualityResult.fat_pct,           "decimals": 3},
    {"key": "protein_pct",       "label": "Содержание белка, %",               "target": "≥ 3,20",    "col": models.QualityResult.protein_pct,       "decimals": 3},
    {"key": "freeze_point_lab",  "label": "Точка замерзания ПО, ×10⁻³ °C",    "target": "520–560",   "col": models.QualityResult.freeze_point_lab,  "decimals": 1},
    {"key": "urea",              "label": "Мочевина, мг/100 мл",               "target": "20–30",     "col": models.QualityResult.urea,              "decimals": 1},
    {"key": "ph_lab",            "label": "pH ПО",                             "target": "6,50–7,00", "col": models.QualityResult.ph_lab,            "decimals": 2},
    {"key": "fatty_acids",       "label": "СЖК",                               "target": "< 0,80",    "col": models.QualityResult.fatty_acids,       "decimals": 2},
]


@router.get("/enterprise/{enterprise_id}/report")
def get_enterprise_report(enterprise_id: int, db: Session = Depends(get_db)):
    """Таблица качества по годам и кварталам — аналог вкладки Report в Excel."""

    # Все партии предприятия с показателями качества
    rows = (
        db.query(
            extract("year",    models.Delivery.delivery_date).label("yr"),
            extract("quarter", models.Delivery.delivery_date).label("qtr"),
            *[func.avg(ind["col"]).label(ind["key"]) for ind in REPORT_INDICATORS]
        )
        .join(models.QualityResult,
              models.Delivery.id == models.QualityResult.delivery_id)
        .filter(models.Delivery.enterprise_id == enterprise_id)
        .group_by(
            extract("year",    models.Delivery.delivery_date),
            extract("quarter", models.Delivery.delivery_date),
        )
        .order_by(
            extract("year",    models.Delivery.delivery_date),
            extract("quarter", models.Delivery.delivery_date),
        )
        .all()
    )

    if not rows:
        return {"periods": [], "rows": []}

    QTR_LABELS = {1: "I кв.", 2: "II кв.", 3: "III кв.", 4: "IV кв."}
    all_years = sorted(set(int(r.yr) for r in rows))

    # Группируем строки по году
    year_rows = {}
    for r in rows:
        yr = int(r.yr)
        year_rows.setdefault(yr, []).append(r)

    # Строим структуру: список годовых групп
    year_groups = []
    for yr in all_years:
        quarters = []
        for r in sorted(year_rows[yr], key=lambda x: int(x.qtr)):
            qtr = int(r.qtr)
            qtr_data = {}
            for ind in REPORT_INDICATORS:
                v = getattr(r, ind["key"])
                qtr_data[ind["key"]] = round(float(v), ind["decimals"]) if v is not None else None
            quarters.append({"label": f"{QTR_LABELS[qtr]} {yr}", "data": qtr_data})

        # Годовой итог
        annual_data = {}
        for ind in REPORT_INDICATORS:
            vals = [getattr(r, ind["key"]) for r in year_rows[yr]
                    if getattr(r, ind["key"]) is not None]
            annual_data[ind["key"]] = round(float(sum(vals) / len(vals)), ind["decimals"]) if vals else None

        year_groups.append({
            "year": yr,
            "quarters": quarters,
            "annual": annual_data,
        })

    # Формируем строки показателей
    result_rows = []
    for ind in REPORT_INDICATORS:
        result_rows.append({
            "key":    ind["key"],
            "label":  ind["label"],
            "target": ind["target"],
        })

    return {"year_groups": year_groups, "indicators": result_rows}


@router.get("/enterprise/{enterprise_id}/yearly", response_model=List[schemas.YearlyStats])
def get_enterprise_yearly_stats(
    enterprise_id: int,
    db: Session = Depends(get_db),
):
    """Статистика по годам для конкретного предприятия."""
    rows = (
        db.query(
            extract("year", models.Delivery.delivery_date).label("year"),
            func.sum(models.Delivery.weight_kg).label("total_weight_kg"),
            func.sum(models.Delivery.grade_E_final_kg).label("grade_E_kg"),
            func.sum(models.Delivery.grade_I_kg).label("grade_I_kg"),
            func.sum(models.Delivery.grade_II_kg).label("grade_II_kg"),
            func.avg(models.QualityResult.scc).label("avg_scc"),
            func.avg(models.QualityResult.bact_count_lab).label("avg_bact"),
            func.avg(models.QualityResult.fat_pct).label("avg_fat"),
            func.avg(models.QualityResult.protein_pct).label("avg_protein"),
            func.avg(models.QualityResult.freeze_point_lab).label("avg_freeze"),
            func.avg(models.QualityResult.coliforms).label("avg_coliforms"),
            func.avg(models.QualityResult.clostridium_spores).label("avg_clostridium"),
            func.count(models.Delivery.id).label("delivery_count"),
        )
        .outerjoin(models.QualityResult, models.Delivery.id == models.QualityResult.delivery_id)
        .filter(models.Delivery.enterprise_id == enterprise_id)
        .group_by(extract("year", models.Delivery.delivery_date))
        .order_by(extract("year", models.Delivery.delivery_date))
        .all()
    )

    result = []
    for r in rows:
        total = float(r.total_weight_kg) if r.total_weight_kg else 0
        e_kg = float(r.grade_E_kg) if r.grade_E_kg else 0
        i_kg = float(r.grade_I_kg) if r.grade_I_kg else 0
        ii_kg = float(r.grade_II_kg) if r.grade_II_kg else 0

        result.append(schemas.YearlyStats(
            year=int(r.year),
            total_weight_kg=total,
            grade_E_pct=round(e_kg / total * 100, 2) if total > 0 else None,
            grade_I_pct=round(i_kg / total * 100, 2) if total > 0 else None,
            grade_II_pct=round(ii_kg / total * 100, 2) if total > 0 else None,
            avg_scc=round(float(r.avg_scc), 1) if r.avg_scc else None,
            avg_bact_count=round(float(r.avg_bact), 1) if r.avg_bact else None,
            avg_fat_pct=round(float(r.avg_fat), 3) if r.avg_fat else None,
            avg_protein_pct=round(float(r.avg_protein), 3) if r.avg_protein else None,
            avg_freeze_point=round(float(r.avg_freeze), 1) if r.avg_freeze else None,
            avg_coliforms=round(float(r.avg_coliforms), 1) if r.avg_coliforms else None,
            avg_clostridium=round(float(r.avg_clostridium), 1) if r.avg_clostridium else None,
            delivery_count=int(r.delivery_count),
        ))
    return result


@router.get("/summary", response_model=List[schemas.EnterpriseStats])
def get_summary(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Сводная статистика по всем предприятиям."""
    enterprises = db.query(models.Enterprise).all()
    result = []
    for e in enterprises:
        q = db.query(
            extract("year", models.Delivery.delivery_date).label("year"),
            func.sum(models.Delivery.weight_kg).label("total_weight_kg"),
            func.sum(models.Delivery.grade_E_final_kg).label("grade_E_kg"),
            func.sum(models.Delivery.grade_I_kg).label("grade_I_kg"),
            func.sum(models.Delivery.grade_II_kg).label("grade_II_kg"),
            func.avg(models.QualityResult.scc).label("avg_scc"),
            func.avg(models.QualityResult.bact_count_lab).label("avg_bact"),
            func.avg(models.QualityResult.fat_pct).label("avg_fat"),
            func.avg(models.QualityResult.protein_pct).label("avg_protein"),
            func.count(models.Delivery.id).label("delivery_count"),
        ).outerjoin(
            models.QualityResult, models.Delivery.id == models.QualityResult.delivery_id
        ).filter(models.Delivery.enterprise_id == e.id)

        if year:
            q = q.filter(extract("year", models.Delivery.delivery_date) == year)

        q = q.group_by(extract("year", models.Delivery.delivery_date)).order_by(
            extract("year", models.Delivery.delivery_date)
        )

        rows = q.all()
        yearly = []
        for r in rows:
            total = float(r.total_weight_kg) if r.total_weight_kg else 0
            e_kg = float(r.grade_E_kg) if r.grade_E_kg else 0
            i_kg = float(r.grade_I_kg) if r.grade_I_kg else 0
            ii_kg = float(r.grade_II_kg) if r.grade_II_kg else 0
            yearly.append(schemas.YearlyStats(
                year=int(r.year),
                total_weight_kg=total,
                grade_E_pct=round(e_kg / total * 100, 2) if total > 0 else None,
                grade_I_pct=round(i_kg / total * 100, 2) if total > 0 else None,
                grade_II_pct=round(ii_kg / total * 100, 2) if total > 0 else None,
                avg_scc=round(float(r.avg_scc), 1) if r.avg_scc else None,
                avg_bact_count=round(float(r.avg_bact), 1) if r.avg_bact else None,
                avg_fat_pct=round(float(r.avg_fat), 3) if r.avg_fat else None,
                avg_protein_pct=round(float(r.avg_protein), 3) if r.avg_protein else None,
                delivery_count=int(r.delivery_count),
            ))

        if yearly:
            result.append(schemas.EnterpriseStats(
                enterprise_id=e.id,
                enterprise_name=e.name,
                yearly=yearly,
            ))
    return result


@router.get("/indicators/targets")
def get_targets(db: Session = Depends(get_db)):
    """Глобальные целевые значения показателей."""
    targets = db.query(models.Target).filter(
        models.Target.enterprise_id.is_(None),
        models.Target.valid_to.is_(None),
    ).all()
    return [
        {
            "indicator": t.indicator,
            "value_min": float(t.value_min) if t.value_min else None,
            "value_max": float(t.value_max) if t.value_max else None,
        }
        for t in targets
    ]
