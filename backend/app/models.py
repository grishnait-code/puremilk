from sqlalchemy import (
    Column, Integer, String, Numeric, Date, Boolean,
    Text, DateTime, ForeignKey, func
)
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    full_name = Column(String(150))
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="user")  # admin | user
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Enterprise(Base):
    __tablename__ = "enterprises"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    short_name = Column(String(100))
    org_form = Column(String(50))
    legal_address = Column(String(500))
    actual_address = Column(String(500))
    region = Column(String(100))
    ogrn = Column(String(15))
    inn = Column(String(12))
    kpp = Column(String(9))
    bank_name = Column(String(255))
    bank_account = Column(String(20))
    corr_account = Column(String(20))
    bik = Column(String(9))
    director_position = Column(String(100))
    director_name = Column(String(150))
    phone = Column(String(50))
    email = Column(String(150))
    notes = Column(Text)

    farms = relationship("Farm", back_populates="enterprise")
    contracts = relationship("Contract", back_populates="enterprise")
    deliveries = relationship("Delivery", back_populates="enterprise")
    targets = relationship("Target", back_populates="enterprise")
    processor_links = relationship("EnterpriseProcessor", back_populates="enterprise")


class Farm(Base):
    __tablename__ = "farms"

    id = Column(Integer, primary_key=True)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"), nullable=False)
    name = Column(String(255), nullable=False)
    address = Column(String(500))
    region = Column(String(100))
    coordinates = Column(String(100))
    herd_size = Column(Integer)
    milking_cows = Column(Integer)
    annual_volume_t = Column(Numeric)
    housing_type = Column(String(50))
    milking_system = Column(String(50))
    floor_type = Column(String(50))
    cooling_system = Column(String(100))
    notes = Column(Text)

    enterprise = relationship("Enterprise", back_populates="farms")
    audits = relationship("Audit", back_populates="farm")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"), nullable=False)
    farm_id = Column(Integer, ForeignKey("farms.id"))
    contract_number = Column(String(100), nullable=False)
    contract_date = Column(Date, nullable=False)
    expiry_date = Column(Date)
    appendix_date = Column(Date)
    notes = Column(Text)

    enterprise = relationship("Enterprise", back_populates="contracts")


class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    audit_date = Column(Date, nullable=False)
    result = Column(String(50), nullable=False)  # одобрено / условно / отказано
    approval_months = Column(Integer, nullable=False)
    next_audit_date = Column(Date)
    notification_date = Column(Date)
    overdue_days = Column(Integer)
    notes = Column(Text)

    farm = relationship("Farm", back_populates="audits")


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"), nullable=False)
    delivery_date = Column(Date, nullable=False)
    weight_kg = Column(Numeric)
    weight_recalc_kg = Column(Numeric)
    grade_E_kg = Column(Numeric)
    grade_I_kg = Column(Numeric)
    grade_II_kg = Column(Numeric)
    grade_out_kg = Column(Numeric)
    grade_error_kg = Column(Numeric)
    grade_E_final_kg = Column(Numeric)
    has_antibiotics = Column(Boolean, default=False)

    enterprise = relationship("Enterprise", back_populates="deliveries")
    quality = relationship("QualityResult", back_populates="delivery", uselist=False)


class QualityResult(Base):
    __tablename__ = "quality_results"

    delivery_id = Column(Integer, ForeignKey("deliveries.id"), primary_key=True)
    temperature_lab = Column(Numeric)
    temperature_std = Column(Numeric)
    organoleptic_lab = Column(Numeric)
    organoleptic_std = Column(Numeric)
    scc = Column(Numeric)              # Соматические клетки, тыс. ед./мл
    bact_count_lab = Column(Numeric)   # КМАФАнМ по ПО
    bact_count_std = Column(Numeric)   # КМАФАнМ по Т001-2
    freeze_point_lab = Column(Numeric) # Точка замерзания по ПО
    freeze_point_std = Column(Numeric) # Точка замерзания по Т001-2
    fat_pct = Column(Numeric)          # Жир, %
    protein_pct = Column(Numeric)      # Белок, %
    lactose_pct = Column(Numeric)      # Лактоза, %
    snf_pct = Column(Numeric)          # СОМО, %
    density = Column(Numeric)          # Плотность, кг/м³
    alcohol_pct = Column(Numeric)
    acidity = Column(Numeric)
    ph_lab = Column(Numeric)
    ph_std = Column(Numeric)
    coliforms = Column(Numeric)        # БГКП, КОЕ/мл
    fatty_acids = Column(Numeric)      # СЖК
    urea = Column(Numeric)             # Мочевина, мг/100 мл
    clostridium_spores = Column(Numeric)  # Споры клостридий, НВЧ/л

    delivery = relationship("Delivery", back_populates="quality")


class Grade(Base):
    __tablename__ = "grades"

    id           = Column(Integer, primary_key=True)
    code         = Column(String(20), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    sort_order   = Column(Integer, nullable=False)
    color        = Column(String(20), default="#1a3a5c")
    is_active    = Column(Boolean, default=True)


class GradeStandard(Base):
    __tablename__ = "grade_standards"

    id = Column(Integer, primary_key=True)
    grade = Column(String(10), nullable=False)
    indicator = Column(String(50), nullable=False)
    value_min = Column(Numeric)
    value_max = Column(Numeric)
    unit = Column(String(30))
    valid_from = Column(Date)
    valid_to = Column(Date)
    source = Column(String(100))


class Target(Base):
    __tablename__ = "targets"

    id = Column(Integer, primary_key=True)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"))
    indicator = Column(String(50), nullable=False)
    value_min = Column(Numeric)
    value_max = Column(Numeric)
    valid_from = Column(Date)
    valid_to = Column(Date)
    notes = Column(Text)

    enterprise = relationship("Enterprise", back_populates="targets")


class Processor(Base):
    __tablename__ = "processors"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    short_name = Column(String(100))
    legal_address = Column(String(500))
    actual_address = Column(String(500))
    inn = Column(String(12))
    kpp = Column(String(9))
    ogrn = Column(String(15))
    director_name = Column(String(150))
    phone = Column(String(50))
    email = Column(String(150))
    notes = Column(Text)

    enterprise_links = relationship("EnterpriseProcessor", back_populates="processor")


class EnterpriseProcessor(Base):
    __tablename__ = "enterprise_processors"

    id = Column(Integer, primary_key=True)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"), nullable=False)
    processor_id = Column(Integer, ForeignKey("processors.id"), nullable=False)
    started_at = Column(Date)
    ended_at = Column(Date)   # NULL = сотрудничество активно
    notes = Column(Text)

    enterprise = relationship("Enterprise", back_populates="processor_links")
    processor = relationship("Processor", back_populates="enterprise_links")


class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)
    file_category = Column(String(50), nullable=False)
    file_date = Column(Date)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    mime_type = Column(String(100))
    file_size_kb = Column(Integer)
    uploaded_at = Column(DateTime)
    uploaded_by = Column(String(100))
    notes = Column(Text)
