from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import date
from pydantic import BaseModel
from app.database import get_db
from app import models

router = APIRouter(prefix="/grade-standards", tags=["grade-standards"])


class StandardOut(BaseModel):
    id: int
    grade: str
    indicator: str
    value_min: Optional[float] = None
    value_max: Optional[float] = None
    unit: Optional[str] = None
    name: Optional[str] = None
    source: Optional[str] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    model_config = {"from_attributes": True}


class StandardUpdate(BaseModel):
    value_min: Optional[float] = None
    value_max: Optional[float] = None


# Человекочитаемые названия показателей
INDICATOR_LABELS = {
    "scc":                "Соматические клетки, тыс/мл",
    "bact_count_lab":     "КМАФАнМ ПО, тыс. КОЕ/мл",
    "fat_pct":            "Жир, %",
    "protein_pct":        "Белок, %",
    "snf_pct":            "СОМО, %",
    "density":            "Плотность, кг/м³",
    "coliforms":          "БГКП, КОЕ/мл",
    "fatty_acids":        "СЖК",
    "clostridium_spores": "Споры клостридий, НВЧ/л",
    "freeze_point_lab":   "Точка замерзания ПО, ×10⁻³ °C",
    "temperature_lab":    "Температура ПО, °C",
    "organoleptic_lab":   "Органолептика ПО, баллы",
    "acidity":            "Кислотность, °T",
}


@router.get("", response_model=list[StandardOut])
def get_standards(db: Session = Depends(get_db)):
    """Все активные нормативы сортности."""
    return db.query(models.GradeStandard).filter(
        models.GradeStandard.valid_to.is_(None)
    ).order_by(
        models.GradeStandard.grade,
        models.GradeStandard.indicator
    ).all()


@router.get("/grouped")
def get_standards_grouped(db: Session = Depends(get_db)):
    """Нормативы сгруппированные по показателю — удобно для таблицы редактирования."""
    rows = db.query(models.GradeStandard).filter(
        models.GradeStandard.valid_to.is_(None)
    ).order_by(
        models.GradeStandard.indicator,
        models.GradeStandard.grade
    ).all()

    # Группируем: { indicator: { grade: {min, max, id, unit} } }
    grouped = {}
    for r in rows:
        if r.indicator not in grouped:
            grouped[r.indicator] = {
                "label": INDICATOR_LABELS.get(r.indicator, r.indicator),
                "unit": r.unit,
                "grades": {}
            }
        grouped[r.indicator]["grades"][r.grade] = {
            "id": r.id,
            "value_min": float(r.value_min) if r.value_min is not None else None,
            "value_max": float(r.value_max) if r.value_max is not None else None,
        }

    return grouped


@router.put("/{standard_id}", response_model=StandardOut)
def update_standard(
    standard_id: int,
    body: StandardUpdate,
    db: Session = Depends(get_db)
):
    """Обновить границы норматива."""
    standard = db.query(models.GradeStandard).filter(
        models.GradeStandard.id == standard_id
    ).first()
    if not standard:
        raise HTTPException(status_code=404, detail="Норматив не найден")

    standard.value_min = body.value_min
    standard.value_max = body.value_max
    db.commit()
    db.refresh(standard)
    return standard


@router.post("/reset")
def reset_to_gost(db: Session = Depends(get_db)):
    """Сбросить все нормативы к значениям ГОСТ 31449-2013."""
    defaults = [
        # Экстра
        ("E", "scc",               None,  200  ),
        ("E", "bact_count_lab",    None,   50  ),
        ("E", "fat_pct",           3.60,  None ),
        ("E", "protein_pct",       3.20,  None ),
        ("E", "snf_pct",           8.20,  None ),
        ("E", "density",        1027.0,   None ),
        ("E", "coliforms",         None,  100  ),
        ("E", "fatty_acids",       None,  0.80 ),
        ("E", "clostridium_spores",None, 1000  ),
        ("E", "freeze_point_lab",  520,   560  ),
        ("E", "temperature_lab",     2,     4  ),
        ("E", "organoleptic_lab",    5,   None ),
        ("E", "acidity",            16,    18  ),
        # Спец. I
        ("I", "scc",               None,  400  ),
        ("I", "bact_count_lab",    None,  100  ),
        ("I", "fat_pct",           3.40,  None ),
        ("I", "protein_pct",       3.00,  None ),
        ("I", "snf_pct",           8.20,  None ),
        ("I", "density",        1027.0,   None ),
        ("I", "coliforms",         None,  200  ),
        ("I", "clostridium_spores",None, 3500  ),
        ("I", "freeze_point_lab",  512,   560  ),
        ("I", "temperature_lab",     2,     6  ),
        ("I", "organoleptic_lab",    4,   None ),
        ("I", "acidity",            16,    18  ),
        # Спец. II
        ("II", "scc",              None,  500  ),
        ("II", "bact_count_lab",   None,  300  ),
        ("II", "fat_pct",          2.80,  None ),
        ("II", "protein_pct",      2.80,  None ),
        ("II", "coliforms",        None,  300  ),
        ("II", "clostridium_spores",None,5000  ),
        ("II", "freeze_point_lab", 506,   560  ),
        ("II", "temperature_lab",    2,    10  ),
        ("II", "organoleptic_lab",   3,   None ),
        ("II", "acidity",           16,    21  ),
    ]

    for grade, indicator, vmin, vmax in defaults:
        db.query(models.GradeStandard).filter(
            models.GradeStandard.grade == grade,
            models.GradeStandard.indicator == indicator,
            models.GradeStandard.valid_to.is_(None),
        ).update({"value_min": vmin, "value_max": vmax})

    db.commit()
    return {"status": "ok", "message": "Нормативы сброшены к ГОСТ 31449-2013"}
