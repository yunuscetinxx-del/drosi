# تشغيل تطبيق Flutter في المتصفح (Chrome) — hot reload بزر r
param(
    [int]$Port = 5199,
    [switch]$BuildOnly,
    [switch]$DeployToPublic
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$mobile = Join-Path $root "mobile"
$publicApp = Join-Path $root "public\flutter-app"

Push-Location $mobile
try {
    flutter pub get

    if ($DeployToPublic) {
        Write-Host "Building Flutter web for /flutter-app ..." -ForegroundColor Cyan
        flutter build web --base-href "/flutter-app/" --release
        if (Test-Path $publicApp) { Remove-Item $publicApp -Recurse -Force }
        Copy-Item (Join-Path $mobile "build\web") $publicApp -Recurse
        Write-Host "Copied to public/flutter-app — open /flutter-app on your site" -ForegroundColor Green
        exit 0
    }

    if ($BuildOnly) {
        flutter build web --release
        Write-Host "Built: mobile/build/web" -ForegroundColor Green
        exit 0
    }

    Write-Host "Building Flutter web for localhost (base-href /)..." -ForegroundColor Cyan
    flutter build web --release --no-wasm-dry-run --base-href "/"
    Write-Host ""
    Write-Host "Open in browser: http://localhost:$Port" -ForegroundColor Green
    Write-Host "API: https://sdda.up.railway.app (or same site if deployed to /flutter-app)" -ForegroundColor Yellow
    Write-Host "After code changes: run this script again to rebuild" -ForegroundColor Yellow
    Write-Host ""
    npx --yes serve (Join-Path $mobile "build\web") -l $Port
} finally {
    Pop-Location
}
