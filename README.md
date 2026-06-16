# Quality Monitor

Веб-приложение для мониторинга качества молока от предприятий-поставщиков.

## Технологии

- **Backend:** Python 3.14 + FastAPI + SQLAlchemy + PostgreSQL 14
- **Frontend:** React 18 + Vite + Recharts + React Query
- **Auth:** JWT (python-jose + passlib/bcrypt 4.0.1)
- **Деплой:** Docker Compose (dev) / docker-compose.prod.yml (prod, nginx)

## База данных

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
| `processors` | Переработчики молока (принимающие организации) |
| `enterprise_processors` | Связь предприятий с переработчиками (M:M, с датами) |
| `users` | Пользователи системы (роли: admin / user) |
| `targets` | Целевые значения KPI |
| `files` | Полиморфное хранилище файлов |

**SQL-функции:**
- `calculate_grade(delivery_id)` — рассчитывает сорт партии динамически из `grades` + `grade_standards`
- `grade_violations(delivery_id)` — возвращает нарушенные нормативы

## Быстрый старт (разработка)

```powershell
# 1. Запустить PostgreSQL
docker start qm_postgres

# 2. Backend (терминал 1)
cd backend
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5433/quality_monitor"
python -m uvicorn app.main:app --reload --port 8000

# 3. Frontend (терминал 2)
cd frontend
npm run dev
```

**Приложение:** http://localhost:3000  
**API docs:** http://localhost:8000/api/docs

## Первый запуск (миграции и admin)

```powershell
# Применить миграции
Get-Content scripts\migrate_auth.sql | docker exec -i qm_postgres psql -U postgres -d quality_monitor
Get-Content scripts\migrate_processors.sql | docker exec -i qm_postgres psql -U postgres -d quality_monitor

# Создать администратора
cd backend
python scripts/create_admin.py --username admin --password <пароль> --name "Имя Фамилия"
```

## Production-деплой

```bash
cp .env.prod.example .env.prod
# Заполнить .env.prod (пароли, SECRET_KEY)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## Структура проекта

```
quality-monitor/
├── backend/app/
│   ├── main.py
│   ├── models.py          # Enterprise, Farm, Delivery, QualityResult, Grade,
│   │                      # Processor, EnterpriseProcessor, User...
│   ├── schemas.py
│   ├── deps.py            # get_current_user, require_admin
│   └── routers/
│       ├── auth.py        # POST /api/auth/login, GET /api/auth/me
│       ├── users.py       # CRUD пользователей (только admin)
│       ├── enterprises.py
│       ├── deliveries.py  # фильтры по всем показателям + processor_id
│       ├── processors.py  # CRUD переработчиков + привязки предприятий
│       ├── audits.py
│       ├── analytics.py
│       ├── grades.py
│       ├── grade_standards.py
│       ├── reports.py
│       └── import_data.py
├── frontend/src/
│   ├── api/client.js      # axios + auth interceptor + все API-функции
│   ├── context/
│   │   ├── AuthContext.jsx      # JWT токен, user, login/logout
│   │   └── EnterpriseContext.jsx
│   ├── components/
│   │   ├── Navbar.jsx           # навигация + имя пользователя + выход
│   │   └── ProtectedRoute.jsx   # редирект на /login, поддержка requireAdmin
│   └── pages/
│       ├── Login.jsx
│       ├── Users.jsx            # управление пользователями (только admin)
│       ├── Deliveries.jsx       # фильтры по предприятию/переработчику/показателям
│       ├── Analytics.jsx        # локальный селектор предприятия
│       ├── Processors.jsx       # список переработчиков
│       ├── Processor.jsx        # карточка: реквизиты, предприятия, поставки
│       ├── Enterprises.jsx
│       ├── Enterprise.jsx
│       ├── Audits.jsx
│       ├── GradeStandards.jsx
│       └── ImportData.jsx
├── frontend/Dockerfile.prod     # двухэтапная сборка node→nginx
├── frontend/nginx.prod.conf
├── docker-compose.prod.yml
├── scripts/
│   ├── migrate_auth.sql
│   ├── migrate_processors.sql
│   ├── create_admin.py
│   └── import_xlsx.py
└── PROGRESS.md
```

## API эндпоинты

| Метод | URL | Описание |
|---|---|---|
| POST | /api/auth/login | Логин (публичный) |
| GET | /api/auth/me | Текущий пользователь |
| GET/POST/PUT/DELETE | /api/users | Управление пользователями (admin) |
| GET | /api/enterprises | Список предприятий |
| GET | /api/enterprises/{id} | Карточка предприятия |
| GET | /api/deliveries | Поставки (30+ фильтров, enterprise_id, processor_id) |
| GET | /api/deliveries/stats | Распределение по сортам |
| GET/POST/PUT/DELETE | /api/processors | CRUD переработчиков |
| GET/POST/PUT/DELETE | /api/processors/{id}/enterprises | Привязки предприятий |
| GET | /api/processors/{id}/deliveries | История поставок переработчика |
| GET | /api/audits | Аудиты |
| GET | /api/analytics/enterprise/{id}/monthly | Помесячная динамика |
| GET | /api/analytics/enterprise/{id}/grade-decline | Причины потерь сорта |
| GET | /api/analytics/compare | Сравнение предприятий |
| GET | /api/reports/enterprise/{id}/pdf | PDF-отчёт |
| GET | /api/grades | Сорта молока |
| GET | /api/grade-standards/grouped | Нормативы |
