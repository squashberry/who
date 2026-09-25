$ErrorActionPreference = 'Stop'

Set-Location (Join-Path $PSScriptRoot '')

Write-Host '============================================================'
Write-Host 'WHO CONTROL API — DEPLOYMENT'
Write-Host '============================================================'
Write-Host ''

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    throw 'Node.js / npx is required.'
}

Write-Host '[1/6] Checking Cloudflare authentication...'
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
Write-Host '[2/6] Locating WHO D1 database...'
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

$existing = $items | Where-Object {
    $_.name -eq 'who-db' -or $_.database_name -eq 'who-db'
} | Select-Object -First 1

if ($existing) {
    $dbId = $existing.uuid
    if (-not $dbId) { $dbId = $existing.database_id }
    if (-not $dbId) { $dbId = $existing.id }

    if (-not $dbId) {
        throw 'Found who-db but could not determine its database ID.'
    }

    Write-Host "[OK] Reusing existing who-db: $dbId"
} else {
    Write-Host '[INFO] who-db was not found.'
    Write-Host 'Creating a new WHO D1 database named who-db...'

    $created = npx wrangler d1 create who-db --binding DB 2>&1
    $created | ForEach-Object { Write-Host $_ }

    if ($LASTEXITCODE -ne 0) {
        throw 'D1 database creation failed.'
    }

    $match = ($created | Select-String 'database_id\s*=\s*"([^"]+)"|database_id.?[:=].?([0-9a-f-]{20,})' | Select-Object -First 1)
    if (-not $match) {
        throw 'Could not extract the new D1 database ID. Run "npx wrangler d1 create who-db --binding DB" manually and place the ID in wrangler.toml.'
    }

    $dbId = $match.Matches[0].Groups[1].Value
    if (-not $dbId) { $dbId = $match.Matches[0].Groups[2].Value }
}

$cfg = $cfg -replace 'database_id = "REPLACE_WITH_EXISTING_WHO_D1_DATABASE_ID"', ('database_id = "' + $dbId + '"')
Set-Content -Path $cfgPath -Value $cfg -Encoding UTF8

Write-Host ''
Write-Host '[3/6] Applying D1 migrations...'
npx wrangler d1 migrations apply who-db --remote
if ($LASTEXITCODE -ne 0) {
    throw 'D1 migration failed.'
}

Write-Host ''
Write-Host '[4/6] Generating a new Admin API key...'
$chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
$AdminKey = -join (1..48 | ForEach-Object { $chars[(Get-Random -Minimum 0 -Maximum $chars.Length)] })
$AdminKey | Set-Clipboard

Write-Host ''
Write-Host 'ADMIN API KEY HAS BEEN COPIED TO CLIPBOARD.'
Write-Host 'Paste it into Wrangler when prompted by the next command.'
Write-Host ''

npx wrangler secret put ADMIN_API_KEY
if ($LASTEXITCODE -ne 0) {
    throw 'ADMIN_API_KEY secret setup failed.'
}

Write-Host ''
Write-Host '[5/6] Deploying Worker...'
npx wrangler deploy
if ($LASTEXITCODE -ne 0) {
    throw 'Worker deployment failed.'
}

Write-Host ''
Write-Host '[6/6] Checking Worker health...'
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

Health:
$healthText

The generated ADMIN_API_KEY was copied to the clipboard.
DO NOT commit that key to GitHub.

D1:
who-db
ID:
$dbId
"@

$result | Set-Clipboard

Write-Host ''
Write-Host $result
Write-Host 'Deployment result copied to clipboard.'
