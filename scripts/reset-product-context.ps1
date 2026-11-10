# Remet la mise en route de l'agent a zero, pour revoir les quatre questions.
# La configuration actuelle est sauvegardee avant suppression.
#
# Usage : powershell -ExecutionPolicy Bypass -File scripts\reset-product-context.ps1

$ErrorActionPreference = 'Stop'

$dir = Join-Path $env:USERPROFILE '.dsh\pm-tickets'
$configFile = Join-Path $dir 'config.json'

if (-not (Test-Path -LiteralPath $configFile)) {
    Write-Host 'Aucune configuration a reinitialiser : la prochaine session posera les quatre questions.'
    exit 0
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $dir "config.backup-$stamp.json"
Copy-Item -LiteralPath $configFile -Destination $backup -Force
Remove-Item -LiteralPath $configFile -Force

Write-Host "Configuration deplacee vers : $backup" -ForegroundColor Green
Write-Host 'La prochaine session posera les quatre questions de mise en route.'
Write-Host "Pour restaurer : Copy-Item `"$backup`" `"$configFile`""
