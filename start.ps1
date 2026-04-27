# Quality Monitor — скрипт запуска
$projectDir = "C:\Users\ggyur\OneDrive\Desktop\Claude\PureMilk\PureMilk\quality-monitor"

Write-Host "Запуск Quality Monitor..." -ForegroundColor Cyan

# 1. PostgreSQL
Write-Host "[1/3] Запуск PostgreSQL..." -ForegroundColor Yellow
docker start qm_postgres
Start-Sleep -Seconds 2
Write-Host "PostgreSQL OK" -ForegroundColor Green

# 2. Backend
Write-Host "[2/3] Запуск Backend..." -ForegroundColor Yellow
$backendCmd = "cd `"$projectDir\backend`"; `$env:DATABASE_URL=`"postgresql://postgres:postgres@localhost:5433/quality_monitor`"; python -m uvicorn app.main:app --reload --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
Start-Sleep -Seconds 3
Write-Host "Backend OK" -ForegroundColor Green

# 3. Frontend
Write-Host "[3/3] Запуск Frontend..." -ForegroundColor Yellow
$frontendCmd = "cd `"$projectDir\frontend`"; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd
Start-Sleep -Seconds 3
Write-Host "Frontend OK" -ForegroundColor Green

# Открыть браузер
Write-Host "Готово! Открываю браузер..." -ForegroundColor Green
Start-Sleep -Seconds 2
Start-Process "msedge" -ArgumentList "http://localhost:3000"
