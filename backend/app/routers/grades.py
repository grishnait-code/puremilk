from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app import models

router = APIRouter(prefix="/grades", tags=["grades"])


class GradeOut(BaseModel):
    id: int
    code: str
    display_name: str
    sort_order: int
    color: str
    is_active: bool
    model_config = {"from_attributes": True}


class GradeCreate(BaseModel):
    display_name: str
    color: Optional[str] = "#607d8b"


class GradeUpdate(BaseModel):
    display_name: Optional[str] = None
    sort_order: Optional[int] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("", response_model=list[GradeOut])
def list_grades(db: Session = Depends(get_db)):
    return db.query(models.Grade).order_by(models.Grade.sort_order).all()


@router.post("", response_model=GradeOut)
def create_grade(body: GradeCreate, db: Session = Depends(get_db)):
    # Генерируем уникальный код
    existing_codes = [g.code for g in db.query(models.Grade).all()]
    base = "G"
    n = 1
    while f"{base}{n}" in existing_codes:
        n += 1
    code = f"{base}{n}"

    # Определяем sort_order = последний + 1
    max_order = db.query(models.Grade).count()

    # Создаём сорт и копируем нормативы через SQL-функцию
    result = db.execute(
        text("SELECT create_grade_with_standards(:code, :name, :order, :color)"),
        {
            "code": code,
            "name": body.display_name,
            "order": max_order + 1,
            "color": body.color or "#607d8b",
        }
    )
    db.commit()

    grade = db.query(models.Grade).filter(models.Grade.code == code).first()
    return grade


@router.put("/{grade_id}", response_model=GradeOut)
def update_grade(grade_id: int, body: GradeUpdate, db: Session = Depends(get_db)):
    grade = db.query(models.Grade).filter(models.Grade.id == grade_id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Сорт не найден")

    if body.display_name is not None:
        grade.display_name = body.display_name
    if body.sort_order is not None:
        grade.sort_order = body.sort_order
    if body.color is not None:
        grade.color = body.color
    if body.is_active is not None:
        grade.is_active = body.is_active

    db.commit()
    db.refresh(grade)
    return grade


@router.delete("/{grade_id}")
def delete_grade(grade_id: int, db: Session = Depends(get_db)):
    grade = db.query(models.Grade).filter(models.Grade.id == grade_id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Сорт не найден")

    # Удаляем нормативы этого сорта
    db.query(models.GradeStandard).filter(
        models.GradeStandard.grade == grade.code
    ).delete()
    db.delete(grade)
    db.commit()
    return {"status": "ok"}


@router.post("/reorder")
def reorder_grades(order: list[int], db: Session = Depends(get_db)):
    """Принимает список grade_id в нужном порядке, обновляет sort_order."""
    for idx, grade_id in enumerate(order, start=1):
        db.query(models.Grade).filter(
            models.Grade.id == grade_id
        ).update({"sort_order": idx})
    db.commit()
    return {"status": "ok"}
