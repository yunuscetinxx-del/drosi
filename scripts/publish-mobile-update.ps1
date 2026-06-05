# نشر تحديث تطبيق دروسي — يحدّث pubspec و mobile-update.json على السيرفر
# الاستخدام:
#   .\scripts\publish-mobile-update.ps1 -Version "1.2.0" -Build 3 -Changelog "• إصلاحات" -ApkUrl "https://.../durusi.apk"

param(
  [Parameter(Mandatory = $true)]
  [string]$Version,
  [Parameter(Mandatory = $true)]
  [int]$Build,
  [Parameter(Mandatory = $true)]
  [string]$Changelog,
  [string]$ApkUrl = "",
  [switch]$Mandatory
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$pubspec = Join-Path $root "mobile\pubspec.yaml"
$manifest = Join-Path $root "public\mobile-update.json"
$date = Get-Date -Format "yyyy-MM-dd"

# تحديث pubspec.yaml
$content = Get-Content $pubspec -Raw
$content = $content -replace 'version:\s*[\d.]+\+\d+', "version: $Version+$Build"
Set-Content $pubspec $content -NoNewline

$json = @{
  version        = $Version
  buildNumber    = $Build
  releasedAt     = $date
  apkUrl         = $ApkUrl
  changelog      = $Changelog
  mandatory      = [bool]$Mandatory
  minBuildNumber = 0
} | ConvertTo-Json -Depth 3

Set-Content $manifest $json -Encoding UTF8

Write-Host "تم التحديث:"
Write-Host "  mobile/pubspec.yaml -> $Version+$Build"
Write-Host "  public/mobile-update.json -> build $Build"
if (-not $ApkUrl) {
  Write-Host ""
  Write-Host "تنبيه: apkUrl فارغ — ارفع APK إلى GitHub Releases ثم حدّث الرابط في mobile-update.json"
}
Write-Host ""
Write-Host "الخطوات التالية:"
Write-Host "  1) cd mobile && flutter build apk --release"
Write-Host "  2) ارفع APK وأضف الرابط في apkUrl"
Write-Host "  3) git add -A && git commit && git push  (ينشر Railway تلقائياً)"
