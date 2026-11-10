# Enregistre les identifiants Jira de l'agent, hors conversation.
#
# Usage : clic droit > « Exécuter avec PowerShell », ou dans PowerShell :
#   powershell -ExecutionPolicy Bypass -File scripts\set-jira-credentials.ps1
#
# Le jeton est saisi masqué et n'apparaît jamais à l'écran ni dans la
# conversation. Il est écrit dans %USERPROFILE%\.dsh\jira\credentials.env.

$ErrorActionPreference = 'Stop'

$dir = Join-Path $env:USERPROFILE '.dsh\jira'
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$credsFile = Join-Path $dir 'credentials.env'
$savedSite = ''
if (Test-Path -LiteralPath $credsFile) {
    $match = Select-String -LiteralPath $credsFile -Pattern '^export ATLASSIAN_SITE_NAME="(.*)"' | Select-Object -First 1
    if ($match) { $savedSite = $match.Matches[0].Groups[1].Value }
}

Write-Host 'Enregistrement des identifiants Jira (une seule fois).'
Write-Host ''

$email = Read-Host 'E-mail de votre compte Atlassian'
if ([string]::IsNullOrWhiteSpace($email)) {
    Write-Host 'E-mail vide : abandon.' -ForegroundColor Red
    exit 1
}

$sitePrompt = 'Nom du site Atlassian (ex. mon-entreprise pour mon-entreprise.atlassian.net)'
if ($savedSite) { $sitePrompt = "$sitePrompt [$savedSite]" }
$site = Read-Host $sitePrompt
if ([string]::IsNullOrWhiteSpace($site)) { $site = $savedSite }
$site = $site.Trim()
$site = $site -replace '^https?://', ''
$site = ($site -split '\.')[0]
if ([string]::IsNullOrWhiteSpace($site)) {
    Write-Host 'Site Atlassian vide : abandon.' -ForegroundColor Red
    exit 1
}

$secure = Read-Host 'Token API Atlassian (collez-le puis Entrée ; il reste masqué)' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}
if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host 'Token vide : abandon.' -ForegroundColor Red
    exit 1
}

$lines = @(
    ('export ATLASSIAN_SITE_NAME="{0}"' -f $site),
    ('export ATLASSIAN_USER_EMAIL="{0}"' -f $email.Trim()),
    ('export ATLASSIAN_API_TOKEN="{0}"' -f $token.Trim())
)
Set-Content -LiteralPath $credsFile -Value $lines -Encoding ASCII

# Lecture réservée au compte Windows courant (au mieux : certains disques ne
# gèrent pas les ACL NTFS).
try {
    icacls $credsFile /inheritance:r /grant:r "$($env:USERNAME):(F)" | Out-Null
} catch {
    Write-Host 'Droits du fichier non restreints (sans conséquence sur un poste personnel).' -ForegroundColor Yellow
}

Write-Host ''
Write-Host "Identifiants enregistrés dans $credsFile" -ForegroundColor Green
Write-Host 'Vérification : double-cliquez sur Verifier-Jira.cmd, ou lancez scripts\check-jira.ps1'
