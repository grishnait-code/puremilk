# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A milk quality monitoring web app (Quality Monitor) for tracking supplier enterprises, farm audits, and milk deliveries with quality metrics. The UI is in Russian.

## Development commands

### Full stack via Docker Compose
```bash
docker-compose up --build
# App: http://localhost:3000
# API docs: http://localhost:8000/api/docs
```

### Local development (without Docker)
```bash
# Backend — requires a running PostgreSQL on port 5433
cd backend
pip install -r requirements.txt
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/quality_monitor \
  uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev   # serves on http://localhost:3000
```

### Data import from Excel
```bash
python scripts/import_xlsx.py \
  --file "path/to/file.xlsx" \
  --enterprise "Full Enterprise Name" \
  --short "Short Name"
```

## Architecture

**Backend** (`backend/app/`): FastAPI app using SQLAlchemy ORM, Pydantic v2 schemas, and `pydantic-settings` for config. All routes are mounted under `/api` prefix. Database URL comes from `DATABASE_URL` env var (defaults to `localhost:5433`). Tables are auto-created on startup via `Base.metadata.create_all` — no Alembic migrations in use yet.

**Frontend** (`frontend/src/`): React 18 SPA with React Query for data fetching, Recharts for charts, React Router v6 for navigation. All API calls go through `src/api/client.js` (axios, base URL `/api`). Vite proxies `/api` → `http://localhost:8000` in dev, so the frontend never hardcodes the backend host.

**Database schema** (key tables):
- `enterprises` → `farms` (one-to-many)
- `deliveries` + `quality_results` (one-to-one, joined for quality metrics)
- `audits` → linked to farms, track result (`одобрено`/`условно`/`отказано`) and `overdue_days`
- `targets` — global quality targets when `enterprise_id IS NULL`; per-enterprise targets when set
- `grade_standards` — reference thresholds for grading

**Import script quirk**: `scripts/import_xlsx.py` reads annual-aggregate rows from the `Quality` sheet and creates one `Delivery` record per year, dated `YYYY-12-31`. Each delivery gets a linked `QualityResult` row.

## Key paths
- `backend/app/routers/` — one file per resource (`enterprises`, `deliveries`, `audits`, `analytics`)
- `frontend/src/pages/` — one page component per route
- `frontend/src/api/client.js` — single axios instance; all API functions exported from here
- `scripts/init.sql` — seeds `grade_standards` and global `targets` on first DB init
