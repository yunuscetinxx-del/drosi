# تشغيل تطبيق Flutter للتطوير — بدون بناء APK في كل مرة
# Hot reload: اضغط r في الطرفية بعد أي تعديل
# Hot restart: R

param(
    [string]$Server = "https://sdda.up.railway.app",
    [switch]$LaunchEmulator,
    [string]$Device = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$mobile = Join-Path $root "mobile"

Write-Host "=== Drosi mobile dev ===" -ForegroundColor Cyan
Write-Host "API server: $Server"
Write-Host ""

if ($LaunchEmulator) {
    Write-Host "Starting Android emulator (Pixel 8)..." -ForegroundColor Yellow
    flutter emulators --launch Pixel_8_API_35
    Write-Host "Waiting for emulator boot (45s)..."
    Start-Sleep -Seconds 45
}

Push-Location $mobile
try {
    flutter pub get

    $args = @("run")
    if ($Device) {
        $args += "-d", $Device
    }

    Write-Host ""
    Write-Host "Tips:" -ForegroundColor Green
    Write-Host "  - First run on phone: Settings > Server URL > $Server"
    Write-Host "  - Emulator uses: http://10.0.2.2:3000 for local Next.js"
    Write-Host "  - Press r = hot reload, R = restart, q = quit"
    Write-Host ""

    & flutter @args
} finally {
    Pop-Location
}
