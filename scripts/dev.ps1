#Requires -Version 7.0

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $repoRoot 'frontend'
$backendPort = 8000
$frontendPort = 5173
$uv = Get-Command uv -CommandType Application | Select-Object -First 1
$bun = Get-Command bun -CommandType Application | Select-Object -First 1

if (-not (Test-Path -LiteralPath (Join-Path $frontendRoot 'node_modules/vite/package.json'))) {
    throw 'Frontend dependencies are missing. Run bun install --frozen-lockfile from frontend/.'
}

$listeners = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
foreach ($port in @($backendPort, $frontendPort)) {
    if ($listeners | Where-Object Port -eq $port) {
        throw "Port $port is already in use. Stop its server before running this script."
    }
}

function Start-DevServer {
    param(
        [string] $Executable,
        [string] $Directory,
        [string[]] $Arguments
    )

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new($Executable)
    $startInfo.WorkingDirectory = $Directory
    $startInfo.UseShellExecute = $false
    foreach ($argument in $Arguments) {
        $startInfo.ArgumentList.Add($argument)
    }
    [System.Diagnostics.Process]::Start($startInfo)
}

$servers = [System.Collections.Generic.List[System.Diagnostics.Process]]::new()

try {
    $servers.Add((Start-DevServer -Executable $uv.Source -Directory $repoRoot -Arguments @(
        'run', '--locked', '--all-packages', '--no-env-file', 'uvicorn',
        'backend.app.main:app', '--host', '127.0.0.1', '--port', "$backendPort"
    )))
    $servers.Add((Start-DevServer -Executable $bun.Source -Directory $frontendRoot -Arguments @(
        'run', 'dev', '--port', "$frontendPort"
    )))

    Write-Host "Backend health  http://127.0.0.1:$backendPort/api/v1/health"
    Write-Host "Frontend        http://127.0.0.1:$frontendPort/"
    Write-Host 'Press Ctrl+C to stop both servers.'

    while ($true) {
        foreach ($server in $servers) {
            if ($server.HasExited) {
                throw "A dev server stopped (process $($server.Id), exit code $($server.ExitCode))."
            }
        }
        Start-Sleep -Milliseconds 250
    }
} finally {
    foreach ($server in $servers) {
        try {
            if (-not $server.HasExited) {
                $server.Kill($true)
                if (-not $server.WaitForExit(5000)) {
                    Write-Warning "Dev server process $($server.Id) did not exit."
                }
            }
        } catch [System.InvalidOperationException] {
            if (-not $server.HasExited) {
                Write-Warning "Dev server process $($server.Id) could not be stopped."
            }
        } finally {
            $server.Dispose()
        }
    }
}
