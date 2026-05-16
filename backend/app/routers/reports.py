"""
Генерация PDF-отчёта по качеству молока.
Аналог вкладки Report в Quality Monitor.xlsx.
"""

import io
import os
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.database import get_db
from app import models

router = APIRouter(prefix="/reports", tags=["reports"])

# ── Показатели ─────────────────────────────────────────────────────────────

INDICATORS = [
    {"key": "scc",                "label": "Соматические клетки, тыс/мл",  "target": "<= 200",  "target_max": 200,  "target_min": None, "decimals": 1, "target_str": u"≤ 200"},
    {"key": "bact_count_lab",     "label": u"КМАФАнМ, тыс. КОЕ/мл",       "target": "<= 50",   "target_max": 50,   "target_min": None, "decimals": 1, "target_str": u"≤ 50"},
    {"key": "coliforms",          "label": u"БГКП, КОЕ/мл",                "target": "<= 100",  "target_max": 100,  "target_min": None, "decimals": 1, "target_str": u"≤ 100"},
    {"key": "clostridium_spores", "label": u"Споры клостридий, НВЧ/л",     "target": "<= 1000", "target_max": 1000, "target_min": None, "decimals": 0, "target_str": u"≤ 1000"},
    {"key": "fat_pct",            "label": u"Жир, %",                       "target": ">= 3.6",  "target_max": None, "target_min": 3.6,  "decimals": 3, "target_str": u"≥ 3,60"},
    {"key": "protein_pct",        "label": u"Белок, %",                     "target": ">= 3.2",  "target_max": None, "target_min": 3.2,  "decimals": 3, "target_str": u"≥ 3,20"},
    {"key": "freeze_point_lab",   "label": u"Точка замерзания",             "target": "520-560", "target_max": 560,  "target_min": 520,  "decimals": 1, "target_str": "520-560"},
    {"key": "urea",               "label": u"Мочевина, мг/100 мл",         "target": "20-30",   "target_max": 30,   "target_min": 20,   "decimals": 1, "target_str": "20-30"},
    {"key": "snf_pct",            "label": u"СОМО, %",                      "target": ">= 8.2",  "target_max": None, "target_min": 8.2,  "decimals": 2, "target_str": u"≥ 8,20"},
    {"key": "density",            "label": u"Плотность, кг/м³",             "target": ">= 1027", "target_max": None, "target_min": 1027, "decimals": 0, "target_str": u"≥ 1027"},
    {"key": "ph_lab",             "label": "pH",                            "target": "6.5-7.0", "target_max": 7.0,  "target_min": 6.5,  "decimals": 2, "target_str": "6,5-7,0"},
    {"key": "temperature_lab",    "label": u"Температура, °C",              "target": "2-4",     "target_max": 4,    "target_min": 2,    "decimals": 1, "target_str": "+2 - +4"},
]

MONTHS_RU = ["", "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
             "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
QTR_LABELS = {1: "I кв.", 2: "II кв.", 3: "III кв.", 4: "IV кв."}


def is_bad(value, ind: dict) -> bool:
    if value is None:
        return False
    if ind["target_max"] is not None and value > ind["target_max"]:
        return True
    if ind["target_min"] is not None and value < ind["target_min"]:
        return True
    return False


# ── Данные ─────────────────────────────────────────────────────────────────

def get_report_data(enterprise_id: int, date_from: date, date_to: date,
                    group_by: str, db: Session) -> dict:
    def rnd(v, d):
        return round(float(v), d) if v is not None else None

    yr_col  = extract("year",    models.Delivery.delivery_date).label("yr")
    mo_col  = extract("month",   models.Delivery.delivery_date).label("mo")
    qtr_col = extract("quarter", models.Delivery.delivery_date).label("qtr")

    agg_cols = [
        func.sum(models.Delivery.weight_kg).label("weight_kg"),
        func.count(models.Delivery.id).label("cnt"),
        *[func.avg(getattr(models.QualityResult, ind["key"])).label(ind["key"])
          for ind in INDICATORS]
    ]

    base = (
        db.query(models.Delivery)
        .join(models.QualityResult, models.Delivery.id == models.QualityResult.delivery_id)
        .filter(
            models.Delivery.enterprise_id == enterprise_id,
            models.Delivery.delivery_date >= date_from,
            models.Delivery.delivery_date <= date_to,
        )
    )

    if group_by == "month":
        rows = base.with_entities(yr_col, mo_col, *agg_cols) \
            .group_by(yr_col, mo_col).order_by(yr_col, mo_col).all()
        labels = [f"{MONTHS_RU[int(r.mo)]} {int(r.yr)}" for r in rows]
    elif group_by == "quarter":
        rows = base.with_entities(yr_col, qtr_col, *agg_cols) \
            .group_by(yr_col, qtr_col).order_by(yr_col, qtr_col).all()
        labels = [f"{QTR_LABELS[int(r.qtr)]} {int(r.yr)}" for r in rows]
    else:
        rows = base.with_entities(yr_col, *agg_cols) \
            .group_by(yr_col).order_by(yr_col).all()
        labels = [str(int(r.yr)) for r in rows]

    data = {
        ind["key"]: [rnd(getattr(r, ind["key"]), ind["decimals"]) for r in rows]
        for ind in INDICATORS
    }
    return {
        "periods": labels,
        "data":    data,
        "weights": [rnd(r.weight_kg, 0) for r in rows],
        "counts":  [int(r.cnt) for r in rows],
    }


# ── PDF ────────────────────────────────────────────────────────────────────

def generate_pdf(enterprise: models.Enterprise, report: dict,
                 date_from: date, date_to: date, group_by: str) -> bytes:
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.pagesizes import landscape, A4
    from reportlab.lib import colors
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    # Регистрация шрифта с кириллицей
    FONT = "RepFont"
    FONT_B = "RepFont-Bold"
    candidates = [
        ("C:/Windows/Fonts/arial.ttf",  "C:/Windows/Fonts/arialbd.ttf"),
        ("C:/Windows/Fonts/Arial.ttf",  "C:/Windows/Fonts/Arialbd.ttf"),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ]
    for reg_p, bold_p in candidates:
        if os.path.exists(reg_p):
            try:
                if FONT not in pdfmetrics.getRegisteredFontNames():
                    pdfmetrics.registerFont(TTFont(FONT, reg_p))
                if os.path.exists(bold_p) and FONT_B not in pdfmetrics.getRegisteredFontNames():
                    pdfmetrics.registerFont(TTFont(FONT_B, bold_p))
                elif not os.path.exists(bold_p):
                    FONT_B = FONT
                break
            except Exception:
                continue
    else:
        FONT = FONT_B = "Helvetica"

    buf = io.BytesIO()
    pw, ph = landscape(A4)   # 841 x 595 pt
    c = rl_canvas.Canvas(buf, pagesize=(pw, ph))

    periods = report["periods"]
    data    = report["data"]
    n       = len(periods)

    # ── Размеры ──────────────────────────────────────────────────────────
    margin  = 20
    top     = ph - margin
    LEFT_W  = 160          # ширина колонки «Показатель»
    TARGET_W = 55          # ширина колонки «Цель»
    avail   = pw - 2*margin - LEFT_W - TARGET_W
    COL_W   = min(avail / max(n, 1), 60)
    ROW_H   = 16
    HEAD_H  = 28

    # ── Заголовок ─────────────────────────────────────────────────────────
    c.setFont(FONT_B, 11)
    ent_name = enterprise.short_name or enterprise.name
    c.drawString(margin, top - 14, f"Отчёт по качеству молока — {ent_name}")
    c.setFont(FONT, 8)
    c.setFillColor(colors.HexColor("#666666"))
    c.drawString(margin, top - 26,
        f"Период: {date_from.strftime('%d.%m.%Y')} — {date_to.strftime('%d.%m.%Y')}   "
        f"Сформирован: {datetime.now().strftime('%d.%m.%Y %H:%M')}")
    c.setFillColor(colors.black)

    y0 = top - 42   # верхняя граница таблицы

    def col_x(ci):
        return margin + LEFT_W + ci * COL_W

    target_x = col_x(n)

    # ── Шапка таблицы ────────────────────────────────────────────────────
    # Фон шапки
    c.setFillColor(colors.HexColor("#1a3a5c"))
    c.rect(margin, y0 - HEAD_H, LEFT_W + n * COL_W + TARGET_W, HEAD_H, fill=1, stroke=0)

    c.setFillColor(colors.white)
    c.setFont(FONT_B, 7.5)
    c.drawString(margin + 3, y0 - HEAD_H + 8, "Показатель")
    for ci, p in enumerate(periods):
        cx = col_x(ci)
        c.drawCentredString(cx + COL_W/2, y0 - HEAD_H + 8, p)
    c.drawCentredString(target_x + TARGET_W/2, y0 - HEAD_H + 8, "Цель")

    # ── Строки данных ─────────────────────────────────────────────────────
    STRIPE     = colors.HexColor("#f5f6fa")
    RED_BG     = colors.HexColor("#ffebee")
    GREEN_TXT  = colors.HexColor("#2e7d32")
    RED_TXT    = colors.HexColor("#c62828")
    TARGET_BG  = colors.HexColor("#e8f5e9")

    for ri, ind in enumerate(INDICATORS):
        ry = y0 - HEAD_H - (ri + 1) * ROW_H
        row_bg = colors.white if ri % 2 == 0 else STRIPE

        # Фон строки
        c.setFillColor(row_bg)
        c.rect(margin, ry, LEFT_W + n * COL_W + TARGET_W, ROW_H, fill=1, stroke=0)

        # Сетка
        c.setStrokeColor(colors.HexColor("#dddddd"))
        c.setLineWidth(0.3)
        c.rect(margin, ry, LEFT_W + n * COL_W + TARGET_W, ROW_H, fill=0, stroke=1)

        # Название показателя
        c.setFillColor(colors.black)
        c.setFont(FONT, 7)
        label = ind["label"]
        if len(label) > 30:
            label = label[:29] + "…"
        c.drawString(margin + 3, ry + 4, label)

        # Значения
        vals = data.get(ind["key"], [None] * n)
        for ci, v in enumerate(vals):
            cx = col_x(ci)
            txt = "—" if v is None else str(v)

            if v is not None and is_bad(v, ind):
                c.setFillColor(RED_BG)
                c.rect(cx, ry, COL_W, ROW_H, fill=1, stroke=0)
                c.setFillColor(RED_TXT)
                c.setFont(FONT_B, 7.5)
            else:
                c.setFillColor(GREEN_TXT if v is not None else colors.HexColor("#aaaaaa"))
                c.setFont(FONT, 7.5)

            c.drawCentredString(cx + COL_W/2, ry + 4, txt)

        # Цель
        c.setFillColor(TARGET_BG)
        c.rect(target_x, ry, TARGET_W, ROW_H, fill=1, stroke=0)
        c.setFillColor(GREEN_TXT)
        c.setFont(FONT_B, 7.5)
        c.drawCentredString(target_x + TARGET_W/2, ry + 4, ind["target_str"])

    # ── Строка объёма ─────────────────────────────────────────────────────
    total_rows = len(INDICATORS)
    for extra_i, (lbl, vals) in enumerate([
        ("Объём, кг",       report["weights"]),
        ("Кол-во партий",   report["counts"]),
    ]):
        ry = y0 - HEAD_H - (total_rows + extra_i + 1) * ROW_H
        c.setFillColor(colors.HexColor("#e3f2fd"))
        c.rect(margin, ry, LEFT_W + n * COL_W + TARGET_W, ROW_H, fill=1, stroke=0)
        c.setStrokeColor(colors.HexColor("#bbbbbb"))
        c.rect(margin, ry, LEFT_W + n * COL_W + TARGET_W, ROW_H, fill=0, stroke=1)
        c.setFillColor(colors.HexColor("#1a3a5c"))
        c.setFont(FONT_B, 7.5)
        c.drawString(margin + 3, ry + 4, lbl)
        for ci, v in enumerate(vals):
            cx = col_x(ci)
            if v is None:
                txt = "—"
            elif extra_i == 0:
                txt = f"{int(v):,}".replace(",", " ")
            else:
                txt = str(v)
            c.drawCentredString(cx + COL_W/2, ry + 4, txt)
        c.setFillColor(TARGET_BG)
        c.rect(target_x, ry, TARGET_W, ROW_H, fill=1, stroke=0)

    # ── Легенда ───────────────────────────────────────────────────────────
    legend_y = y0 - HEAD_H - (total_rows + 3) * ROW_H - 10
    c.setFont(FONT, 7)
    c.setFillColor(RED_TXT)
    c.drawString(margin, legend_y, "■")
    c.setFillColor(colors.HexColor("#555555"))
    c.drawString(margin + 10, legend_y, "Красный — нарушение норматива   ")
    c.setFillColor(GREEN_TXT)
    c.drawString(margin + 160, legend_y, "■")
    c.setFillColor(colors.HexColor("#555555"))
    c.drawString(margin + 170, legend_y, "Зелёный — значение в норме")

    c.save()
    return buf.getvalue()


# ── Эндпоинт ──────────────────────────────────────────────────────────────

@router.get("/enterprise/{enterprise_id}/pdf")
def download_report_pdf(
    enterprise_id: int,
    date_from: date = Query(...),
    date_to:   date = Query(...),
    group_by:  str  = Query("month"),
    db: Session = Depends(get_db),
):
    enterprise = db.query(models.Enterprise).filter(
        models.Enterprise.id == enterprise_id
    ).first()
    if not enterprise:
        raise HTTPException(status_code=404, detail="Предприятие не найдено")

    report = get_report_data(enterprise_id, date_from, date_to, group_by, db)

    if not report["periods"]:
        raise HTTPException(status_code=404, detail="Нет данных за выбранный период")

    pdf_bytes = generate_pdf(enterprise, report, date_from, date_to, group_by)

    filename = f"Report_{enterprise_id}_{date_from}_{date_to}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
