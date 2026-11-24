<#
.SYNOPSIS
  Verifikasi koneksi ke BC sandbox: ambil token (client credentials) lalu GET companies. READ-ONLY.
.NOTES
  Membaca variabel dari file .env di root repo. Tidak mencetak secret/token.
#>
$ErrorActionPreference = 'Stop'

$envFile = Join-Path $PSScriptRoot '..\..\.env'
if (-not (Test-Path $envFile)) { throw ".env tidak ditemukan. Salin dari .env.example dan isi nilainya." }

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$' -and -not $_.TrimStart().StartsWith('#')) {
        [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim('"'), 'Process')
    }
}

foreach ($name in 'BC_TENANT_ID','BC_CLIENT_ID','BC_CLIENT_SECRET','BC_ENVIRONMENT') {
    if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) { throw "Variabel $name kosong di .env" }
}

$tenant = $env:BC_TENANT_ID
$bcEnv  = $env:BC_ENVIRONMENT

Write-Host "1) Mengambil token dari Entra ID..."
$tokenResponse = Invoke-RestMethod -Method Post `
    -Uri "https://login.microsoftonline.com/$tenant/oauth2/v2.0/token" `
    -ContentType 'application/x-www-form-urlencoded' `
    -Body @{
        grant_type    = 'client_credentials'
        client_id     = $env:BC_CLIENT_ID
        client_secret = $env:BC_CLIENT_SECRET
        scope         = 'https://api.businesscentral.dynamics.com/.default'
    }
Write-Host "   Token diterima (panjang: $($tokenResponse.access_token.Length) karakter, tidak ditampilkan)."

Write-Host "2) GET companies dari environment '$bcEnv'..."
$uri = "https://api.businesscentral.dynamics.com/v2.0/$tenant/$bcEnv/api/v2.0/companies"
$result = Invoke-RestMethod -Method Get -Uri $uri -Headers @{ Authorization = "Bearer $($tokenResponse.access_token)" }

$result.value | Select-Object id, name, displayName | Format-Table -AutoSize
Write-Host "Berhasil. Jumlah company: $($result.value.Count)"
