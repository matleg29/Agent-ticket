# Vérifie la connexion Jira avec les identifiants enregistrés.
#
# Usage : clic droit > « Exécuter avec PowerShell », ou dans PowerShell :
#   powershell -ExecutionPolicy Bypass -File scripts\check-jira.ps1

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$credsFile = Join-Path $env:USERPROFILE '.dsh\jira\credentials.env'
if (-not (Test-Path -LiteralPath $credsFile)) {
    Write-Host "Identifiants absents. Lancez d'abord Configurer-Jira.cmd." -ForegroundColor Red
    exit 1
}

$values = @{}
foreach ($line in Get-Content -LiteralPath $credsFile) {
    if ($line -match '^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$') {
        $value = $matches[2].Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $values[$matches[1]] = $value
    }
}

$site = $values['ATLASSIAN_SITE_NAME']
$email = $values['ATLASSIAN_USER_EMAIL']
$token = $values['ATLASSIAN_API_TOKEN']
if ([string]::IsNullOrWhiteSpace($site) -or [string]::IsNullOrWhiteSpace($email) -or [string]::IsNullOrWhiteSpace($token)) {
    Write-Host 'Identifiants incomplets. Relancez Configurer-Jira.cmd.' -ForegroundColor Red
    exit 1
}

if ($values['ATLASSIAN_BASE_URL']) {
    $base = $values['ATLASSIAN_BASE_URL']
} else {
    $base = "https://$site.atlassian.net"
}
$pair = "$email`:$token"
$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($pair))
    Accept        = 'application/json'
}

try {
    $me = Invoke-RestMethod -Uri "$base/rest/api/3/myself" -Headers $headers -Method Get -UseBasicParsing
} catch {
    $status = $null
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    if ($status -eq 401) {
        Write-Host 'Échec (401) : jeton refusé, révoqué ou copie tronquée. Créez un nouveau jeton, puis relancez Configurer-Jira.cmd.' -ForegroundColor Red
    } elseif ($status -eq 403) {
        Write-Host "Échec (403) : votre compte n'a pas accès à cet espace Jira. Vérifiez le nom du site et vos droits." -ForegroundColor Red
    } else {
        Write-Host "Échec de la connexion à $base : $($_.Exception.Message)" -ForegroundColor Red
    }
    exit 1
}

Write-Host 'Connexion Jira OK :' -ForegroundColor Green
Write-Host "  compte : $($me.displayName) | $($me.emailAddress) | $($me.accountId)"

# Vérifie aussi le projet Jira configuré, s'il y en a un.
$configFile = Join-Path $env:USERPROFILE '.dsh\pm-tickets\config.json'
$projectKey = ''
if (Test-Path -LiteralPath $configFile) {
    try {
        $config = Get-Content -LiteralPath $configFile -Raw | ConvertFrom-Json
        if ($config.jira -and $config.jira.key) { $projectKey = [string]$config.jira.key }
    } catch { }
}

if ([string]::IsNullOrWhiteSpace($projectKey)) {
    Write-Host "Aucun projet Jira configuré : l'agent posera la question au prochain lancement."
    exit 0
}

try {
    $project = Invoke-RestMethod -Uri "$base/rest/api/3/project/$projectKey" -Headers $headers -Method Get -UseBasicParsing
    Write-Host "Projet configuré : $projectKey ($($project.name))" -ForegroundColor Green
} catch {
    Write-Host "Avertissement : le projet $projectKey n'est pas accessible. Vérifiez la clé dans la configuration de l'agent." -ForegroundColor Yellow
}

exit 0
