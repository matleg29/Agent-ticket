# Ajoute un exemple de ticket a la bibliotheque de reference de l'agent.
#
# Usage :
#   powershell -ExecutionPolicy Bypass -File scripts\add-example.ps1 -Source C:\chemin\ticket.md
#   powershell -ExecutionPolicy Bypass -File scripts\add-example.ps1 -Source ticket.md -Name story-mon-sujet.md
#
# Le fichier est copie dans %USERPROFILE%\.dsh\pm-tickets\examples\ : l'agent
# relit ce dossier a chaque redaction, sans reinstallation.

param(
    [Parameter(Mandatory = $true)][string]$Source,
    [string]$Name = ''
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $Source)) {
    Write-Host "Fichier introuvable : $Source" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($Name)) {
    $Name = Split-Path -Leaf $Source
}
if ($Name -notmatch '\.(md|markdown|txt)$') {
    $Name = "$Name.md"
}

$dir = Join-Path $env:USERPROFILE '.dsh\pm-tickets\examples'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Copy-Item -LiteralPath $Source -Destination (Join-Path $dir $Name) -Force

Write-Host "Exemple ajoute : $(Join-Path $dir $Name)" -ForegroundColor Green
Write-Host 'Contenu de la bibliotheque :'
Get-ChildItem -LiteralPath $dir -File | Select-Object -ExpandProperty Name
