# Quality Monitor

Веб-приложение для мониторинга качества молока от предприятий-поставщиков.

## Технологии

- **Backend:** Python 3.11 + FastAPI + SQLAlchemy + PostgreSQL
- **Frontend:** React 18 + Vite + Recharts + React Query
- **Деплой:** Docker Compose

## Быстрый старт

### 1. Запустить всё через Docker Compose

```bash
cd quality-monitor
docker-compose up --build
```

Приложение будет доступно на `http://localhost:3000`  
API документация: `http://localhost:8000/api/docs`

### 2. Импортировать данные из Excel

```bash
# Установить зависимости
pip install -r backend/requirements.txt

# Импорт данных по Гатчинскому хозяйству
python scripts/import_xlsx.py \
  --file "../Gatchinskoye 2. Quality Monitor.xlsx" \
  --enterprise 'АО "Гатчинское"' \
  --short "Гатчинское"

# Импорт данных по Новоладожскому хозяйству
python scripts/import_xlsx.py \
  --file "../Novoladozhskiy 2. Quality Monitor.xlsx" \
  --enterprise 'Новоладожское' \
  --short "Новоладожское"
```

### 3. Разработка без Docker

```bash
# Backend
cd backend
pip install -r requirements.txt
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/quality_monitor \
  uvicorn app.main:app --reload

# Frontend (в другом терминале)
cd frontend
npm install
npm run dev
```

## Структура проекта

```
quality-monitor/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app
│   │   ├── models.py        # SQLAlchemy модели
│   │   ├── schemas.py       # Pydantic схемы
│   │   ├── database.py      # Подключение к БД
│   │   └── routers/
│   │       ├── enterprises.py  # CRUD предприятий
│   │       ├── deliveries.py   # Поставки с фильтрами
│   │       ├── audits.py       # Аудиты
│   │       └── analytics.py    # Аналитика и статистика
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── api/client.js     # Axios API клиент
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── QualityBadge.jsx
│       └── pages/
│           ├── Deliveries.jsx   # Список поставок с фильтрами
│           ├── Enterprises.jsx  # Список предприятий
│           ├── Enterprise.jsx   # Карточка предприятия + графики
│           ├── Audits.jsx       # Аудиты с индикацией просрочек
│           └── Analytics.jsx    # Сводная аналитика
├── scripts/
│   ├── import_xlsx.py   # Импорт из Excel-файлов
│   └── init.sql         # Начальные данные (нормативы)
└── docker-compose.yml
```

## API эндпоинты

| Метод | URL | Описание |
|---|---|---|
| GET | /api/enterprises | Список предприятий (поиск, пагинация) |
| GET | /api/enterprises/{id} | Карточка предприятия |
| GET | /api/enterprises/{id}/farms | Фермы предприятия |
| GET | /api/enterprises/{id}/audits | Аудиты предприятия |
| GET | /api/deliveries | Поставки (фильтры по дате, сорту, SCC...) |
| GET | /api/deliveries/{id} | Поставка с показателями качества |
| GET | /api/audits | Список аудитов (просрочка, результат) |
| GET | /api/analytics/enterprise/{id}/yearly | Статистика по годам |
| GET | /api/analytics/summary | Сводная по всем предприятиям |
| GET | /api/analytics/indicators/targets | Целевые значения |
