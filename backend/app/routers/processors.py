"""
Роутер для переработчиков молока.
"""
from typing import Optional, List
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app import models

router = APIRouter(prefix="/processors", tags=["processors"])


# ── Схемы ─────────────────────────────────────────────────────────────────

class ProcessorIn(BaseModel):
    name: str
    short_name: Optional[str] = None
    legal_address: Optional[str] = None
    actual_address: Optional[str] = None
    inn: Optional[str] = None
    kpp: Optional[str] = None
    ogrn: Optional[str] = None
    director_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class ProcessorOut(BaseModel):
    id: int
    name: str
    short_name: Optional[str]
    legal_address: Optional[str]
    actual_address: Optional[str]
    inn: Optional[str]
    kpp: Optional[str]
    ogrn: Optional[str]
    director_name: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    notes: Optional[str]
    enterprise_count: int = 0

    class Config:
        from_attributes = True


class LinkIn(BaseModel):
    enterprise_id: int
    started_at: Optional[date] = None
    ended_at: Optional[date] = None
    notes: Optional[str] = None


class LinkOut(BaseModel):
    id: int
    enterprise_id: int
    enterprise_name: str
    enterprise_short_name: Optional[str]
    started_at: Optional[date]
    ended_at: Optional[date]
    notes: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class DeliverySummary(BaseModel):
    enterprise_id: int
    enterprise_name: str
    year: int
    month: int
    total_kg: float
    deliveries_count: int


# ── CRUD переработчиков ────────────────────────────────────────────────────

@router.get("", response_model=List[ProcessorOut])
def list_processors(db: Session = Depends(get_db)):
    rows = db.query(models.Processor).order_by(models.Processor.name).all()
    result = []
    for p in rows:
        count = db.query(func.count(models.EnterpriseProcessor.id)).filter(
            models.EnterpriseProcessor.processor_id == p.id
        ).scalar()
        out = ProcessorOut.model_validate(p)
        out.enterprise_count = count or 0
        result.append(out)
    return result


@router.get("/{processor_id}", response_model=ProcessorOut)
def get_processor(processor_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Processor).filter(models.Processor.id == processor_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Переработчик не найден")
    count = db.query(func.count(models.EnterpriseProcessor.id)).filter(
        models.EnterpriseProcessor.processor_id == p.id
    ).scalar()
    out = ProcessorOut.model_validate(p)
    out.enterprise_count = count or 0
    return out


@router.post("", response_model=ProcessorOut)
def create_processor(body: ProcessorIn, db: Session = Depends(get_db)):
    p = models.Processor(**body.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    out = ProcessorOut.model_validate(p)
    out.enterprise_count = 0
    return out


@router.put("/{processor_id}", response_model=ProcessorOut)
def update_processor(processor_id: int, body: ProcessorIn, db: Session = Depends(get_db)):
    p = db.query(models.Processor).filter(models.Processor.id == processor_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Переработчик не найден")
    for k, v in body.model_dump().items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    count = db.query(func.count(models.EnterpriseProcessor.id)).filter(
        models.EnterpriseProcessor.processor_id == p.id
    ).scalar()
    out = ProcessorOut.model_validate(p)
    out.enterprise_count = count or 0
    return out


@router.delete("/{processor_id}")
def delete_processor(processor_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Processor).filter(models.Processor.id == processor_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Переработчик не найден")
    db.delete(p)
    db.commit()
    return {"status": "ok"}


# ── Привязки предприятий ───────────────────────────────────────────────────

@router.get("/{processor_id}/enterprises", response_model=List[LinkOut])
def list_links(processor_id: int, db: Session = Depends(get_db)):
    links = (
        db.query(models.EnterpriseProcessor)
        .filter(models.EnterpriseProcessor.processor_id == processor_id)
        .all()
    )
    result = []
    for lnk in links:
        e = db.query(models.Enterprise).filter(models.Enterprise.id == lnk.enterprise_id).first()
        result.append(LinkOut(
            id=lnk.id,
            enterprise_id=lnk.enterprise_id,
            enterprise_name=e.name if e else "—",
            enterprise_short_name=e.short_name if e else None,
            started_at=lnk.started_at,
            ended_at=lnk.ended_at,
            notes=lnk.notes,
            is_active=lnk.ended_at is None,
        ))
    return result


@router.post("/{processor_id}/enterprises", response_model=LinkOut)
def add_link(processor_id: int, body: LinkIn, db: Session = Depends(get_db)):
    existing = db.query(models.EnterpriseProcessor).filter(
        models.EnterpriseProcessor.processor_id == processor_id,
        models.EnterpriseProcessor.enterprise_id == body.enterprise_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Предприятие уже привязано к этому переработчику")

    lnk = models.EnterpriseProcessor(
        processor_id=processor_id,
        enterprise_id=body.enterprise_id,
        started_at=body.started_at,
        ended_at=body.ended_at,
        notes=body.notes,
    )
    db.add(lnk)
    db.commit()
    db.refresh(lnk)
    e = db.query(models.Enterprise).filter(models.Enterprise.id == body.enterprise_id).first()
    return LinkOut(
        id=lnk.id,
        enterprise_id=lnk.enterprise_id,
        enterprise_name=e.name if e else "—",
        enterprise_short_name=e.short_name if e else None,
        started_at=lnk.started_at,
        ended_at=lnk.ended_at,
        notes=lnk.notes,
        is_active=lnk.ended_at is None,
    )


@router.put("/{processor_id}/enterprises/{link_id}", response_model=LinkOut)
def update_link(processor_id: int, link_id: int, body: LinkIn, db: Session = Depends(get_db)):
    lnk = db.query(models.EnterpriseProcessor).filter(
        models.EnterpriseProcessor.id == link_id,
        models.EnterpriseProcessor.processor_id == processor_id,
    ).first()
    if not lnk:
        raise HTTPException(status_code=404, detail="Привязка не найдена")
    lnk.started_at = body.started_at
    lnk.ended_at = body.ended_at
    lnk.notes = body.notes
    db.commit()
    db.refresh(lnk)
    e = db.query(models.Enterprise).filter(models.Enterprise.id == lnk.enterprise_id).first()
    return LinkOut(
        id=lnk.id,
        enterprise_id=lnk.enterprise_id,
        enterprise_name=e.name if e else "—",
        enterprise_short_name=e.short_name if e else None,
        started_at=lnk.started_at,
        ended_at=lnk.ended_at,
        notes=lnk.notes,
        is_active=lnk.ended_at is None,
    )


@router.delete("/{processor_id}/enterprises/{link_id}")
def delete_link(processor_id: int, link_id: int, db: Session = Depends(get_db)):
    lnk = db.query(models.EnterpriseProcessor).filter(
        models.EnterpriseProcessor.id == link_id,
        models.EnterpriseProcessor.processor_id == processor_id,
    ).first()
    if not lnk:
        raise HTTPException(status_code=404, detail="Привязка не найдена")
    db.delete(lnk)
    db.commit()
    return {"status": "ok"}


# ── История поставок ───────────────────────────────────────────────────────

@router.get("/{processor_id}/deliveries")
def processor_deliveries(processor_id: int, db: Session = Depends(get_db)):
    """
    Суммарные поставки по предприятиям, привязанным к переработчику.
    Возвращает список: {enterprise_id, enterprise_name, year, month, total_kg, deliveries_count}
    """
    links = db.query(models.EnterpriseProcessor).filter(
        models.EnterpriseProcessor.processor_id == processor_id
    ).all()
    enterprise_ids = [lnk.enterprise_id for lnk in links]
    if not enterprise_ids:
        return []

    rows = (
        db.query(
            models.Delivery.enterprise_id,
            func.extract("year",  models.Delivery.delivery_date).label("year"),
            func.extract("month", models.Delivery.delivery_date).label("month"),
            func.sum(models.Delivery.weight_kg).label("total_kg"),
            func.count(models.Delivery.id).label("deliveries_count"),
        )
        .filter(models.Delivery.enterprise_id.in_(enterprise_ids))
        .group_by(
            models.Delivery.enterprise_id,
            func.extract("year",  models.Delivery.delivery_date),
            func.extract("month", models.Delivery.delivery_date),
        )
        .order_by(
            models.Delivery.enterprise_id,
            func.extract("year",  models.Delivery.delivery_date),
            func.extract("month", models.Delivery.delivery_date),
        )
        .all()
    )

    enterprise_map = {
        e.id: e for e in db.query(models.Enterprise)
        .filter(models.Enterprise.id.in_(enterprise_ids)).all()
    }

    return [
        {
            "enterprise_id": r.enterprise_id,
            "enterprise_name": enterprise_map[r.enterprise_id].short_name
                               or enterprise_map[r.enterprise_id].name,
            "year": int(r.year),
            "month": int(r.month),
            "total_kg": float(r.total_kg or 0),
            "deliveries_count": r.deliveries_count,
        }
        for r in rows
    ]
