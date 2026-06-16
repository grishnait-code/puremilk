from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import Base, engine
from app.routers import enterprises, deliveries, audits, analytics, grade_standards, grades, import_data, reports, processors
from app.routers import auth, users
from app.deps import get_current_user

# Создаём таблицы (в prod — через Alembic)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Публичные роутеры (без авторизации)
app.include_router(auth.router, prefix="/api")

# Защищённые роутеры — требуют валидный JWT
_auth = {"dependencies": [Depends(get_current_user)]}
app.include_router(enterprises.router, prefix="/api", **_auth)
app.include_router(deliveries.router, prefix="/api", **_auth)
app.include_router(audits.router, prefix="/api", **_auth)
app.include_router(analytics.router, prefix="/api", **_auth)
app.include_router(grade_standards.router, prefix="/api", **_auth)
app.include_router(grades.router, prefix="/api", **_auth)
app.include_router(import_data.router, prefix="/api", **_auth)
app.include_router(reports.router, prefix="/api", **_auth)
app.include_router(users.router, prefix="/api", **_auth)
app.include_router(processors.router, prefix="/api", **_auth)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": settings.app_version}
