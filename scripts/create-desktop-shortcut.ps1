# Creates a Windows desktop shortcut to launch the Drosi site locally with one click.
# Run with: npm run shortcut:create

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$TargetBat = Join-Path $ProjectRoot "scripts\Start-Drosi.bat"
$IconPath = Join-Path $ProjectRoot "public\app-icon.ico"
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "Drosi.lnk"

if (-not (Test-Path $TargetBat)) {
    Write-Error "Not found: $TargetBat"
    exit 1
}

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetBat
$Shortcut.WorkingDirectory = $ProjectRoot
$Shortcut.WindowStyle = 1
$Shortcut.Description = "Start the Drosi site locally and open it in the browser"
if (Test-Path $IconPath) {
    $Shortcut.IconLocation = $IconPath
}
$Shortcut.Save()

Write-Host "Desktop shortcut created: $ShortcutPath"
