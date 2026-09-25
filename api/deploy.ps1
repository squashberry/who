$ErrorActionPreference = 'Stop'

Set-Location (Join-Path $PSScriptRoot '')

Write-Host '============================================================'
Write-Host 'WHO CONTROL API — SAFE DEPLOYMENT'
Write-Host '============================================================'
Write-Host ''

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    throw 'Node.js / npx is required.'
}

Write-Host '[1/7] Checking Cloudflare authentication...'
$whoami = npx wrangler whoami 2>&1
$whoami | ForEach-Object { Write-Host $_ }

if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host 'Cloudflare login is required. Opening browser login...'
    npx wrangler login
    if ($LASTEXITCODE -ne 0) { throw 'Cloudflare login failed.' }
}

$cfgPath = Join-Path $PSScriptRoot 'wrangler.toml'
$cfg = Get-Content $cfgPath -Raw

Write-Host ''
Write-Host '[2/7] Listing Cloudflare D1 databases (READ ONLY)...'
$listRaw = npx wrangler d1 list --json 2>&1
$listRaw | ForEach-Object { Write-Host $_ }

$dbs = $null
try { $dbs = $listRaw | ConvertFrom-Json } catch {}

$items = @()
if ($dbs) {
    if ($dbs.result) { $items = @($dbs.result) }
    elseif ($dbs.databases) { $items = @($dbs.databases) }
    elseif ($dbs -is [System.Array]) { $items = @($dbs) }
    else { $items = @($dbs) }
}

$named = @($items | Where-Object { $_.name -or $_.database_name })

if (-not $named -or $named.Count -eq 0) {
    throw 'No D1 databases were returned. This script will not create one automatically.'
}

Write-Host ''
Write-Host 'Available D1 databases:'
for ($i = 0; $i -lt $named.Count; $i++) {
    $name = if ($named[$i].name) { $named[$i].name } else { $named[$i].database_name }
    $id = if ($named[$i].uuid) { $named[$i].uuid } elseif ($named[$i].database_id) { $named[$i].database_id } else { $named[$i].id }
    Write-Host "[$($i + 1)] $name  |  $id"
}

Write-Host ''
$dbName = Read-Host 'Enter the EXISTING WHO D1 database name (do not create a new one)'

$selected = $named | Where-Object {
    $_.name -eq $dbName -or $_.database_name -eq $dbName
} | Select-Object -First 1

if (-not $selected) {
    throw "D1 database '$dbName' was not found. No deployment changes were made."
}

$dbId = if ($selected.uuid) { $selected.uuid } elseif ($selected.database_id) { $selected.database_id } else { $selected.id }

if (-not $dbId) {
    throw "The selected D1 database '$dbName' has no readable database ID."
}

Write-Host ''
Write-Host "[OK] Selected existing WHO D1 database: $dbName"
Write-Host "[OK] Database ID: $dbId"

$cfg = $cfg -replace 'database_name = "who-db"', ('database_name = "' + $dbName + '"')
$cfg = $cfg -replace 'database_id = "REPLACE_WITH_EXISTING_WHO_D1_DATABASE_ID"', ('database_id = "' + $dbId + '"')
Set-Content -Path $cfgPath -Value $cfg -Encoding UTF8

Write-Host ''
Write-Host '[3/7] Applying D1 migrations to the selected database...'
npx wrangler d1 migrations apply $dbName --remote
if ($LASTEXITCODE -ne 0) {
    throw 'D1 migration failed.'
}

Write-Host ''
Write-Host '[4/7] Creating Admin API key...'
$chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$AdminKey = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
$AdminKey | Set-Clipboard

Write-Host '[OK] Admin API key copied to clipboard.'
Write-Host 'Enter/paste that key into the Cloudflare secret prompt.'
Write-Host ''

npx wrangler secret put ADMIN_API_KEY
if ($LASTEXITCODE -ne 0) {
    throw 'ADMIN_API_KEY secret setup failed.'
}

Write-Host ''
Write-Host '[5/7] Optional phone lookup secret...'
$setLookup = Read-Host 'Set PHONE_LOOKUP_SECRET now? (Y/N)'

if ($setLookup -match '^(Y|y)$') {
    $lookupBytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($lookupBytes)
    $lookupSecret = [Convert]::ToBase64String($lookupBytes)
    $lookupSecret | Set-Clipboard
    Write-Host '[OK] PHONE_LOOKUP_SECRET copied to clipboard.'
    npx wrangler secret put PHONE_LOOKUP_SECRET
    if ($LASTEXITCODE -ne 0) {
        throw 'PHONE_LOOKUP_SECRET setup failed.'
    }
} else {
    Write-Host '[SKIP] PHONE_LOOKUP_SECRET was not changed.'
}

Write-Host ''
Write-Host '[6/7] Deploying WHO Control API Worker...'
npx wrangler deploy
if ($LASTEXITCODE -ne 0) {
    throw 'Worker deployment failed.'
}

Write-Host ''
Write-Host '[7/7] Checking Worker health...'
$health = try {
    Invoke-RestMethod 'https://who-control-api.who-fe3.workers.dev/health' -TimeoutSec 20
} catch {
    @{ success=$false; error=$_.Exception.Message }
}

$healthText = $health | ConvertTo-Json -Compress
Write-Host $healthText

$result = @"
============================================================
WHO CONTROL API — DEPLOYMENT RESULT
============================================================

Worker:
https://who-control-api.who-fe3.workers.dev

D1:
$dbName
$dbId

Health:
$healthText

ADMIN_API_KEY:
Generated and copied to clipboard.
DO NOT commit the key to GitHub.

IMPORTANT:
This Worker must use the same D1 database that the existing WHO mobile API uses if
remote config and app-side data are to be shared between the Admin panel and the app.
"@

$result | Set-Clipboard

Write-Host ''
Write-Host $result
Write-Host 'Deployment result copied to clipboard.'
