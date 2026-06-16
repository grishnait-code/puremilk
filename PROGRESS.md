# PureMilk — Quality Monitor: Прогресс по задаче

*Обновлено: 16 июня 2026 (сессия 3)*

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

## Фильтры на странице Поставки

Фильтр по предприятию и переработчику реализован внутри панели фильтров страницы Поставки (ранее был глобальный селектор в Navbar — удалён).

**Как работает:**
- При открытии панели фильтров в верхней строке — два выпадающих списка: «Предприятие» и «Переработчик»
- Выборы взаимоисключающие: выбор одного сбрасывает другой
- При выборе переработчика backend фильтрует поставки по всем привязанным к нему предприятиям

**Аналитика:**
- Локальный селектор предприятия прямо в шапке страницы `/analytics`
- `EnterpriseContext` больше не используется для глобальной фильтрации

---

## Что сделано (сессия 16 мая 2026)

### Страница Поставки
- Статистика сортности — бейджи с % Экстра / Спец. I / Спец. II / Вне спец. рядом с кнопкой Фильтры
- `GET /api/deliveries/stats` — распределение по сортам для текущей выборки

### Карточка предприятия
- Таблица качества по периодам (аналог Report из Excel): показатели × годы/кварталы
- Годовые столбцы раскрываются в 4 квартала кликом (▸/▾), несколько лет можно раскрыть одновременно
- `GET /api/analytics/enterprise/{id}/report`

### Предприятия
- Кнопка «+ Добавить предприятие» — форма из 6 разделов (реквизиты, адреса, госрегистрация, банк, руководство, примечания)
- Кнопка «✎ Изменить» у каждой строки
- `POST /api/enterprises`, `PUT /api/enterprises/{id}`

### Фермы
- На карточке предприятия (вкладка «Фермы и аудиты»): «+ Добавить ферму», редактирование ✎, удаление ✕
- Форма фермы: 4 раздела (Основное, Производство, Технология, Примечания)
- `POST/PUT/DELETE /api/enterprises/{id}/farms/{farm_id}`

### Аудиты
- «+ Добавить аудит» на странице Аудиты
- Форма: предприятие → ферма (каскадно), дата, результат, срок, следующий аудит (авторасчёт), уведомление
- Редактирование и удаление у каждой строки
- `POST/PUT/DELETE /api/audits`

### Загрузка данных (страница «Загрузка данных»)
- Drag-and-drop загрузка XLS-файла еженедельного отчёта VALIO
- Предпросмотр перед импортом (хозяйство, неделя, количество партий, даты)
- Автоопределение предприятия по названию из файла
- Дубликаты по дате пропускаются автоматически
- `POST /api/import/valio-xls`, `POST /api/import/preview-valio-xls`
- Маппинг 22 колонок XLS → quality_results (точка замерзания конвертируется ×-1000)

### Инфраструктура
- `scripts/migrate_all.sql` — единый скрипт всех миграций при первом развёртывании
- `xlrd` добавлен в requirements.txt

---

## Что сделано (сессия 17 мая 2026)

### Раздел «Аналитика» — 3 вкладки
- **Динамика по месяцам** — выбор периода и показателей кнопками; график объёма поставок, диаграмма сортности по месяцам (стековый барчарт Экстра/Спец.I/Спец.II/Вне спец.), графики выбранных качественных показателей с линиями нормативов
- **Причины потерь сорта** — аналог листа `table Decline of Е`; выбор сорта/группировки/периода; стековый барчарт + детальная таблица по периодам
- **Сравнение предприятий** — выбор показателя, группировки, набора предприятий; линейный график с несколькими сериями и линией норматива
- Новые API: `GET /api/analytics/enterprise/{id}/monthly`, `GET /api/analytics/enterprise/{id}/grade-decline`, `GET /api/analytics/compare`

### PDF-отчёт
- Кнопка «📄 Скачать отчёт PDF» на карточке предприятия и в Аналитике
- Панель выбора: период (от/до) + группировка (месяц/квартал/год)
- PDF содержит таблицу всех показателей с цветовой индикацией (красный = нарушение, зелёный = норма), объём и количество партий
- Поддержка кириллицы через системный шрифт Arial (Windows) / DejaVu (Linux)
- API: `GET /api/reports/enterprise/{id}/pdf`

### Исправления по сорту молока
- **Фильтр по сорту** в `/api/deliveries` переведён с импортированных колонок (`grade_E_final_kg`) на `calculate_grade()` — теперь фильтрует правильно
- **Yearly stats и summary** в analytics.py: проценты сортов считаются через `calculate_grade()`, а не суммированием импортированных кг
- Везде в приложении используется рассчитанный сорт из PostgreSQL-функции

---

## Что сделано (сессия 12 июня 2026)

### Импорт новых поставщиков
- Добавлен скрипт `scripts/import_new_suppliers.py` — умный импорт из файлов Quality Monitor нового формата
- Автоопределение начала данных (первая строка с датой в колонке A) и формата колонок (старый 32-колоночный / новый 33-колоночный с ИВ)
- Импортированы данные 5 новых предприятий: АО Оскольское молоко, МТК Вереск, МТК Ромашка, ЭНА ЖК Бобров-1, ЭНА ЖК Добрино
- Запуск: `python scripts/import_new_suppliers.py` (все 5 файлов из папки «Данные для добавления в базу»)

### Страница Предприятия — быстрый доступ к фермам
- В каждой строке списка предприятий добавлена кнопка «🏠 Фермы (N)»
- Клик открывает карточку предприятия сразу на вкладке «Фермы и аудиты» (через `location.state`)
- Упрощает добавление ферм для новых предприятий перед созданием аудитов

### Аудиты — исправление логики просрочки
- Просрочка больше не показывается у устаревших аудитов, если по той же ферме есть более новый аудит
- Backend (`audits.py`): `_build_audit_with_farm` принимает флаг `superseded`; хелпер `_latest_audit_date_per_farm` определяет самый свежий аудит на ферму; фильтр `overdue_only` применяется после расчёта
- Frontend (`Audits.jsx`): `isOverdue` берётся из `a.overdue_days` (значение бэкенда), а не вычисляется самостоятельно из `next_audit_date`; количество дней просрочки тоже из `a.overdue_days`

## Что сделано (сессия 16 июня 2026)

### Авторизация — бэкенд
- Добавлена таблица `users` (миграция `scripts/migrate_auth.sql`)
- Модель `User` в `backend/app/models.py` — поля: username, full_name, hashed_password, role (admin/user), is_active, created_at
- `backend/app/config.py` — JWT-настройки: `secret_key`, `algorithm`, `access_token_expire_days` (30 дней)
- `backend/app/deps.py` — зависимости `get_current_user` (декодирует JWT) и `require_admin` (проверяет роль)
- `backend/app/routers/auth.py` — `POST /api/auth/login` и `GET /api/auth/me`; passlib bcrypt для хэширования паролей
- `backend/app/routers/users.py` — CRUD пользователей, только для admin; защита от самоудаления/самоотключения
- `backend/app/main.py` — `/api/auth/login` публичный, все остальные эндпоинты требуют валидный JWT
- `scripts/create_admin.py` — создание первого администратора через командную строку

### Авторизация — фронтенд
- `frontend/src/context/AuthContext.jsx` — React Context с хранением токена и юзера в localStorage (ключи `qm_token`, `qm_user`)
- `frontend/src/api/client.js` — axios interceptor: автоматически добавляет `Authorization: Bearer <token>` ко всем запросам; при 401 очищает токен и редиректит на `/login`
- `frontend/src/api/client.js` — добавлены функции: `loginApi`, `getMe`, `getUsers`, `createUser`, `updateUser`, `deleteUser`
- `frontend/src/pages/Login.jsx` — страница входа с формой логин/пароль, обработкой ошибок
- `frontend/src/components/ProtectedRoute.jsx` — HOC-компонент: редирект на `/login` если не авторизован; поддерживает `requireAdmin`
- `frontend/src/App.jsx` — обёрнут в `AuthProvider`; добавлен роут `/login`; все страницы защищены `ProtectedRoute`; `/users` доступен только admin
- `frontend/src/components/Navbar.jsx` — показывает имя и роль текущего пользователя, кнопку «Выйти»; ссылка «Пользователи» видна только admin
- `frontend/src/pages/Users.jsx` — страница управления пользователями (только admin): таблица со статусами, модальное окно создания/редактирования, кнопки включить/отключить/удалить

### Порядок первого запуска
1. `pip install python-jose[cryptography] passlib[bcrypt]` (в окружении backend)
2. `docker exec -i qm_postgres psql -U postgres -d quality_monitor < scripts\migrate_auth.sql`
3. `python scripts/create_admin.py --username admin --password <пароль> --name "Имя Фамилия"`
4. Перезапустить backend
5. Открыть приложение → появится страница входа

---

## Что сделано (сессия 16 июня 2026, часть 2)

### Раздел «Переработчики»
- Модели `Processor` и `EnterpriseProcessor` в `backend/app/models.py`
- Миграция `scripts/migrate_processors.sql` — таблицы `processors` и `enterprise_processors`
- Роутер `backend/app/routers/processors.py`:
  - CRUD переработчиков (`GET/POST/PUT/DELETE /api/processors`)
  - Привязка предприятий (`GET/POST/PUT/DELETE /api/processors/{id}/enterprises`)
  - История поставок `GET /api/processors/{id}/deliveries` — суммарные объёмы по месяцам и предприятиям
- `frontend/src/pages/Processors.jsx` — список переработчиков с таблицей и модалом создания
- `frontend/src/pages/Processor.jsx` — карточка переработчика: реквизиты, список предприятий с датами и статусами, график поставок (stacked bar по месяцам) + итоговая таблица
- Добавлен в Navbar и App.jsx (роуты `/processors`, `/processor/:id`)
- Добавлены API-функции в `frontend/src/api/client.js`
- Применить миграцию: `Get-Content scripts\migrate_processors.sql | docker exec -i qm_postgres psql -U postgres -d quality_monitor`

### Инфраструктура (production)
- `docker-compose.prod.yml` — production-конфигурация: nginx на порту 80, backend и db без внешних портов
- `frontend/Dockerfile.prod` — двухэтапная сборка: `npm run build` → nginx раздаёт статику
- `frontend/nginx.prod.conf` — nginx: SPA-роутинг, реверс-прокси `/api/` → backend, кэширование статики
- `backend/requirements.txt` — зафиксирован `bcrypt==4.0.1` для совместимости с passlib
- `.env.prod.example` — шаблон переменных окружения (пароль БД, SECRET_KEY)
- Запуск: `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`

---

## TODO

### 1. Раздел «Аналитика» — доработки
- [x] Динамика по месяцам ✅
- [x] Причины потерь сорта ✅
- [x] Сравнение предприятий ✅
- [ ] Топ/Антитоп партий по показателю
- [ ] Поголовье/объёмы (если данные появятся в БД)

### 2. Отчёт в PDF
- [x] Скачивание PDF с таблицей показателей ✅

---

### 3. Раздел «Справочники»
Нормативная документация по качеству сырого молока:

**В базе данных:**
- Таблица `references` (или `documents`) — нормативные документы: ГОСТ, ТУ, регламенты
- Таблица `indicator_descriptions` — описание каждого показателя: название, единица измерения, методы определения (ПО / Т001-2), нормативный документ, допустимые диапазоны по сортам, интерпретация значений

**В приложении (новый раздел «Справочники»):**
- Список нормативных документов с описаниями
- Карточка каждого показателя: что измеряет, как интерпретировать, пороговые значения, ссылка на ГОСТ
- Возможность прикреплять файлы документов (через таблицу `files`)

---

## Что сделано (сессия 16 июня 2026, часть 3)

### Фильтры Поставок — предприятие и переработчик
- Удалён глобальный селектор предприятий из Navbar
- В панель фильтров страницы Поставки добавлены два динамических выпадающих списка: Предприятие и Переработчик (взаимоисключающие)
- Backend `/api/deliveries` и `/api/deliveries/stats` принимают `processor_id`: фильтруют по привязанным предприятиям через `enterprise_processors`
- `/api/enterprises` и `/api/deliveries`: лимит `page_size` увеличен с 100 до 500

### Аналитика
- Страница `/analytics` получила локальный селектор предприятия в шапке (вместо глобального Navbar-контекста)
- `EnterpriseContext` оставлен в кодовой базе, но больше не используется для Поставок и Аналитики

### Исправления
- `SyntaxError` в `deliveries.py`: параметр `processor_id=None` перемещён в конец сигнатуры `build_filter_query`
- `422 Unprocessable Content` при запросе предприятий: лимит `le=100` → `le=500`
- `getProcessors()` в `client.js` теперь принимает параметры; ответ `/api/processors` — массив, не объект с `items`

---

### Инфраструктура
- [x] Docker Compose production ✅
