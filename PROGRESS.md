# PureMilk — Quality Monitor: Прогресс по задаче

*Обновлено: 27 апреля 2026*

---

## Что сделано

### Приложение
Веб-приложение **PureMilk Quality Monitor** — мониторинг качества молока от предприятий-поставщиков.

**Стек:**
- Backend: Python 3.14 + FastAPI + SQLAlchemy + psycopg3 + PostgreSQL 14
- Frontend: React 18 + Vite + Recharts + React Query
- БД: PostgreSQL в Docker-контейнере `qm_postgres` (порт 5433)
- Git: https://github.com/grishnait-code/puremilk

---

## База данных

### Таблицы

| Таблица | Описание |
|---|---|
| `enterprises` | Предприятия-поставщики молока |
| `farms` | Фермы/места отгрузки |
| `contracts` | Договоры на поставку |
| `audits` | Аудиты хозяйств |
| `deliveries` | Поставки молока (1 строка = 1 партия) |
| `quality_results` | Показатели качества поставки (1:1 с deliveries) |
| `grade_standards` | Нормативы сортности (граничные значения по показателям) |
| `grades` | Сорта молока (настраиваемые названия и порядок) |
| `targets` | Целевые значения KPI |
| `files` | Полиморфное хранилище файлов |

### Таблица grades (новая)
| Поле | Тип | Описание |
|---|---|---|
| id | INT PK | Идентификатор |
| code | VARCHAR(20) UNIQUE | Внутренний код: E, I, II, G1... |
| display_name | VARCHAR(100) | Отображаемое название (редактируется пользователем) |
| sort_order | INT | Приоритет (1 = наивысший) |
| color | VARCHAR(20) | HEX-цвет для UI |
| is_active | BOOLEAN | Включён в расчёт |

Текущие значения: Экстра (E), Спец. I (I), Спец. II (II)

### Изменения в grade_standards
Добавлено поле `name VARCHAR(100)` — название набора нормативов (напр. «ГОСТ 31449-2013»).

### SQL-функции и VIEW

| Объект | Описание |
|---|---|
| `calculate_grade(delivery_id)` | Рассчитывает сорт партии динамически из `grades` + `grade_standards`. Возвращает code сорта или 'out' |
| `grade_violations(delivery_id)` | Возвращает таблицу нарушенных нормативов для партии |
| `create_grade_with_standards(code, name, order, color)` | Создаёт новый сорт и копирует структуру нормативов |
| `VIEW: deliveries_graded` | `SELECT d.*, calculate_grade(d.id) AS calculated_grade FROM deliveries d` |

### Нормативы по сортам (ГОСТ 31449-2013)

| Показатель | Экстра | Спец. I | Спец. II |
|---|---|---|---|
| Соматика, тыс/мл | ≤ 200 | ≤ 400 | ≤ 500 |
| КМАФАнМ, тыс. КОЕ/мл | ≤ 50 | ≤ 100 | ≤ 300 |
| Жир, % | ≥ 3.60 | ≥ 3.40 | ≥ 2.80 |
| Белок, % | ≥ 3.20 | ≥ 3.00 | ≥ 2.80 |
| СОМО, % | ≥ 8.20 | ≥ 8.20 | — |
| Плотность, кг/м³ | ≥ 1027 | ≥ 1027 | — |
| БГКП, КОЕ/мл | ≤ 100 | ≤ 200 | ≤ 300 |
| СЖК | ≤ 0.80 | — | — |
| Клостридии, НВЧ/л | ≤ 1000 | ≤ 3500 | ≤ 5000 |
| Т замерзания ПО | 520–560 | 512–560 | 506–560 |
| Температура ПО, °C | +2…+4 | +2…+6 | +2…+10 |
| Органолептика ПО | ≥ 5 | ≥ 4 | ≥ 3 |
| Кислотность, °T | 16–18 | 16–18 | 16–21 |

---

## Данные

- **АО «Гатчинское»** (id=1) — 1289 партий (2009–2025)
- **Новоладожское** (id=2) — 1642 партии (2009–2025)

Источник: листы `Quality` файлов `Gatchinskoye 2.xlsx` и `Novoladozhskiy 2.xlsx`, строки с 35-й (каждая = одна партия).

---

## API эндпоинты

| URL | Описание |
|---|---|
| GET /api/enterprises | Список предприятий |
| GET /api/enterprises/{id} | Карточка предприятия |
| GET /api/enterprises/{id}/farms | Фермы |
| GET /api/enterprises/{id}/audits | Аудиты |
| GET /api/deliveries | Поставки (30+ фильтров, calculated_grade) |
| GET /api/deliveries/{id} | Одна поставка |
| GET /api/audits | Аудиты с просрочкой |
| GET /api/analytics/enterprise/{id}/yearly | Статистика по годам |
| GET /api/analytics/summary | Сводная по всем предприятиям |
| GET /api/grades | Список сортов |
| POST /api/grades | Создать сорт |
| PUT /api/grades/{id} | Обновить сорт (название, цвет, порядок) |
| DELETE /api/grades/{id} | Удалить сорт |
| POST /api/grades/reorder | Изменить порядок сортов |
| GET /api/grade-standards/grouped | Нормативы сгруппированные по показателям |
| PUT /api/grade-standards/{id} | Изменить граничное значение |
| POST /api/grade-standards/reset | Сброс к ГОСТ 31449-2013 |

Документация: http://localhost:8000/api/docs

---

## Страницы приложения

| Страница | URL | Описание |
|---|---|---|
| Поставки | /deliveries | Таблица всех партий, 29 колонок, фильтры по всем показателям, рассчитанный сорт |
| Предприятия | /enterprises | Список с поиском |
| Карточка | /enterprise/{id} | Реквизиты + графики динамики + фермы + аудиты |
| Аудиты | /audits | Список с индикацией просрочек |
| Аналитика | /analytics | Сводные диаграммы |
| Нормативы | /grade-standards | Управление сортами и граничными значениями |

### Страница Нормативы
- **Блок «Сорта молока»**: переименование, изменение цвета, включение/выключение, удаление, добавление нового сорта
- **Таблица нормативов**: все показатели × все активные сорта, редактирование в ячейках, сохранение по Enter/✓
- **Сброс к ГОСТ**: кнопка восстановления значений

---

## Как запустить

### Одной командой
```
quality-monitor/start.bat
```

### Вручную
```powershell
docker start qm_postgres

# Backend (отдельный терминал)
cd backend
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5433/quality_monitor"
python -m uvicorn app.main:app --reload --port 8000

# Frontend (отдельный терминал)
cd frontend
npm run dev
```

**Приложение:** http://localhost:3000
**API docs:** http://localhost:8000/api/docs

---

## Импорт новых данных

```powershell
cd "C:\Users\ggyur\OneDrive\Desktop\Claude\PureMilk\PureMilk\quality-monitor"

python scripts/import_xlsx.py --file "путь/к/файлу.xlsx" --enterprise "Название" --short "Краткое"

# Переимпорт с очисткой старых данных:
python scripts/import_xlsx.py --clear --file "путь/к/файлу.xlsx" --enterprise "Название"
```

---

## Применённые миграции БД

| Файл | Что делает |
|---|---|
| `scripts/init.sql` | Начальные целевые значения |
| `scripts/migrate_grade_calculation.sql` | Первая версия calculate_grade (хардкод) |
| `scripts/migrate_grade_standards.sql` | Заполнение grade_standards нормативами ГОСТ |
| `scripts/fix_calculate_grade.sql` | Исправление calculate_grade (row_to_json) |
| `scripts/migrate_grades_table.sql` | Таблица grades + динамическая calculate_grade |

**Разовые команды после установки:**
```powershell
# Применить все миграции (при первом развёртывании)
cmd /c "docker exec -i qm_postgres psql -U postgres -d quality_monitor < scripts\migrate_grade_standards.sql"
cmd /c "docker exec -i qm_postgres psql -U postgres -d quality_monitor < scripts\migrate_grades_table.sql"
cmd /c "docker exec -i qm_postgres psql -U postgres -d quality_monitor < scripts\fix_calculate_grade.sql"

# Активировать сорта (если is_active = NULL)
docker exec qm_postgres psql -U postgres -d quality_monitor -c "UPDATE grades SET is_active = TRUE WHERE is_active IS NULL;"
```

---

## Сохранение изменений

```powershell
cd "C:\Users\ggyur\OneDrive\Desktop\Claude\PureMilk\PureMilk\quality-monitor"
git add .
git commit -m "описание"
git push
```

---

## Структура файлов

```
quality-monitor/
├── backend/app/
│   ├── main.py
│   ├── models.py          # Grade, GradeStandard, Delivery, QualityResult...
│   ├── schemas.py         # calculated_grade в DeliveryOut
│   └── routers/
│       ├── deliveries.py  # calculate_grade через SQLAlchemy func
│       ├── grades.py      # CRUD сортов
│       ├── grade_standards.py  # CRUD нормативов
│       ├── enterprises.py
│       ├── audits.py
│       └── analytics.py
├── frontend/src/
│   ├── api/client.js      # все API-вызовы
│   ├── components/Navbar.jsx
│   └── pages/
│       ├── Deliveries.jsx      # фильтры + 29 колонок + сорт
│       ├── GradeStandards.jsx  # управление сортами и нормативами
│       ├── Enterprises.jsx
│       ├── Enterprise.jsx
│       ├── Audits.jsx
│       └── Analytics.jsx
├── scripts/
│   ├── import_xlsx.py
│   ├── migrate_grade_standards.sql
│   ├── migrate_grades_table.sql
│   └── fix_calculate_grade.sql
├── start.bat
└── PROGRESS.md
```

---

## TODO

- [ ] Фильтр по предприятию на странице Поставок (выпадающий список с названиями)
- [ ] Страница Аналитика — графики по месяцам, сравнение предприятий
- [ ] Карточка предприятия — графики работают только при наличии quality_results
- [ ] Добавить скрипт применения всех миграций одной командой (`migrate_all.sql`)
- [ ] Docker Compose — проверить в production-режиме
