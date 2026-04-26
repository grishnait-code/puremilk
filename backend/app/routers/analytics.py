from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional, List
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/analytics", tags=["analytics"])


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
