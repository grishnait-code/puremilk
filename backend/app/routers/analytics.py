from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case, and_, text
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
    # Шаг 1: качественные показатели и объём по годам
    rows = (
        db.query(
            extract("year", models.Delivery.delivery_date).label("year"),
            func.sum(models.Delivery.weight_kg).label("total_weight_kg"),
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

    # Шаг 2: подсчёт партий по рассчитанному сорту
    grade_counts = db.execute(
        text("""
            SELECT extract(year FROM d.delivery_date) AS yr,
                   calculate_grade(d.id) AS g,
                   count(*) AS cnt
            FROM deliveries d
            WHERE d.enterprise_id = :eid
            GROUP BY yr, g
        """),
        {"eid": enterprise_id}
    ).fetchall()

    grade_by_year: dict = {}
    for gc in grade_counts:
        yr = int(gc.yr)
        grade_by_year.setdefault(yr, {})[gc.g or "unknown"] = int(gc.cnt)

    result = []
    for r in rows:
        yr = int(r.year)
        total = float(r.total_weight_kg) if r.total_weight_kg else 0
        cnt = int(r.delivery_count)
        grades = grade_by_year.get(yr, {})

        def pct(g): return round(grades.get(g, 0) / cnt * 100, 2) if cnt > 0 else None

        result.append(schemas.YearlyStats(
            year=yr,
            total_weight_kg=total,
            grade_E_pct=pct("E"),
            grade_I_pct=pct("I"),
            grade_II_pct=pct("II"),
            avg_scc=round(float(r.avg_scc), 1) if r.avg_scc else None,
            avg_bact_count=round(float(r.avg_bact), 1) if r.avg_bact else None,
            avg_fat_pct=round(float(r.avg_fat), 3) if r.avg_fat else None,
            avg_protein_pct=round(float(r.avg_protein), 3) if r.avg_protein else None,
            avg_freeze_point=round(float(r.avg_freeze), 1) if r.avg_freeze else None,
            avg_coliforms=round(float(r.avg_coliforms), 1) if r.avg_coliforms else None,
            avg_clostridium=round(float(r.avg_clostridium), 1) if r.avg_clostridium else None,
            delivery_count=cnt,
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

        # Подсчёт партий по рассчитанному сорту
        gc_q = text("""
            SELECT extract(year FROM d.delivery_date) AS yr,
                   calculate_grade(d.id) AS g, count(*) AS cnt
            FROM deliveries d WHERE d.enterprise_id = :eid
            GROUP BY yr, g
        """)
        if year:
            gc_q = text("""
                SELECT extract(year FROM d.delivery_date) AS yr,
                       calculate_grade(d.id) AS g, count(*) AS cnt
                FROM deliveries d WHERE d.enterprise_id = :eid
                  AND extract(year FROM d.delivery_date) = :yr
                GROUP BY yr, g
            """)
        gc_params = {"eid": e.id, "yr": year} if year else {"eid": e.id}
        grade_by_year: dict = {}
        for gc in db.execute(gc_q, gc_params).fetchall():
            yr = int(gc.yr)
            grade_by_year.setdefault(yr, {})[gc.g or "unknown"] = int(gc.cnt)

        yearly = []
        for r in rows:
            yr = int(r.year)
            total = float(r.total_weight_kg) if r.total_weight_kg else 0
            cnt = int(r.delivery_count)
            grades = grade_by_year.get(yr, {})
            def pct(g): return round(grades.get(g, 0) / cnt * 100, 2) if cnt > 0 else None
            yearly.append(schemas.YearlyStats(
                year=yr,
                total_weight_kg=total,
                grade_E_pct=pct("E"),
                grade_I_pct=pct("I"),
                grade_II_pct=pct("II"),
                avg_scc=round(float(r.avg_scc), 1) if r.avg_scc else None,
                avg_bact_count=round(float(r.avg_bact), 1) if r.avg_bact else None,
                avg_fat_pct=round(float(r.avg_fat), 3) if r.avg_fat else None,
                avg_protein_pct=round(float(r.avg_protein), 3) if r.avg_protein else None,
                delivery_count=cnt,
            ))

        if yearly:
            result.append(schemas.EnterpriseStats(
                enterprise_id=e.id,
                enterprise_name=e.name,
                yearly=yearly,
            ))
    return result


@router.get("/enterprise/{enterprise_id}/monthly")
def get_enterprise_monthly(
    enterprise_id: int,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Помесячная динамика показателей качества — аналог листа 'table for long'."""
    q = (
        db.query(
            extract("year",  models.Delivery.delivery_date).label("yr"),
            extract("month", models.Delivery.delivery_date).label("mo"),
            func.avg(models.QualityResult.scc).label("scc"),
            func.avg(models.QualityResult.bact_count_lab).label("bact_count_lab"),
            func.avg(models.QualityResult.coliforms).label("coliforms"),
            func.avg(models.QualityResult.clostridium_spores).label("clostridium_spores"),
            func.avg(models.QualityResult.fat_pct).label("fat_pct"),
            func.avg(models.QualityResult.protein_pct).label("protein_pct"),
            func.avg(models.QualityResult.freeze_point_lab).label("freeze_point_lab"),
            func.avg(models.QualityResult.temperature_lab).label("temperature_lab"),
            func.avg(models.QualityResult.snf_pct).label("snf_pct"),
            func.avg(models.QualityResult.density).label("density"),
            func.sum(models.Delivery.weight_kg).label("total_weight_kg"),
            func.count(models.Delivery.id).label("delivery_count"),
        )
        .join(models.QualityResult, models.Delivery.id == models.QualityResult.delivery_id)
        .filter(models.Delivery.enterprise_id == enterprise_id)
    )
    if year_from:
        q = q.filter(extract("year", models.Delivery.delivery_date) >= year_from)
    if year_to:
        q = q.filter(extract("year", models.Delivery.delivery_date) <= year_to)

    rows = q.group_by(
        extract("year", models.Delivery.delivery_date),
        extract("month", models.Delivery.delivery_date),
    ).order_by(
        extract("year", models.Delivery.delivery_date),
        extract("month", models.Delivery.delivery_date),
    ).all()

    MONTHS_RU = ["", "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
                 "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]

    def rnd(v, d=1):
        return round(float(v), d) if v is not None else None

    base = [
        {
            "period": f"{MONTHS_RU[int(r.mo)]} {int(r.yr)}",
            "year": int(r.yr), "month": int(r.mo),
            "scc":               rnd(r.scc, 1),
            "bact_count_lab":    rnd(r.bact_count_lab, 1),
            "coliforms":         rnd(r.coliforms, 1),
            "clostridium_spores":rnd(r.clostridium_spores, 0),
            "fat_pct":           rnd(r.fat_pct, 3),
            "protein_pct":       rnd(r.protein_pct, 3),
            "freeze_point_lab":  rnd(r.freeze_point_lab, 1),
            "temperature_lab":   rnd(r.temperature_lab, 1),
            "snf_pct":           rnd(r.snf_pct, 2),
            "density":           rnd(r.density, 0),
            "total_weight_kg":   rnd(r.total_weight_kg, 0),
            "delivery_count":    int(r.delivery_count),
        }
        for r in rows
    ]

    # Разбивка по сортам: считаем calculate_grade по партиям помесячно
    from sqlalchemy import select as sa_select
    grade_rows = db.execute(
        sa_select(
            extract("year",  models.Delivery.delivery_date).label("yr"),
            extract("month", models.Delivery.delivery_date).label("mo"),
            func.calculate_grade(models.Delivery.id).label("g"),
            func.count(models.Delivery.id).label("cnt"),
        )
        .filter(models.Delivery.enterprise_id == enterprise_id)
        .group_by(
            extract("year",  models.Delivery.delivery_date),
            extract("month", models.Delivery.delivery_date),
            func.calculate_grade(models.Delivery.id),
        )
    ).fetchall()

    # Собираем словарь {(yr, mo): {grade: count}}
    grade_map: dict = {}
    for gr in grade_rows:
        key = (int(gr.yr), int(gr.mo))
        grade_map.setdefault(key, {})[gr.g or "unknown"] = int(gr.cnt)

    # Добавляем проценты в базовые строки
    for row in base:
        key = (row["year"], row["month"])
        grades = grade_map.get(key, {})
        total = sum(grades.values()) or 1
        row["grade_E_pct"]   = round(grades.get("E",   0) / total * 100, 1)
        row["grade_I_pct"]   = round(grades.get("I",   0) / total * 100, 1)
        row["grade_II_pct"]  = round(grades.get("II",  0) / total * 100, 1)
        row["grade_out_pct"] = round(grades.get("out", 0) / total * 100, 1)

    return base


@router.get("/enterprise/{enterprise_id}/grade-decline")
def get_grade_decline(
    enterprise_id: int,
    grade: str = Query("E", description="Сорт для анализа: E / I / II"),
    group_by: str = Query("month", description="Группировка: month / quarter / year"),
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    Причины несоответствия сорту — аналог листа 'table Decline of Е'.
    Для каждого периода считает: сколько партий нарушило каждый норматив.
    """
    # Получаем нормативы для выбранного сорта
    standards = db.query(models.GradeStandard).filter(
        models.GradeStandard.grade == grade,
        models.GradeStandard.valid_to.is_(None),
    ).all()

    if not standards:
        return {"periods": [], "indicators": [], "data": {}}

    # Все партии предприятия с quality_results
    deliveries_q = (
        db.query(models.Delivery, models.QualityResult)
        .join(models.QualityResult, models.Delivery.id == models.QualityResult.delivery_id)
        .filter(models.Delivery.enterprise_id == enterprise_id)
    )
    if year_from:
        deliveries_q = deliveries_q.filter(
            extract("year", models.Delivery.delivery_date) >= year_from)
    if year_to:
        deliveries_q = deliveries_q.filter(
            extract("year", models.Delivery.delivery_date) <= year_to)

    rows = deliveries_q.all()

    MONTHS_RU = ["", "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
                 "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]

    def period_key(d):
        yr = d.delivery_date.year
        mo = d.delivery_date.month
        if group_by == "year":
            return str(yr)
        elif group_by == "quarter":
            q = (mo - 1) // 3 + 1
            return f"Q{q} {yr}"
        else:
            return f"{MONTHS_RU[mo]} {yr}"

    # Считаем нарушения по каждому нормативу
    from collections import defaultdict
    counts = defaultdict(lambda: defaultdict(int))
    total_per_period = defaultdict(int)
    periods_order = []
    seen_periods = set()

    for delivery, qr in rows:
        pk = period_key(delivery)
        if pk not in seen_periods:
            seen_periods.add(pk)
            periods_order.append(pk)
        total_per_period[pk] += 1

        q_dict = {
            col.name: getattr(qr, col.name)
            for col in models.QualityResult.__table__.columns
        }

        for std in standards:
            val = q_dict.get(std.indicator)
            if val is None:
                continue
            val = float(val)
            failed = False
            if std.value_max is not None and val > float(std.value_max):
                failed = True
            if std.value_min is not None and val < float(std.value_min):
                failed = True
            if failed:
                counts[pk][std.indicator] += 1

    indicator_labels = {
        "scc":               "Соматика",
        "bact_count_lab":    "КМАФАнМ",
        "coliforms":         "БГКП",
        "clostridium_spores":"Клостридии",
        "fat_pct":           "Жир",
        "protein_pct":       "Белок",
        "freeze_point_lab":  "Т замерзания",
        "temperature_lab":   "Температура",
        "organoleptic_lab":  "Органолептика",
        "acidity":           "Кислотность",
        "snf_pct":           "СОМО",
        "density":           "Плотность",
    }

    active_indicators = [s.indicator for s in standards if s.indicator in indicator_labels]

    data = {}
    for pk in periods_order:
        data[pk] = {
            "total": total_per_period[pk],
            **{ind: counts[pk].get(ind, 0) for ind in active_indicators}
        }

    return {
        "periods": periods_order,
        "indicators": [
            {"key": ind, "label": indicator_labels.get(ind, ind)}
            for ind in active_indicators
        ],
        "data": data,
    }


@router.get("/compare")
def compare_enterprises(
    indicator: str = Query("scc", description="Показатель для сравнения"),
    enterprise_ids: str = Query("", description="ID предприятий через запятую (пусто = все)"),
    group_by: str = Query("year", description="month / quarter / year"),
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Сравнение предприятий по одному показателю."""
    MONTHS_RU = ["", "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
                 "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]

    ids = [int(i) for i in enterprise_ids.split(",") if i.strip()] if enterprise_ids else []

    enterprises = db.query(models.Enterprise)
    if ids:
        enterprises = enterprises.filter(models.Enterprise.id.in_(ids))
    enterprises = enterprises.all()

    col_map = {
        "scc": models.QualityResult.scc,
        "bact_count_lab": models.QualityResult.bact_count_lab,
        "coliforms": models.QualityResult.coliforms,
        "clostridium_spores": models.QualityResult.clostridium_spores,
        "fat_pct": models.QualityResult.fat_pct,
        "protein_pct": models.QualityResult.protein_pct,
        "freeze_point_lab": models.QualityResult.freeze_point_lab,
        "snf_pct": models.QualityResult.snf_pct,
        "density": models.QualityResult.density,
        "urea": models.QualityResult.urea,
    }
    col = col_map.get(indicator, models.QualityResult.scc)

    result = {}
    all_periods = set()

    for e in enterprises:
        q = (
            db.query(
                extract("year", models.Delivery.delivery_date).label("yr"),
                extract("month", models.Delivery.delivery_date).label("mo"),
                func.avg(col).label("val"),
            )
            .join(models.QualityResult, models.Delivery.id == models.QualityResult.delivery_id)
            .filter(models.Delivery.enterprise_id == e.id)
        )
        if year_from:
            q = q.filter(extract("year", models.Delivery.delivery_date) >= year_from)
        if year_to:
            q = q.filter(extract("year", models.Delivery.delivery_date) <= year_to)
        q = q.group_by(
            extract("year", models.Delivery.delivery_date),
            extract("month", models.Delivery.delivery_date),
        ).order_by(
            extract("year", models.Delivery.delivery_date),
            extract("month", models.Delivery.delivery_date),
        )
        rows = q.all()

        series = {}
        for r in rows:
            yr, mo = int(r.yr), int(r.mo)
            if group_by == "year":
                pk = str(yr)
            elif group_by == "quarter":
                pk = f"Q{(mo-1)//3+1} {yr}"
            else:
                pk = f"{MONTHS_RU[mo]} {yr}"
            if pk not in series:
                series[pk] = []
            if r.val is not None:
                series[pk].append(float(r.val))

        result[e.short_name or e.name] = {
            pk: round(sum(v) / len(v), 2) for pk, v in series.items() if v
        }
        all_periods.update(series.keys())

    # Сортируем периоды
    periods = sorted(all_periods)
    return {
        "indicator": indicator,
        "periods": periods,
        "series": result,
    }


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
