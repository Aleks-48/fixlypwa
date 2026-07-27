<#
  start.ps1 — быстрый запуск для продолжения работы (Postgres уже проинициализирован,
  миграции применены, демо-данные засеяны). НЕ трогает ngrok/Telegram-вебхук.

  Использование:
      cd web
      .\start.ps1

  Для первого запуска на новой машине (или после `docker compose down -v`) используйте
  start-fresh.ps1 — он прогоняет миграции/бутстрап/сид и дополнительно поднимает ngrok.
#>

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "== Fixlypwa: быстрый старт ==" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Write-Host ".env не найден. Скопируйте .env.example в .env и заполните секреты." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules отсутствует — npm install..." -ForegroundColor Yellow
    npm install
}

Write-Host "Поднимаю Postgres (docker compose)..." -ForegroundColor Cyan
docker compose up -d postgres

Write-Host "Жду готовности Postgres..." -ForegroundColor Cyan
$deadline = (Get-Date).AddSeconds(60)
while ($true) {
    $status = docker inspect --format "{{.State.Health.Status}}" fixlypwa-postgres-1 2>$null
    if ($status -eq "healthy") { break }
    if ((Get-Date) -gt $deadline) {
        Write-Host "Postgres не стал healthy за 60с — проверьте docker ps / docker compose logs postgres." -ForegroundColor Red
        exit 1
    }
    Start-Sleep -Seconds 2
}
Write-Host "Postgres готов." -ForegroundColor Green

Write-Host ""
Write-Host "Демо-доступы:" -ForegroundColor Cyan
Write-Host "  Председатель: demo@osi.kz / demo12345"
Write-Host "  Житель:       код входа печатается ниже в консоли (OTP_DEV_ECHO)"
Write-Host ""
Write-Host "Запускаю Next.js — http://localhost:3000 (Ctrl+C — остановить)" -ForegroundColor Cyan
npm run dev
