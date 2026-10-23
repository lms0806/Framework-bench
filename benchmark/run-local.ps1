param(
    [ValidateSet('single', 'parallel')][string]$Mode = 'parallel',
    [ValidateRange(1, 1000000)][int]$Rate = 5000,
    [string]$Duration = '20s',
    [ValidateRange(1, 20)][int]$Runs = 3,
    [ValidateRange(1, 128)][int]$Parallelism = 4,
    [int]$WarmupRate = 1000,
    [string]$WarmupDuration = '10s',
    [int]$VUs = 500,
    [ValidateSet('axum', 'springboot', 'nestjs', 'fastapi', 'gin', 'aspnet')][string[]]$Servers = @('axum', 'springboot', 'nestjs', 'fastapi', 'gin', 'aspnet'),
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$K6Path = 'k6'
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
$results = Join-Path $root 'benchmark\results'
New-Item -ItemType Directory -Force -Path $results | Out-Null
if ($Mode -eq 'single') { $Parallelism = 1 }
if (-not $JavaHome -and 'springboot' -in $Servers) { throw 'Set JAVA_HOME or pass -JavaHome for JDK 25.' }
$java = if ($JavaHome) { Join-Path $JavaHome 'bin\java.exe' } else { '' }
$node = if ('nestjs' -in $Servers) { (Get-Command node -ErrorAction Stop).Source } else { '' }
$dotnet = if ('aspnet' -in $Servers) {
    $localDotnet = Join-Path $root 'aspnet\.tools\dotnet\dotnet.exe'
    if (Test-Path $localDotnet) { $localDotnet } else { (Get-Command dotnet -ErrorAction Stop).Source }
} else { '' }
$k6 = (Get-Command $K6Path -ErrorAction Stop).Source
$runId = Get-Date -Format 'yyyyMMdd-HHmmss'
$runDir = Join-Path $results "$runId-$Mode-$Rate"
New-Item -ItemType Directory -Path $runDir | Out-Null
$cases = @(
    @{ Name='axum'; Exe=(Join-Path $root 'axum\target\release\framework-bench-axum.exe'); Arguments=@(); Dir=$root },
    @{ Name='springboot'; Exe=$java; Arguments=@('-jar', (Join-Path $root 'spring-boot\build\libs\spring-boot-bench-0.1.0.jar')); Dir=$root },
    @{ Name='nestjs'; Exe=$node; Arguments=@($(if ($Parallelism -gt 1) { 'dist/cluster.js' } else { 'dist/main.js' })); Dir=(Join-Path $root 'nestjs') },
    @{ Name='fastapi'; Exe=(Join-Path $root 'fastapi\.venv\Scripts\python.exe'); Arguments=@('-m','uvicorn','main:app','--host','127.0.0.1','--port','3000','--no-access-log','--workers',"$Parallelism"); Dir=(Join-Path $root 'fastapi') },
    @{ Name='gin'; Exe=(Join-Path $root 'gin\bin\framework-bench-gin.exe'); Arguments=@(); Dir=$root },
    @{ Name='aspnet'; Exe=$dotnet; Arguments=@((Join-Path $root 'aspnet\bin\Release\net10.0\FrameworkBench.AspNet.dll')); Dir=(Join-Path $root 'aspnet') }
)
$settings = @{ mode=$Mode; rate=$Rate; duration=$Duration; runs=$Runs; parallelism=$Parallelism; warmupRate=$WarmupRate; warmupDuration=$WarmupDuration; vus=$VUs; servers=$Servers; date=(Get-Date -Format o); k6=(& $k6 version | Out-String).Trim() }
$settings | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $runDir 'settings.json')
$env:TOKIO_WORKER_THREADS = "$Parallelism"
$env:SERVER_TOMCAT_THREADS_MAX = "$Parallelism"
$env:SERVER_TOMCAT_THREADS_MIN_SPARE = "$Parallelism"
$env:WEB_CONCURRENCY = "$Parallelism"
$env:GOMAXPROCS = "$Parallelism"
$env:DOTNET_PROCESSOR_COUNT = "$Parallelism"
$env:BIND_ADDR = '127.0.0.1:3000'
$env:SERVER_ADDRESS = '127.0.0.1'
$env:SERVER_PORT = '3000'
$env:HOST = '127.0.0.1'
$env:PORT = '3000'
$env:BASE_URL = 'http://127.0.0.1:3000'
foreach ($case in ($cases | Where-Object { $_.Name -in $Servers })) {
    Write-Output "START $($case.Name)"
    $proc = $null
    $stdout = Join-Path $runDir "$($case.Name)-server.out.log"
    $stderr = Join-Path $runDir "$($case.Name)-server.err.log"
    try {
        if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 3000 is already in use.' }
        $proc = Start-Process -FilePath $case.Exe -ArgumentList $case.Arguments -WorkingDirectory $case.Dir -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
        $ready = $false
        for ($i = 0; $i -lt 180; $i++) {
            if ($proc.HasExited) { throw "Server exited: $($case.Name); see $stderr" }
            try {
                $response = Invoke-WebRequest 'http://127.0.0.1:3000/health' -TimeoutSec 1
                $allReady = $true
                if ($case.Name -eq 'nestjs' -and $Parallelism -gt 1) { $allReady = (Get-Content $stdout -Raw -ErrorAction SilentlyContinue) -match "Cluster ready: $Parallelism workers" }
                if ($case.Name -eq 'fastapi' -and $Parallelism -gt 1) { $allReady = @((Select-String -Path $stderr -Pattern 'Application startup complete' -ErrorAction SilentlyContinue)).Count -ge $Parallelism }
                if ($response.Content -eq 'OK' -and $allReady) { $ready = $true; break }
            } catch { }
            Start-Sleep -Milliseconds 250
        }
        if (-not $ready) { throw "Server did not start all workers: $($case.Name)" }
        foreach ($endpoint in @('plaintext','json','json-large','aggregate')) {
            & $k6 run --quiet -e "ENDPOINT=$endpoint" -e "RATE=$WarmupRate" -e "DURATION=$WarmupDuration" -e "PRE_ALLOCATED_VUS=$VUs" -e "MAX_VUS=$VUs" benchmark/load.js *> (Join-Path $runDir "$($case.Name)-$endpoint-warmup.log")
            if ($LASTEXITCODE -ne 0) { Write-Output "WARMUP FAILURE $($case.Name) $endpoint exit=$LASTEXITCODE" }
            for ($run = 1; $run -le $Runs; $run++) {
                $name = "$($case.Name)-$endpoint-run$run"
                & $k6 run --quiet -e "ENDPOINT=$endpoint" -e "RATE=$Rate" -e "DURATION=$Duration" -e "PRE_ALLOCATED_VUS=$VUs" -e "MAX_VUS=$VUs" --summary-export (Join-Path $runDir "$name.json") benchmark/load.js *> (Join-Path $runDir "$name.log")
                if (-not (Test-Path (Join-Path $runDir "$name.json"))) { throw "No summary produced: $name (exit $LASTEXITCODE)" }
                if ($LASTEXITCODE -ne 0) { Write-Output "THRESHOLD FAILURE $name exit=$LASTEXITCODE" }
                Write-Output "DONE $name"
            }
        }
    } finally {
        if ($null -ne $proc -and -not $proc.HasExited) {
            & taskkill.exe /PID $proc.Id /T /F 2>&1 | Out-Null
        }
    }
}
Write-Output "RESULTS $runDir"
