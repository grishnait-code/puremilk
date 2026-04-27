@echo off
echo Starting Quality Monitor...

echo [1/3] Starting PostgreSQL...
docker start qm_postgres

echo [2/3] Starting Backend...
start "Backend" powershell -NoExit -Command "cd '%~dp0backend'; $env:DATABASE_URL='postgresql://postgres:postgres@localhost:5433/quality_monitor'; python -m uvicorn app.main:app --reload --port 8000"

timeout /t 4 /nobreak >nul

echo [3/3] Starting Frontend...
start "Frontend" powershell -NoExit -Command "cd '%~dp0frontend'; npm run dev"

timeout /t 4 /nobreak >nul

echo Opening browser...
start http://localhost:3000

echo Done!
