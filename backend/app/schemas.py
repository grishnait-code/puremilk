from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel


# ── Enterprise ─────────────────────────────────────────────────────────────

class EnterpriseBase(BaseModel):
    name: str
    short_name: Optional[str] = None
    org_form: Optional[str] = None
    region: Optional[str] = None
    director_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class EnterpriseCreate(EnterpriseBase):
    inn: Optional[str] = None
    ogrn: Optional[str] = None
    legal_address: Optional[str] = None

class EnterpriseOut(EnterpriseBase):
    id: int
    inn: Optional[str] = None
    ogrn: Optional[str] = None
    legal_address: Optional[str] = None
    model_config = {"from_attributes": True}

class EnterpriseList(BaseModel):
    id: int
    name: str
    short_name: Optional[str] = None
    region: Optional[str] = None
    farm_count: Optional[int] = 0
    last_delivery_date: Optional[date] = None
    model_config = {"from_attributes": True}


# ── Farm ───────────────────────────────────────────────────────────────────

class FarmOut(BaseModel):
    id: int
    enterprise_id: int
    name: str
    address: Optional[str] = None
    region: Optional[str] = None
    coordinates: Optional[str] = None
    herd_size: Optional[int] = None
    milking_cows: Optional[int] = None
    annual_volume_t: Optional[float] = None
    housing_type: Optional[str] = None
    milking_system: Optional[str] = None
    floor_type: Optional[str] = None
    cooling_system: Optional[str] = None
    notes: Optional[str] = None
    model_config = {"from_attributes": True}


# ── Audit ──────────────────────────────────────────────────────────────────

class AuditOut(BaseModel):
    id: int
    farm_id: int
    audit_date: date
    result: str
    approval_months: int
    next_audit_date: Optional[date] = None
    overdue_days: Optional[int] = None
    notes: Optional[str] = None
    model_config = {"from_attributes": True}

class AuditWithFarm(AuditOut):
    farm_name: Optional[str] = None
    enterprise_name: Optional[str] = None
    enterprise_id: Optional[int] = None


# ── Quality Result ─────────────────────────────────────────────────────────

class QualityResultOut(BaseModel):
    delivery_id: int
    temperature_lab: Optional[float] = None
    temperature_std: Optional[float] = None
    organoleptic_lab: Optional[float] = None
    organoleptic_std: Optional[float] = None
    scc: Optional[float] = None
    bact_count_lab: Optional[float] = None
    bact_count_std: Optional[float] = None
    freeze_point_lab: Optional[float] = None
    freeze_point_std: Optional[float] = None
    fat_pct: Optional[float] = None
    protein_pct: Optional[float] = None
    lactose_pct: Optional[float] = None
    snf_pct: Optional[float] = None
    density: Optional[float] = None
    alcohol_pct: Optional[float] = None
    acidity: Optional[float] = None
    ph_lab: Optional[float] = None
    ph_std: Optional[float] = None
    coliforms: Optional[float] = None
    fatty_acids: Optional[float] = None
    urea: Optional[float] = None
    clostridium_spores: Optional[float] = None
    model_config = {"from_attributes": True}


# ── Delivery ───────────────────────────────────────────────────────────────

class DeliveryOut(BaseModel):
    id: int
    enterprise_id: int
    enterprise_name: Optional[str] = None
    delivery_date: date
    weight_kg: Optional[float] = None
    grade_E_kg: Optional[float] = None
    grade_I_kg: Optional[float] = None
    grade_II_kg: Optional[float] = None
    grade_out_kg: Optional[float] = None
    grade_E_final_kg: Optional[float] = None
    has_antibiotics: Optional[bool] = False
    calculated_grade: Optional[str] = None   # E / I / II / out — рассчитывается из БД
    quality: Optional[QualityResultOut] = None
    model_config = {"from_attributes": True}


# ── Analytics ──────────────────────────────────────────────────────────────

class YearlyStats(BaseModel):
    year: int
    total_weight_kg: Optional[float] = None
    grade_E_pct: Optional[float] = None
    grade_I_pct: Optional[float] = None
    grade_II_pct: Optional[float] = None
    avg_scc: Optional[float] = None
    avg_bact_count: Optional[float] = None
    avg_fat_pct: Optional[float] = None
    avg_protein_pct: Optional[float] = None
    avg_freeze_point: Optional[float] = None
    avg_coliforms: Optional[float] = None
    avg_clostridium: Optional[float] = None
    delivery_count: Optional[int] = None

class EnterpriseStats(BaseModel):
    enterprise_id: int
    enterprise_name: str
    yearly: List[YearlyStats]


# ── Pagination ─────────────────────────────────────────────────────────────

class PaginatedDeliveries(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[DeliveryOut]

class PaginatedEnterprises(BaseModel):
    total: int
    items: List[EnterpriseList]
