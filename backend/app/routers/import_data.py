"""
Импорт данных из файлов отчётов VALIO (XLS/XLSX формат еженедельного отчёта).

Структура файла:
  Row 2:  Хозяйство → название предприятия
  Row 4:  Неделя N, диапазон дат
  Row 10-13: Заголовки и нормативы (пропускаем)
  Row 14+: Партии молока (до пустой строки / строки без даты)

Маппинг колонок (0-indexed):
  1: Дата (DD.MM.YYYY или Excel serial)
  2: Поставка молока, кг (weight_kg)
  4: AB (0=нет, 1=есть)
  5: T°C ПО (temperature_lab)
  6: T°C ТК (temperature_std)
  7: Органолептика ПО (organoleptic_lab)
  8: Органолептика ТК (organoleptic_std)
  9: Соматика, тыс/мл (scc)
  10: КМАФАнМ ПО (bact_count_lab)
  11: КМАФАнМ ТК (bact_count_std)
  12: Т замерзания ПО (×-1000 → freeze_point_lab)
  13: Т замерзания ТК (×-1000 → freeze_point_std)
  14: Жир ПО, % (fat_pct)
  15: Белок ПО, % (protein_pct)
  16: Лактоза, % (lactose_pct)
  17: СОМО, % (snf_pct)
  18: Плотность ПО, кг/м³ (density)
  19: Алк. % (alcohol_pct)
  20: Кислотность °T (acidity)
  21: pH ПО (ph_lab)
  22: pH ТК (ph_std)
  23: БГКП, КОЕ/мл (coliforms)
  24: СЖК (fatty_acids)
  25: Мочевина, мг/100мл (urea)
  26: Споры клостридий, НВЧ/л (clostridium_spores)
"""

import io
import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app import models

router = APIRouter(prefix="/import", tags=["import"])


# ── Утилиты ───────────────────────────────────────────────────────────────

def _num(v) -> Optional[float]:
    """Преобразует значение ячейки в float или None."""
    if v is None or v == "" or v == "пустая ячейка":
        return None
    try:
        f = float(str(v).replace(",", ".").strip())
        return f if f != 0.0 or str(v).strip() == "0" else f
    except (ValueError, TypeError):
        return None


def _parse_date_valio(v, datemode=0) -> Optional[datetime.date]:
    """Парсит дату из ячейки VALIO-отчёта (строка DD.MM.YYYY или Excel serial)."""
    if v is None or v == "":
        return None
    if isinstance(v, datetime.datetime):
        return v.date()
    if isinstance(v, datetime.date):
        return v
    # Попробуем как строку DD.MM.YYYY
    s = str(v).strip()
    for fmt in ("%d.%m.%Y", "%d.%m.%y", "%Y-%m-%d"):
        try:
            return datetime.datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    # Попробуем как Excel-дату (float)
    try:
        import xlrd
        f = float(v)
        if 30000 < f < 60000:  # разумный диапазон Excel-дат
            return xlrd.xldate_as_datetime(f, datemode).date()
    except Exception:
        pass
    return None


def _freeze_convert(v) -> Optional[float]:
    """Конвертация точки замерзания: -0.525 → 525 (×10⁻³ °C)."""
    n = _num(v)
    if n is None:
        return None
    # Если значение отрицательное (формат VALIO) — умножаем на -1000
    if n < 0:
        return round(-n * 1000, 1)
    # Если уже в нужном формате (520-560)
    return n


def _parse_valio_xls(content: bytes, filename: str) -> dict:
    """
    Парсит XLS/XLSX файл отчёта VALIO.
    Возвращает: { enterprise_name, week, deliveries: [...] }
    """
    import xlrd
    import openpyxl

    is_xlsx = filename.lower().endswith('.xlsx') or content.startswith(b'PK\x03\x04')

    if is_xlsx:
        try:
            wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
            ws_sheet = wb.worksheets[0]
            # Превращаем в 2D-массив (0-based)
            rows = []
            for row in ws_sheet.iter_rows(values_only=True):
                rows.append(list(row))
            
            class SheetWrapper:
                def __init__(self, rows_list):
                    self.rows = rows_list
                    self.nrows = len(rows_list)
                    self.ncols = max(len(r) for r in rows_list) if rows_list else 0

                def cell_value(self, r, c):
                    if r < len(self.rows) and c < len(self.rows[r]):
                        return self.rows[r][c]
                    return ""

            ws = SheetWrapper(rows)
            datemode = 0
        except Exception as e:
            raise ValueError(f"Не удалось открыть XLSX-файл: {e}")
    else:
        try:
            wb = xlrd.open_workbook(file_contents=content)
            ws = wb.sheet_by_index(0)
            datemode = wb.datemode
        except Exception as e:
            raise ValueError(f"Не удалось открыть XLS-файл: {e}")

    # Название хозяйства (row 2, col 3)
    enterprise_name = ""
    for col in range(ws.ncols):
        val = ws.cell_value(1, col)
        if val is not None:
            v = str(val).strip()
            if v and v not in ("", "Хозяйство", "None"):
                enterprise_name = v
                break

    # Номер недели (row 4, col 2)
    week = None
    try:
        week = int(ws.cell_value(3, 2))
    except Exception:
        pass

    # Ищем строку начала данных (первая строка с датой после строки 12)
    data_start = None
    for i in range(12, ws.nrows):
        v = ws.cell_value(i, 1)
        d = _parse_date_valio(v, datemode)
        if d is not None:
            data_start = i
            break

    if data_start is None:
        raise ValueError("Строки с партиями не найдены (ожидается дата в столбце B начиная с 14-й строки)")

    # Парсим партии
    deliveries = []
    for i in range(data_start, ws.nrows):
        row = [ws.cell_value(i, j) if j < ws.ncols else "" for j in range(27)]
        date = _parse_date_valio(row[1], datemode)
        if date is None:
            break  # конец данных

        weight = _num(row[2])
        if weight is None or weight == 0:
            continue

        ab_val = _num(row[4])
        has_ab = (ab_val == 1.0) if ab_val is not None else False

        deliveries.append({
            "date": date,
            "weight_kg": weight,
            "has_antibiotics": has_ab,
            "quality": {
                "temperature_lab":    _num(row[5]),
                "temperature_std":    _num(row[6]),
                "organoleptic_lab":   _num(row[7]),
                "organoleptic_std":   _num(row[8]),
                "scc":                _num(row[9]),
                "bact_count_lab":     _num(row[10]),
                "bact_count_std":     _num(row[11]),
                "freeze_point_lab":   _freeze_convert(row[12]),
                "freeze_point_std":   _freeze_convert(row[13]),
                "fat_pct":            _num(row[14]),
                "protein_pct":        _num(row[15]),
                "lactose_pct":        _num(row[16]),
                "snf_pct":            _num(row[17]),
                "density":            _num(row[18]),
                "alcohol_pct":        _num(row[19]),
                "acidity":            _num(row[20]),
                "ph_lab":             _num(row[21]),
                "ph_std":             _num(row[22]),
                "coliforms":          _num(row[23]),
                "fatty_acids":        _num(row[24]),
                "urea":               _num(row[25]),
                "clostridium_spores": _num(row[26]),
            }
        })

    return {
        "enterprise_name": enterprise_name,
        "week": week,
        "deliveries": deliveries,
    }


# ── Эндпоинт ──────────────────────────────────────────────────────────────

@router.post("/valio-xls")
async def import_valio_xls(
    file: UploadFile = File(...),
    enterprise_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Принимает XLS-файл еженедельного отчёта VALIO и добавляет партии в БД.
    enterprise_id — если указан, привязывает к этому предприятию;
                    иначе ищет по названию из файла.
    """
    content = await file.read()

    # Парсим файл
    try:
        parsed = _parse_valio_xls(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Определяем предприятие
    enterprise = None
    if enterprise_id:
        enterprise = db.query(models.Enterprise).filter(
            models.Enterprise.id == enterprise_id
        ).first()
        if not enterprise:
            raise HTTPException(status_code=404, detail="Предприятие не найдено")
    else:
        name = parsed["enterprise_name"]
        enterprise = db.query(models.Enterprise).filter(
            models.Enterprise.name.ilike(f"%{name}%") |
            models.Enterprise.short_name.ilike(f"%{name}%")
        ).first()
        if not enterprise:
            raise HTTPException(
                status_code=404,
                detail=f"Предприятие «{name}» не найдено в базе. Укажите enterprise_id вручную."
            )

    imported = 0
    skipped = 0
    errors = []

    for d in parsed["deliveries"]:
        try:
            # Проверяем дубликат
            existing = db.query(models.Delivery).filter(
                models.Delivery.enterprise_id == enterprise.id,
                models.Delivery.delivery_date == d["date"],
            ).first()

            if existing:
                skipped += 1
                continue

            delivery = models.Delivery(
                enterprise_id=enterprise.id,
                delivery_date=d["date"],
                weight_kg=d["weight_kg"],
                has_antibiotics=d["has_antibiotics"],
            )
            db.add(delivery)
            db.flush()

            qr = models.QualityResult(
                delivery_id=delivery.id,
                **{k: v for k, v in d["quality"].items() if v is not None}
            )
            db.add(qr)
            imported += 1

        except Exception as e:
            errors.append(f"{d['date']}: {str(e)}")
            db.rollback()

    db.commit()

    return {
        "status": "ok",
        "enterprise": enterprise.name,
        "week": parsed["week"],
        "imported": imported,
        "skipped": skipped,
        "total_in_file": len(parsed["deliveries"]),
        "errors": errors,
    }


@router.post("/preview-valio-xls")
async def preview_valio_xls(file: UploadFile = File(...)):
    """Предпросмотр файла без записи в БД."""
    content = await file.read()
    try:
        parsed = _parse_valio_xls(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {
        "enterprise_name": parsed["enterprise_name"],
        "week": parsed["week"],
        "delivery_count": len(parsed["deliveries"]),
        "dates": [str(d["date"]) for d in parsed["deliveries"]],
    }
