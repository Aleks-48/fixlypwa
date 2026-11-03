@echo off
setlocal
cd /d "%~dp0"
echo ===================================================
echo FIXLY - Database + Website/API + ngrok + Telegram
echo ===================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0web\scripts\start-fixly.ps1" %*
set "FIXLY_EXIT=%ERRORLEVEL%"
echo.
if not "%FIXLY_EXIT%"=="0" echo Startup failed. See the message above and .local-run logs.
pause
exit /b %FIXLY_EXIT%