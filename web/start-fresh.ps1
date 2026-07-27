<#
  start-fresh.ps1 — старт "с нуля": npm install → Postgres в Docker → миграции → пароли ролей БД
  → демо-данные → Next.js (dev) → ngrok-туннель → регистрация Telegram-вебхука на новый URL.

  Использование:
      cd web
      .\start-fresh.ps1

  Когда нужен именно этот скрипт (а не start.ps1):
    - первый запуск на новой машине / после git clone;
    - после `docker compose down -v` (том Postgres стёрт, БД пустая);
    - нужен публичный HTTPS-адрес для демо (ngrok) — например, показать председателю
      или протестировать Telegram-бота/Flutter-приложение не с localhost.

  Next.js и ngrok открываются в ОТДЕЛЬНЫХ окнах PowerShell — логи видно там же,
  остановка — просто закрыть окно (или Ctrl+C внутри него).
#>

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Read-DotEnvValue {
    param([string]$Name)
    $line = Get-Content ".env" -ErrorAction SilentlyContinue |
        Where-Object { $_ -match "^\s*$Name\s*=" } |
        Select-Object -Last 1
    if (-not $line) { return $null }
    $value = ($line -replace "^\s*$Name\s*=", "").Trim()
    return $value.Trim('"')
}

Write-Host "== Fixlypwa: старт с нуля ==" -ForegroundColor Cyan

foreach ($cmd in @("docker", "node", "npm")) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "Не найдена команда '$cmd' — установите её (Docker Desktop / Node.js LTS) и запустите скрипт заново." -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path ".env")) {
    Write-Host ".env не найден. Скопируйте .env.example в .env перед запуском:" -ForegroundColor Red
    Write-Host "  Copy-Item .env.example .env" -ForegroundColor Red
    Write-Host "Значений по умолчанию (LLM_PROVIDER=console, без Groq/Telegram-ключей) достаточно" -ForegroundColor Red
    Write-Host "для локальной работы — публичный адрес/Telegram-вебхук ниже просто будут пропущены." -ForegroundColor Red
    exit 1
}

Write-Host "npm install..." -ForegroundColor Cyan
npm install

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

Write-Host "Применяю миграции (prisma migrate deploy)..." -ForegroundColor Cyan
npx prisma migrate deploy

Write-Host "Прописываю реальные пароли ролей БД (db-bootstrap)..." -ForegroundColor Cyan
npx tsx scripts/db-bootstrap.ts

Write-Host "Генерирую Prisma Client..." -ForegroundColor Cyan
npx prisma generate

Write-Host "Сею демо-данные (idempotent)..." -ForegroundColor Cyan
npm run seed

Write-Host "Запускаю Next.js в отдельном окне..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; npm run dev"

Write-Host "Жду готовности Next.js на :3000..." -ForegroundColor Cyan
$nextReady = $false
$deadline = (Get-Date).AddSeconds(60)
while (-not $nextReady) {
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3000/login" -UseBasicParsing -TimeoutSec 3
        if ($resp.StatusCode -eq 200) { $nextReady = $true }
    } catch {
        # ещё компилируется/поднимается — просто ждём
    }
    if (-not $nextReady) {
        if ((Get-Date) -gt $deadline) {
            Write-Host "Next.js не ответил за 60с — проверьте открывшееся окно." -ForegroundColor Red
            break
        }
        Start-Sleep -Seconds 2
    }
}
if ($nextReady) { Write-Host "Next.js готов." -ForegroundColor Green }

$ngrokExe = Join-Path $PSScriptRoot "ngrok.exe"
$ngrokYml = Join-Path $PSScriptRoot "ngrok.yml"
$ngrokStarted = $false

if (-not (Test-Path $ngrokExe) -or -not (Test-Path $ngrokYml)) {
    # Оба файла в .gitignore (ngrok.yml содержит authtoken-секрет, ngrok.exe — бинарник) — на
    # новой машине их не будет после git clone. Это НЕ ошибка: локально приложение уже работает
    # (http://localhost:3000), публичный адрес/Telegram-вебхук — опциональная часть демо-режима.
    Write-Host ""
    Write-Host "ngrok.exe/ngrok.yml не найдены в web/ — пропускаю публичный адрес и Telegram-вебхук." -ForegroundColor Yellow
    Write-Host "Приложение уже работает локально: http://localhost:3000" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Чтобы включить демо через интернет на этой машине:" -ForegroundColor DarkGray
    Write-Host "  1. Скачайте ngrok.exe (https://ngrok.com/download) в web/" -ForegroundColor DarkGray
    Write-Host "  2. Copy-Item ngrok.example.yml ngrok.yml, впишите свой authtoken" -ForegroundColor DarkGray
    Write-Host "     (https://dashboard.ngrok.com/get-started/your-authtoken)" -ForegroundColor DarkGray
    Write-Host "  3. Запустите .\start-fresh.ps1 ещё раз" -ForegroundColor DarkGray
} else {
    $ngrokStarted = $true
    Write-Host "Запускаю ngrok в отдельном окне..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; .\ngrok.exe start frontend --config ngrok.yml"

    Write-Host "Жду публичный URL от ngrok (локальный API :4040)..." -ForegroundColor Cyan
    $publicUrl = $null
    $deadline = (Get-Date).AddSeconds(30)
    while (-not $publicUrl) {
        try {
            $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 3
            $https = $tunnels.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
            if ($https) { $publicUrl = $https.public_url }
        } catch {
            # ngrok ещё стартует
        }
        if (-not $publicUrl) {
            if ((Get-Date) -gt $deadline) {
                Write-Host "Не удалось получить URL ngrok за 30с — проверьте окно ngrok (возможно, неверный authtoken)." -ForegroundColor Red
                break
            }
            Start-Sleep -Seconds 2
        }
    }

    if ($publicUrl) {
        Write-Host ""
        Write-Host "Публичный адрес: $publicUrl" -ForegroundColor Green
        Write-Host "(бесплатный ngrok при первом заходе в браузере покажет предупреждение-заглушку" -ForegroundColor DarkGray
        Write-Host " — это нормально, жмите Visit Site; API-клиенты обходят его заголовком" -ForegroundColor DarkGray
        Write-Host " ngrok-skip-browser-warning, он уже встроен в мобильный клиент.)" -ForegroundColor DarkGray
        Write-Host ""

        $botToken = Read-DotEnvValue "TELEGRAM_BOT_TOKEN"
        $webhookSecret = Read-DotEnvValue "TELEGRAM_WEBHOOK_SECRET"
        if ($botToken -and $webhookSecret) {
            Write-Host "Регистрирую Telegram-вебхук на новый адрес..." -ForegroundColor Cyan
            $webhookUrl = "$publicUrl/api/telegram/webhook"
            try {
                $result = Invoke-RestMethod -Method Post `
                    -Uri "https://api.telegram.org/bot$botToken/setWebhook" `
                    -Body @{ url = $webhookUrl; secret_token = $webhookSecret }
                if ($result.ok) {
                    Write-Host "Telegram-вебхук обновлён: $webhookUrl" -ForegroundColor Green
                } else {
                    Write-Host "Telegram setWebhook вернул ошибку: $($result.description)" -ForegroundColor Red
                }
            } catch {
                Write-Host "Не удалось вызвать Telegram setWebhook: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "TELEGRAM_BOT_TOKEN/TELEGRAM_WEBHOOK_SECRET не заданы в .env — вебхук не тронут." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Продолжайте без публичного адреса либо проверьте окно ngrok вручную." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Готово." -ForegroundColor Cyan
Write-Host "Демо-доступы:" -ForegroundColor Cyan
Write-Host "  Председатель: demo@osi.kz / demo12345"
Write-Host "  Житель:       код входа печатается в окне Next.js (OTP_DEV_ECHO=1)"
Write-Host ""
if ($ngrokStarted) {
    Write-Host "Next.js и ngrok работают в отдельных окнах — закройте их (или Ctrl+C внутри), чтобы остановить."
} else {
    Write-Host "Next.js работает в отдельном окне — закройте его (или Ctrl+C внутри), чтобы остановить."
}
