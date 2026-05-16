from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from pydantic import BaseModel
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/audits", tags=["audits"])


class AuditCreate(BaseModel):
    farm_id: int
    audit_date: date
    result: str                        # одобрено / условно / отказано
    approval_months: int
    next_audit_date: Optional[date] = None    # если None — считается автоматически
    notification_date: Optional[date] = None  # если None — за 30 дней до следующего
    notes: Optional[str] = None


def _build_audit_with_farm(a, db: Session) -> schemas.AuditWithFarm:
    farm = a.farm
    enterprise = farm.enterprise if farm else None
    today = date.today()
    overdue = None
    if a.next_audit_date:
        diff = (today - a.next_audit_date).days
        overdue = diff if diff > 0 else 0
    return schemas.AuditWithFarm(
        id=a.id,
        farm_id=a.farm_id,
        audit_date=a.audit_date,
        result=a.result,
        approval_months=a.approval_months,
        next_audit_date=a.next_audit_date,
        overdue_days=overdue,
        notes=a.notes,
        farm_name=farm.name if farm else None,
        enterprise_name=enterprise.name if enterprise else None,
        enterprise_id=enterprise.id if enterprise else None,
    )


@router.get("", response_model=list[schemas.AuditWithFarm])
def list_audits(
    overdue_only: bool = Query(False),
    result: Optional[str] = None,
    upcoming_days: Optional[int] = None,
    enterprise_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = (
        db.query(models.Audit)
        .options(joinedload(models.Audit.farm).joinedload(models.Farm.enterprise))
        .order_by(models.Audit.next_audit_date.asc())
    )
    if enterprise_id:
        q = q.join(models.Farm).filter(models.Farm.enterprise_id == enterprise_id)
    if overdue_only:
        q = q.filter(models.Audit.next_audit_date < date.today())
    if result:
        q = q.filter(models.Audit.result == result)
    if upcoming_days:
        cutoff = date.today() + timedelta(days=upcoming_days)
        q = q.filter(
            models.Audit.next_audit_date >= date.today(),
            models.Audit.next_audit_date <= cutoff,
        )

    return [_build_audit_with_farm(a, db) for a in q.all()]


@router.post("", response_model=schemas.AuditWithFarm)
def create_audit(body: AuditCreate, db: Session = Depends(get_db)):
    farm = db.query(models.Farm).filter(models.Farm.id == body.farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Ферма не найдена")

    # Вычисляем next_audit_date если не указана
    next_date = body.next_audit_date
    if next_date is None:
        next_date = body.audit_date + relativedelta(months=body.approval_months)

    # Уведомление — за 30 дней до следующего аудита
    notif_date = body.notification_date
    if notif_date is None:
        notif_date = next_date - timedelta(days=30)

    today = date.today()
    overdue = max(0, (today - next_date).days) if next_date < today else 0

    audit = models.Audit(
        farm_id=body.farm_id,
        audit_date=body.audit_date,
        result=body.result,
        approval_months=body.approval_months,
        next_audit_date=next_date,
        notification_date=notif_date,
        overdue_days=overdue,
        notes=body.notes,
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)

    # Перезагружаем с join-ами
    a = db.query(models.Audit).options(
        joinedload(models.Audit.farm).joinedload(models.Farm.enterprise)
    ).filter(models.Audit.id == audit.id).first()
    return _build_audit_with_farm(a, db)


@router.put("/{audit_id}", response_model=schemas.AuditWithFarm)
def update_audit(audit_id: int, body: AuditCreate, db: Session = Depends(get_db)):
    audit = db.query(models.Audit).filter(models.Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Аудит не найден")

    next_date = body.next_audit_date or (
        body.audit_date + relativedelta(months=body.approval_months)
    )
    notif_date = body.notification_date or (next_date - timedelta(days=30))
    today = date.today()
    overdue = max(0, (today - next_date).days) if next_date < today else 0

    audit.farm_id = body.farm_id
    audit.audit_date = body.audit_date
    audit.result = body.result
    audit.approval_months = body.approval_months
    audit.next_audit_date = next_date
    audit.notification_date = notif_date
    audit.overdue_days = overdue
    audit.notes = body.notes

    db.commit()
    db.refresh(audit)

    a = db.query(models.Audit).options(
        joinedload(models.Audit.farm).joinedload(models.Farm.enterprise)
    ).filter(models.Audit.id == audit.id).first()
    return _build_audit_with_farm(a, db)


@router.delete("/{audit_id}")
def delete_audit(audit_id: int, db: Session = Depends(get_db)):
    audit = db.query(models.Audit).filter(models.Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    db.delete(audit)
    db.commit()
    return {"status": "ok"}
