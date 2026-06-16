"""
Исправление кодировки текстовых полей в базе данных.

Проблема: при импорте через PowerShell на Windows данные были дважды
перекодированы (UTF-8 → CP866 → UTF-8), что привело к кракозябрам.
Решение: обратная конвертация name.encode('cp866').decode('utf-8')

Использование:
    python scripts/fix_encoding.py

    # Для production (через Docker):
    docker exec qm_backend_prod python -c "
    import subprocess; subprocess.run(['python', '/app/scripts/fix_encoding.py'])
    "

    # Или вручную скопировать содержимое скрипта в docker exec python -c "..."
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5433/quality_monitor",
)


def fix(s):
    """Исправить строку: encode CP866 → decode UTF-8."""
    if s is None:
        return None
    try:
        return s.encode("cp866").decode("utf-8")
    except Exception:
        return s  # оставить как есть если не получилось


def fix_table(cur, table, text_cols, id_col="id"):
    cols = ", ".join(text_cols)
    cur.execute(f"SELECT {id_col}, {cols} FROM {table}")
    rows = cur.fetchall()
    updated = 0
    for row in rows:
        row_id = row[0]
        values = list(row[1:])
        fixed = [fix(v) for v in values]
        if fixed != values:
            set_clause = ", ".join(f"{c}=%s" for c in text_cols)
            cur.execute(
                f"UPDATE {table} SET {set_clause} WHERE {id_col}=%s",
                fixed + [row_id],
            )
            updated += 1
    print(f"  {table}: обновлено {updated} из {len(rows)} строк")


def main():
    try:
        import psycopg2
    except ImportError:
        import psycopg as psycopg2  # psycopg3

    db_url = DATABASE_URL
    # psycopg2 не поддерживает postgresql+psycopg:// prefix
    db_url = db_url.replace("postgresql+psycopg://", "postgresql://")
    db_url = db_url.replace("postgresql+psycopg2://", "postgresql://")

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    print("Исправление кодировки текстовых полей...")

    fix_table(cur, "enterprises", ["name", "short_name", "region", "org_form",
                                    "legal_address", "actual_address",
                                    "director_name", "notes"])

    fix_table(cur, "farms", ["name", "address", "region",
                              "housing_type", "milking_system",
                              "floor_type", "cooling_system", "notes"])

    fix_table(cur, "contracts", ["contract_number", "notes"])

    fix_table(cur, "audits", ["result", "notes"])

    fix_table(cur, "processors", ["name", "short_name", "legal_address",
                                   "actual_address", "director_name", "notes"])

    fix_table(cur, "grades", ["display_name"])

    fix_table(cur, "grade_standards", ["indicator", "unit", "source"])

    fix_table(cur, "targets", ["indicator", "notes"])

    fix_table(cur, "users", ["full_name"])

    conn.commit()
    conn.close()
    print("Готово.")


if __name__ == "__main__":
    main()
