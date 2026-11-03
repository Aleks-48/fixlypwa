# START-001..007: local backend for the website, installed mobile app and Telegram.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$webRoot = Split-Path $PSScriptRoot -Parent
$repoRoot = Split-Path $webRoot -Parent
$runRoot = Join-Path $repoRoot '.local-run'
$launchLock = $null
Set-Location -LiteralPath $webRoot

function Run-Step {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $Program (exit $LASTEXITCODE)." }
}
function Wait-Ready {
    param([string]$Label, [scriptblock]$Condition, [int]$Seconds)
    $deadline = (Get-Date).AddSeconds($Seconds)
    $nextNotice = Get-Date
    while (-not (& $Condition)) {
        if ((Get-Date) -ge $deadline) { throw "Timeout waiting for $Label. See $runRoot logs." }
        if ((Get-Date) -ge $nextNotice) {
            Write-Host "Waiting for $Label..."
            $nextNotice = (Get-Date).AddSeconds(20)
        }
        Start-Sleep -Seconds 3
    }
}
function Docker-Ready {
    try { & docker info --format '{{.ServerVersion}}' *> $null; return $LASTEXITCODE -eq 0 }
    catch { return $false }
}
function Stop-ProjectNext {
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue)
    $nextPath = Join-Path $webRoot 'node_modules\next\'
    foreach ($listener in ($listeners | Sort-Object OwningProcess -Unique)) {
        $child = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
        if (-not $child -or $child.Name -ne 'node.exe' -or
            -not $child.CommandLine -or $child.CommandLine.IndexOf($nextPath, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
            throw 'Port 3000 is occupied by another process; stop it manually or close that project.'
        }
        $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($child.ParentProcessId)"
        if ($parent -and $parent.Name -eq 'node.exe' -and $parent.CommandLine -and
            $parent.CommandLine.IndexOf($nextPath, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
            Stop-Process -Id $parent.ProcessId -ErrorAction SilentlyContinue
        }
        Stop-Process -Id $child.ProcessId -ErrorAction SilentlyContinue
    }
    Wait-Ready 'port 3000 to become free' {
        return -not (Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue)
    } 30
}
function Find-Tunnel {
    try {
        $response = Invoke-RestMethod 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 5
        return $response.tunnels | Where-Object {
            $_.proto -eq 'https' -and
            $_.config.addr -match '^(3000|(http://)?(localhost|127\.0\.0\.1|\[::1\]):3000/?)$'
        } | Select-Object -First 1
    } catch { return $null }
}

try {
    New-Item -ItemType Directory -Force -Path $runRoot | Out-Null
    try {
        $launchLock = [IO.File]::Open((Join-Path $runRoot 'launch.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    } catch { throw 'Another Fixly launcher is already running.' }
    foreach ($command in @('node.exe', 'npm.cmd', 'docker')) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "Install $command and reopen the launcher." }
    }
    if (-not (Test-Path -LiteralPath (Join-Path $webRoot '.env'))) { throw 'Configure web/.env first.' }
    if (-not (Test-Path -LiteralPath (Join-Path $webRoot 'node_modules'))) { Run-Step 'npm.cmd' @('ci') }
    $nodeExe = (Get-Command node.exe).Source
    $configScript = Join-Path $PSScriptRoot 'launcher-config.mjs'
    Run-Step $nodeExe @($configScript, 'preflight')
    $ngrokExe = Join-Path $webRoot 'ngrok.exe'
    $ngrokConfig = Join-Path $webRoot 'ngrok.yml'
    if (-not (Test-Path -LiteralPath $ngrokExe) -or -not (Test-Path -LiteralPath $ngrokConfig)) {
        throw 'Add web/ngrok.exe and configure web/ngrok.yml using ngrok.example.yml.'
    }

    Write-Host '[1/6] Docker and PostgreSQL'
    if (-not (Docker-Ready)) {
        $desktop = @(
            (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe'),
            (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe')
        ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
        if (-not $desktop) { throw 'Start Docker Desktop and retry.' }
        Start-Process -FilePath $desktop -WindowStyle Hidden
    }
    Wait-Ready 'Docker Desktop' { Docker-Ready } 600
    Run-Step 'docker' @('compose', 'up', '-d', 'postgres')
    $dbContainer = (& docker compose ps -q postgres | Select-Object -First 1)
    if (-not $dbContainer) { throw 'PostgreSQL container not found.' }
    Wait-Ready 'PostgreSQL' {
        $state = & docker inspect --format '{{.State.Health.Status}}' $dbContainer 2>$null
        return $state -eq 'healthy'
    } 180

    Write-Host '[2/6] Backup and database migrations'
    Stop-ProjectNext
    $backupRoot = Join-Path $repoRoot '.local-backups'
    New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
    $backupName = 'fixly-launch-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.dump'
    Run-Step 'docker' @('exec', $dbContainer, 'sh', '-c', 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/fixly-launch.dump')
    Run-Step 'docker' @('cp', "${dbContainer}:/tmp/fixly-launch.dump", (Join-Path $backupRoot $backupName))
    foreach ($source in @(
        @{ Path = (Join-Path $webRoot 'storage\uploads'); Label = 'private-uploads' },
        @{ Path = (Join-Path $webRoot 'public\uploads'); Label = 'legacy-uploads' }
    )) {
        if (Test-Path -LiteralPath $source.Path) {
            $archive = Join-Path $backupRoot ($backupName + '.' + $source.Label + '.zip')
            Compress-Archive -LiteralPath $source.Path -DestinationPath $archive -CompressionLevel Fastest
        }
    }
    $prismaCli = Join-Path $webRoot 'node_modules\prisma\build\index.js'
    Run-Step $nodeExe @($prismaCli, 'migrate', 'deploy')
    Run-Step $nodeExe @($prismaCli, 'generate')
    Run-Step $nodeExe @((Join-Path $webRoot 'node_modules\tsx\dist\cli.mjs'), (Join-Path $webRoot 'scripts\db-bootstrap.ts'))
    Run-Step $nodeExe @((Join-Path $webRoot 'node_modules\tsx\dist\cli.mjs'), (Join-Path $webRoot 'scripts\check-schema.ts'))

    Write-Host '[3/6] ngrok tunnel'
    $tunnel = Find-Tunnel
    if (-not $tunnel) {
        if (Get-NetTCPConnection -State Listen -LocalPort 4040 -ErrorAction SilentlyContinue) {
            throw 'Port 4040 is occupied, but no tunnel to localhost:3000 was found. Close the other ngrok instance.'
        }
        $ngrokProcess = Start-Process -FilePath $ngrokExe -WorkingDirectory $webRoot -WindowStyle Hidden -PassThru `
            -ArgumentList 'start frontend --config ngrok.yml --log stdout --log-format json' `
            -RedirectStandardOutput (Join-Path $runRoot 'ngrok.log') -RedirectStandardError (Join-Path $runRoot 'ngrok-error.log')
        Wait-Ready 'ngrok' {
            if ($ngrokProcess.HasExited) { throw 'ngrok exited. See .local-run/ngrok-error.log.' }
            return $null -ne (Find-Tunnel)
        } 90
        $tunnel = Find-Tunnel
    }
    $publicUrl = $tunnel.public_url.TrimEnd('/')
    Run-Step $nodeExe @($configScript, 'configure', $publicUrl)

    Write-Host '[4/6] Next.js website and mobile API'
    $nextCli = Join-Path $webRoot 'node_modules\next\dist\bin\next'
    $nextProcess = Start-Process -FilePath $nodeExe -WorkingDirectory $webRoot -WindowStyle Hidden -PassThru `
        -ArgumentList "`"$nextCli`" dev --hostname 127.0.0.1 --port 3000" `
        -RedirectStandardOutput (Join-Path $runRoot 'website.log') -RedirectStandardError (Join-Path $runRoot 'website-error.log')
    Wait-Ready 'website/database health' {
        if ($nextProcess.HasExited) { throw 'Next.js exited. See .local-run/website-error.log.' }
        try { return (Invoke-RestMethod 'http://127.0.0.1:3000/api/health' -TimeoutSec 15).data.db -eq 'up' }
        catch { return $false }
    } 300

    Write-Host '[5/6] Telegram webhook'
    Run-Step $nodeExe @($configScript, 'webhook', $publicUrl)
    Write-Host '[6/6] Ready'
    Write-Host 'Website: http://127.0.0.1:3000'
    Write-Host "Mobile API / public website: $publicUrl"
    Write-Host 'Open the installed mobile app. Its compiled API URL must match the address above.'
    Write-Host "Services keep running after this window closes. Logs: $runRoot"
} catch {
    Write-Host "START FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Already started services remain running. Logs: $runRoot"
    exit 1
} finally {
    if ($launchLock) { $launchLock.Dispose() }
}
