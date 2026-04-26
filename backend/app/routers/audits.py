from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional
from datetime import date
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/audits", tags=["audits"])


@router.get("", response_model=list[schemas.AuditWithFarm])
def list_audits(
    overdue_only: bool = Query(False, description="Только просроченные"),
    result: Optional[str] = None,
    upcoming_days: Optional[int] = Query(None, description="Аудиты в ближайшие N дней"),
    db: Session = Depends(get_db),
):
    q = (
        db.query(models.Audit)
        .options(
            joinedload(models.Audit.farm).joinedload(models.Farm.enterprise)
        )
        .order_by(models.Audit.next_audit_date.asc())
    )

    if overdue_only:
        today = date.today()
        q = q.filter(
            models.Audit.next_audit_date < today
        )
    if result:
        q = q.filter(models.Audit.result == result)
    if upcoming_days:
        from datetime import timedelta
        today = date.today()
        cutoff = today + timedelta(days=upcoming_days)
        q = q.filter(
            models.Audit.next_audit_date >= today,
            models.Audit.next_audit_date <= cutoff,
        )

    audits = q.all()
    result_list = []
    for a in audits:
        farm = a.farm
        enterprise = farm.enterprise if farm else None
        result_list.append(schemas.AuditWithFarm(
            id=a.id,
            farm_id=a.farm_id,
            audit_date=a.audit_date,
            result=a.result,
            approval_months=a.approval_months,
            next_audit_date=a.next_audit_date,
            overdue_days=a.overdue_days,
            notes=a.notes,
            farm_name=farm.name if farm else None,
            enterprise_name=enterprise.name if enterprise else None,
            enterprise_id=enterprise.id if enterprise else None,
        ))
    return result_list
