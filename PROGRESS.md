# PureMilk — Quality Monitor: Прогресс по задаче

## Что сделано

### Приложение
Создано веб-приложение **PureMilk Quality Monitor** — мониторинг качества молока от предприятий-поставщиков. Аналог KSITEST, но для данных о качестве молока.

**Стек:**
- Backend: Python 3.14 + FastAPI + SQLAlchemy + PostgreSQL 14
- Frontend: React 18 + Vite + Recharts + React Query
- БД: PostgreSQL в Docker-контейнере `qm_postgres` (порт 5433)
- Git: https://github.com/grishnait-code/puremilk

---

### База данных
Таблицы: `enterprises`, `farms`, `contracts`, `audits`, `deliveries`, `quality_results`, `grade_standards`, `targets`, `files`

**Данные импортированы:**
- АО «Гатчинское» (id=1) — 1289 партий (2009–2025)
- Новоладожское (id=2) — 1642 партии (2009–2025)

Источник данных: Excel-файлы `Gatchinskoye 2. Quality Monitor.xlsx` и `Novoladozhskiy 2. Quality Monitor.xlsx`, лист `Quality`, строки с 35-й — каждая строка = одна партия.

**Маппинг колонок листа Quality:**
| col | Поле |
|-----|------|
| 0 | Дата партии |
| 1 | Вес, кг |
| 2 | Пересчитанный вес |
| 3 | Сорт Е, кг |
| 4 | Сорт I, кг |
| 5 | Сорт II, кг |
| 6 | Вне специфики, кг |
| 7 | Ошибка определения, кг |
| 8 | Сорт Е финальный, кг |
| 9 | Антибиотики (0/1) |
| 10 | Температура ПО |
| 11 | Температура Т001-2 |
| 12 | Органолептика ПО |
| 13 | Органолептика Т001-2 |
| 14 | SCC (соматика) |
| 15 | КМАФАнМ ПО |
| 16 | КМАФАнМ Т001-2 |
| 17 | Точка замерзания ПО |
| 18 | Точка замерзания Т001-2 |
| 19 | Жир % |
| 20 | Белок % |
| 21 | Лактоза % |
| 22 | СОМО % |
| 23 | Плотность |
| 24 | Алкогольная проба % |
| 25 | Кислотность °T |
| 26 | pH ПО |
| 27 | pH Т001-2 |
| 28 | БГКП |
| 29 | СЖК |
| 30 | Мочевина |
| 31 | Споры клостридий |

---

### API эндпоинты
| Метод | URL | Описание |
|-------|-----|----------|
| GET | /api/enterprises | Список предприятий |
| GET | /api/enterprises/{id} | Карточка предприятия |
| GET | /api/enterprises/{id}/farms | Фермы |
| GET | /api/enterprises/{id}/audits | Аудиты |
| GET | /api/deliveries | Поставки (все фильтры) |
| GET | /api/deliveries/{id} | Одна поставка |
| GET | /api/audits | Аудиты с просрочкой |
| GET | /api/analytics/enterprise/{id}/yearly | Статистика по годам |
| GET | /api/analytics/summary | Сводная |
| GET | /api/analytics/indicators/targets | Целевые значения |

Документация API: http://localhost:8000/api/docs

---

### Страницы приложения
| Страница | URL | Описание |
|----------|-----|----------|
| Поставки | /deliveries | Таблица всех партий, фильтры по всем показателям, выбор столбцов |
| Предприятия | /enterprises | Список предприятий с поиском |
| Карточка | /enterprise/{id} | Реквизиты + графики динамики + фермы + аудиты |
| Аудиты | /audits | Список с индикацией просрочек |
| Аналитика | /analytics | Сводные диаграммы по всем предприятиям |

---

### Страница Поставки — детали
- **Таблица**: все 29 колонок из `deliveries` + `quality_results`, двухуровневые заголовки по группам, цветовая индикация по нормативам (зелёный/жёлтый/красный), горизонтальный скролл
- **Кнопка Фильтры**: раскрывается на всю ширину, сдвигает таблицу вниз, 18 групп фильтров (дата, вес, сортность, антибиотики, SCC, бактерии, температура, жир, белок, лактоза, СОМО, плотность, кислотность, pH, БГКП, СЖК, мочевина, клостридии)
- **Кнопка Столбцы**: выбор видимых колонок по группам, чекбоксы

---

### Нормативы (цветовая индикация)
| Показатель | Норма | Предупреждение |
|------------|-------|----------------|
| SCC | ≤ 200 тыс/мл | ≤ 150 |
| КМАФАнМ | ≤ 50 тыс. КОЕ/мл | ≤ 30 |
| БГКП | ≤ 100 КОЕ/мл | ≤ 50 |
| Клостридии | ≤ 1000 НВЧ/л | ≤ 700 |
| СЖК | ≤ 0.80 | — |
| Жир | ≥ 3.6% | — |
| Белок | ≥ 3.2% | — |
| СОМО | ≥ 8.2% | — |
| Плотность | ≥ 1027 кг/м³ | — |

---

## Как запустить

### Одной командой (двойной клик)
```
quality-monitor/start.bat
```
Запускает PostgreSQL, backend и frontend, открывает браузер.

### Вручную
```powershell
# 1. PostgreSQL
docker start qm_postgres

# 2. Backend (отдельный терминал)
cd backend
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5433/quality_monitor"
python -m uvicorn app.main:app --reload --port 8000

# 3. Frontend (отдельный терминал)
cd frontend
npm run dev
```

**Приложение:** http://localhost:3000  
**API docs:** http://localhost:8000/api/docs

---

## Импорт новых данных

```powershell
cd "C:\Users\ggyur\OneDrive\Desktop\Claude\PureMilk\PureMilk\quality-monitor"

# Новый файл (добавить к существующим)
python scripts/import_xlsx.py \
  --file "путь/к/файлу.xlsx" \
  --enterprise "Название предприятия" \
  --short "Краткое"

# Переимпорт (удалить старые и загрузить заново)
python scripts/import_xlsx.py --clear \
  --file "путь/к/файлу.xlsx" \
  --enterprise "Название"
```

---

## Сохранение изменений в git

```powershell
cd "C:\Users\ggyur\OneDrive\Desktop\Claude\PureMilk\PureMilk\quality-monitor"
git add .
git commit -m "описание изменений"
git push
```

---

## Структура файлов

```
quality-monitor/
├── backend/
│   └── app/
│       ├── main.py          # FastAPI app, CORS
│       ├── models.py        # SQLAlchemy модели
│       ├── schemas.py       # Pydantic схемы (все поля quality_results)
│       ├── database.py      # psycopg3 подключение
│       ├── config.py        # DATABASE_URL из env
│       └── routers/
│           ├── enterprises.py
│           ├── deliveries.py  # 30+ параметров фильтрации
│           ├── audits.py
│           └── analytics.py
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── api/client.js
│       ├── components/
│       │   ├── Navbar.jsx      # Логотип PureMilk + навигация
│       │   └── QualityBadge.jsx
│       └── pages/
│           ├── Deliveries.jsx  # Главная: таблица + фильтры + столбцы
│           ├── Enterprises.jsx
│           ├── Enterprise.jsx  # Карточка с графиками
│           ├── Audits.jsx
│           └── Analytics.jsx
├── scripts/
│   ├── import_xlsx.py   # Импорт партий из Excel (строка = партия)
│   └── init.sql         # Начальные нормативы
├── start.bat            # Запуск одним кликом
├── docker-compose.yml
└── README.md
```

---

## Известные особенности / TODO

- [ ] Добавить фильтр по предприятию на странице Поставок (сейчас только через enterprise_id)
- [ ] Карточка предприятия показывает графики только при наличии данных в `yearly` (нужны поставки с quality_results)
- [ ] Страница Аналитика пока показывает только сводку по последнему году — можно расширить
- [ ] Docker Compose настроен но не тестировался в production-режиме (сейчас запуск через start.bat)
- [ ] Логотип: `frontend/public/logo.png` — белый всплеск молока на прозрачном фоне

---

*Обновлено: 26 апреля 2026*
