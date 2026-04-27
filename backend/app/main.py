from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import Base, engine
from app.routers import enterprises, deliveries, audits, analytics, grade_standards, grades

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

app.include_router(enterprises.router, prefix="/api")
app.include_router(deliveries.router, prefix="/api")
app.include_router(audits.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(grade_standards.router, prefix="/api")
app.include_router(grades.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "version": settings.app_version}
