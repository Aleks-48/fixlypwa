@echo off
cd /d "%~dp0web"
node scripts\setup-tester.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
call npm run dev -- --hostname 127.0.0.1
pause
