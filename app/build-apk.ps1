$ErrorActionPreference = "Stop"

Set-Location -Path $PSScriptRoot

Write-Host "1/3 Cleaning Flutter..." -ForegroundColor Yellow
flutter clean

Write-Host "2/3 Getting dependencies..." -ForegroundColor Yellow
flutter pub get

Write-Host "3/3 Building APK..." -ForegroundColor Cyan
flutter build apk --release --split-per-abi

Write-Host "`nBuild complete! Your APK files:" -ForegroundColor Green
Get-ChildItem -Path "build\app\outputs\flutter-apk\" -Filter "*.apk" | ForEach-Object {
    $sizeMb = [math]::Round($_.Length / 1MB, 2)
    Write-Host " -> $($_.Name) ($sizeMb MB)" -ForegroundColor Green
}