from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app import models, schemas


class EnterpriseCreate(BaseModel):
    name: str
    short_name: Optional[str] = None
    org_form: Optional[str] = None
    region: Optional[str] = None
    legal_address: Optional[str] = None
    actual_address: Optional[str] = None
    ogrn: Optional[str] = None
    inn: Optional[str] = None
    kpp: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    corr_account: Optional[str] = None
    bik: Optional[str] = None
    director_position: Optional[str] = None
    director_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None

router = APIRouter(prefix="/enterprises", tags=["enterprises"])


@router.get("", response_model=schemas.PaginatedEnterprises)
def list_enterprises(
    search: Optional[str] = Query(None, description="Поиск по названию или региону"),
    region: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(models.Enterprise)
    if search:
        q = q.filter(
            models.Enterprise.name.ilike(f"%{search}%") |
            models.Enterprise.short_name.ilike(f"%{search}%")
        )
    if region:
        q = q.filter(models.Enterprise.region == region)

    total = q.count()
    enterprises = q.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for e in enterprises:
        farm_count = db.query(func.count(models.Farm.id)).filter(
            models.Farm.enterprise_id == e.id
        ).scalar()
        last_delivery = db.query(func.max(models.Delivery.delivery_date)).filter(
            models.Delivery.enterprise_id == e.id
        ).scalar()
        items.append(schemas.EnterpriseList(
            id=e.id,
            name=e.name,
            short_name=e.short_name,
            region=e.region,
            farm_count=farm_count or 0,
            last_delivery_date=last_delivery,
        ))

    return schemas.PaginatedEnterprises(total=total, items=items)


@router.post("", response_model=schemas.EnterpriseOut)
def create_enterprise(body: EnterpriseCreate, db: Session = Depends(get_db)):
    e = models.Enterprise(**body.model_dump(exclude_none=False))
    db.add(e)
    db.commit()
    db.refresh(e)
    return e


@router.put("/{enterprise_id}", response_model=schemas.EnterpriseOut)
def update_enterprise(
    enterprise_id: int, body: EnterpriseCreate, db: Session = Depends(get_db)
):
    e = db.query(models.Enterprise).filter(models.Enterprise.id == enterprise_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Предприятие не найдено")
    for field, value in body.model_dump().items():
        setattr(e, field, value)
    db.commit()
    db.refresh(e)
    return e


@router.get("/{enterprise_id}", response_model=schemas.EnterpriseOut)
def get_enterprise(enterprise_id: int, db: Session = Depends(get_db)):
    e = db.query(models.Enterprise).filter(models.Enterprise.id == enterprise_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Предприятие не найдено")
    return e


@router.get("/{enterprise_id}/farms", response_model=list[schemas.FarmOut])
def get_enterprise_farms(enterprise_id: int, db: Session = Depends(get_db)):
    return db.query(models.Farm).filter(models.Farm.enterprise_id == enterprise_id).all()


@router.get("/{enterprise_id}/audits", response_model=list[schemas.AuditOut])
def get_enterprise_audits(enterprise_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Audit)
        .join(models.Farm)
        .filter(models.Farm.enterprise_id == enterprise_id)
        .order_by(models.Audit.audit_date.desc())
        .all()
    )
