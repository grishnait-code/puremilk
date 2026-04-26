"""
Импорт данных из файлов Quality Monitor (*.xlsx) в PostgreSQL.

Использование:
    python scripts/import_xlsx.py \
        --file "Gatchinskoye 2. Quality Monitor.xlsx" \
        --enterprise "АО «Гатчинское»" \
        --short "Гатчинское"

Колонки листа Quality (агрегированные по годам):
    col 0:  year
    col 2:  total_weight_kg
    col 3:  grade_E_kg
    col 4:  grade_I_kg
    col 5:  grade_II_kg
    col 6:  grade_out_kg
    col 7:  grade_error_kg
    col 8:  grade_E_final_kg
    col 10: fat_pct (annual avg)
    col 11: protein_pct (annual avg)
    col 14: scc
    col 15: bact_count_lab
    col 17: freeze_point_lab
    col 19: fat_pct
    col 20: protein_pct
    col 21: lactose_pct
    col 22: snf_pct
    col 23: density
    col 24: alcohol_pct
    col 25: acidity  (or ph?)
    col 26: ph_lab
    col 28: coliforms
    col 29: fatty_acids
    col 30: urea
    col 31: clostridium_spores
"""

import argparse
import os
import sys
from datetime import date

import openpyxl
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Добавляем backend в путь
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from app.models import Enterprise, Farm, Delivery, QualityResult, Base  # noqa

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5433/quality_monitor",
)


def parse_num(v):
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def import_file(xlsx_path: str, enterprise_name: str, short_name: str, db):
    # Находим или создаём предприятие
    enterprise = db.query(Enterprise).filter(Enterprise.name == enterprise_name).first()
    if not enterprise:
        enterprise = Enterprise(name=enterprise_name, short_name=short_name)
        db.add(enterprise)
        db.flush()
        print(f"Создано предприятие: {enterprise_name} (id={enterprise.id})")
    else:
        print(f"Предприятие найдено: {enterprise_name} (id={enterprise.id})")

    wb = openpyxl.load_workbook(xlsx_path, data_only=True)

    if "Quality" not in wb.sheetnames:
        print("Лист 'Quality' не найден!")
        return

    ws = wb["Quality"]
    imported = 0

    for row in ws.iter_rows(min_row=3, values_only=True):
        year = row[0]
        if not isinstance(year, (int, float)):
            continue
        year = int(year)
        if year < 2000 or year > 2100:
            continue

        total_weight = parse_num(row[2])
        grade_e = parse_num(row[3])
        grade_i = parse_num(row[4])
        grade_ii = parse_num(row[5])
        grade_out = parse_num(row[6])
        grade_error = parse_num(row[7])
        grade_e_final = parse_num(row[8])

        # Показатели качества
        scc = parse_num(row[14]) if len(row) > 14 else None
        bact = parse_num(row[15]) if len(row) > 15 else None
        freeze = parse_num(row[17]) if len(row) > 17 else None
        fat = parse_num(row[19]) if len(row) > 19 else None
        protein = parse_num(row[20]) if len(row) > 20 else None
        lactose = parse_num(row[21]) if len(row) > 21 else None
        snf = parse_num(row[22]) if len(row) > 22 else None
        density = parse_num(row[23]) if len(row) > 23 else None
        ph = parse_num(row[26]) if len(row) > 26 else None
        coliforms = parse_num(row[28]) if len(row) > 28 else None
        fatty_acids = parse_num(row[29]) if len(row) > 29 else None
        urea = parse_num(row[30]) if len(row) > 30 else None
        clostridium = parse_num(row[31]) if len(row) > 31 else None

        # Создаём поставку (1 запись = 1 год, дата = 31 декабря)
        delivery_date = date(year, 12, 31)

        # Проверяем, нет ли уже такой записи
        existing = db.query(Delivery).filter(
            Delivery.enterprise_id == enterprise.id,
            Delivery.delivery_date == delivery_date,
        ).first()

        if existing:
            delivery = existing
        else:
            delivery = Delivery(
                enterprise_id=enterprise.id,
                delivery_date=delivery_date,
                weight_kg=total_weight,
                grade_E_kg=grade_e,
                grade_I_kg=grade_i,
                grade_II_kg=grade_ii,
                grade_out_kg=grade_out,
                grade_error_kg=grade_error,
                grade_E_final_kg=grade_e_final,
                has_antibiotics=False,
            )
            db.add(delivery)
            db.flush()

        # Показатели качества
        existing_q = db.query(QualityResult).filter(
            QualityResult.delivery_id == delivery.id
        ).first()

        if not existing_q:
            qr = QualityResult(
                delivery_id=delivery.id,
                scc=scc,
                bact_count_lab=bact,
                freeze_point_lab=freeze,
                fat_pct=fat,
                protein_pct=protein,
                lactose_pct=lactose,
                snf_pct=snf,
                density=density,
                ph_lab=ph,
                coliforms=coliforms,
                fatty_acids=fatty_acids,
                urea=urea,
                clostridium_spores=clostridium,
            )
            db.add(qr)
            imported += 1

    db.commit()
    print(f"Импортировано {imported} записей из {xlsx_path}")


def main():
    parser = argparse.ArgumentParser(description="Импорт данных Quality Monitor из xlsx")
    parser.add_argument("--file", required=True, help="Путь к xlsx-файлу")
    parser.add_argument("--enterprise", required=True, help="Полное название предприятия")
    parser.add_argument("--short", default=None, help="Краткое название предприятия")
    args = parser.parse_args()

    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        import_file(args.file, args.enterprise, args.short or args.enterprise, db)
    except Exception as e:
        db.rollback()
        print(f"Ошибка: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
