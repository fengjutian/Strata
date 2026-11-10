#Requires -Version 5.1
<#
.SYNOPSIS
    一键在本机启动 Strata 开发环境，不使用 Docker。

.DESCRIPTION
    启动链路：
      1. 生成 .env（根目录与 apps/*），补齐 SECRET_KEY、数据库、对象存储配置；
      2. 用本机 PostgreSQL 二进制在 .local/pgdata 起一个私有集群（默认端口 55432），
         不碰你已有的 PostgreSQL 服务，也不需要它的密码；
      3. uv sync + migrate + 实例初始化，后台启动 Django（localhost:8010）；
      4. 后台启动前端（web:3000、admin:3001、space:3002）。

    Redis / MinIO 是可选的：本机有 redis-server.exe 或 minio.exe（在 PATH 或
    .local\bin\ 下）就自动拉起，没有则降级运行（缓存用进程内存，附件上传不可用）。
    RabbitMQ 不需要：Celery 走 memory broker，后台任务不会执行。

    日志：.local\logs\     进程号：.local\pids\     数据库：.local\pgdata\

.PARAMETER Stop
    停止本脚本启动的全部进程（含私有 PostgreSQL 集群）。

.PARAMETER Status
    只查看当前运行状态，不做任何改动。

.PARAMETER ResetDb
    删除并重建 .local\pgdata（本地数据会丢失）。

.PARAMETER SkipApi
    只启动前端（不启动数据库和 Django）。

.PARAMETER SkipFrontend
    只启动数据库和 Django。

.PARAMETER Apps
    要启动的前端应用，默认 web、admin、space。live 需要 Redis，请在确认本机有
    redis-server 后再加：-Apps web,admin,space,live

.PARAMETER DatabaseUrl
    使用已有的数据库连接串，跳过私有集群。例如
    -DatabaseUrl "postgresql://strata:strata@127.0.0.1:5432/strata"

.PARAMETER PgPort
    私有 PostgreSQL 集群端口，默认 55432（避开本机常见的 5432）。

.PARAMETER Mirror
    首次 uv sync 走清华 PyPI 镜像，国内网络下通常快很多。

.PARAMETER ApiPort
    Django 监听端口，默认 8010。脚本会把这个端口同步写进各前端应用的 .env
    （VITE_API_BASE_URL / API_BASE_URL），前端不需要手工改。

.PARAMETER Detach
    启动成功后直接返回，不进入交互监控。默认会持续显示 API/前端日志，并提供快捷键操作。

.EXAMPLE
    .\local-dev.ps1
    启动全部（数据库 + API + 前端）。

.EXAMPLE
    .\local-dev.ps1 -ResetDb
    重建本地数据库后启动。

.EXAMPLE
    .\local-dev.ps1 -Status
    .\local-dev.ps1 -Stop
#>
[CmdletBinding()]
param(
    [switch]$Stop,
    [switch]$Status,
    [switch]$ResetDb,
    [switch]$Mirror,
    [switch]$SkipApi,
    [switch]$SkipFrontend,
    [switch]$Detach,
    [string[]]$Apps = @("web", "admin", "space"),
    [string]$DatabaseUrl = $env:STRATA_DATABASE_URL,
    [int]$PgPort = 55432,
    [int]$ApiPort = 8010
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$LocalDir = Join-Path $Root ".local"
$LogDir = Join-Path $LocalDir "logs"
$PidDir = Join-Path $LocalDir "pids"
$BinDir = Join-Path $LocalDir "bin"
$PgData = Join-Path $LocalDir "pgdata"
$PgLog = Join-Path $LogDir "postgres.log"
$ApiDir = Join-Path $Root "apps\api"
$ApiEnv = Join-Path $ApiDir ".env"
$SettingsModule = "strata.settings.local_native"

$PgUser = "strata"
$PgPassword = "strata"
$PgDatabase = "strata"
$RedisPort = 6379
$MinioPort = 9000

$AppPorts = @{ web = 3000; admin = 3001; space = 3002; live = 3100 }

# ---------------------------------------------------------------- 输出工具

function Write-Step([string]$Message) { Write-Host "`n==> $Message" -ForegroundColor Cyan }
function Write-Ok([string]$Message) { Write-Host "  [ok]   $Message" -ForegroundColor Green }
function Write-Warn([string]$Message) { Write-Host "  [warn] $Message" -ForegroundColor Yellow }
function Write-Bad([string]$Message) { Write-Host "  [fail] $Message" -ForegroundColor Red }
function Stop-With([string]$Message) {
    Write-Bad $Message
    Write-Host ""
    exit 1
}

# ---------------------------------------------------------------- 基础工具

function Test-Port([int]$Port, [string]$TargetHost = "127.0.0.1", [int]$TimeoutMs = 500) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($TargetHost, $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs)) { return $false }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Wait-Port([int]$Port, [int]$TimeoutSeconds = 60, [string]$What = "服务") {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-Port -Port $Port) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

function Import-DotEnv([string]$Path) {
    if (-not (Test-Path $Path)) { return }
    foreach ($line in Get-Content -Path $Path -Encoding utf8) {
        $text = $line.Trim()
        if (-not $text -or $text.StartsWith("#")) { continue }
        $index = $text.IndexOf("=")
        if ($index -lt 1) { continue }
        $key = $text.Substring(0, $index).Trim()
        $value = $text.Substring($index + 1).Trim()
        if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
            $value = $value.Substring(1, $value.Length - 2)
        } elseif ($value.StartsWith("'") -and $value.EndsWith("'") -and $value.Length -ge 2) {
            $value = $value.Substring(1, $value.Length - 2)
        } else {
            # 去掉未加引号值的行内注释，例如 `DOCKERIZED=1  # deprecated`
            $comment = $value.IndexOf(" #")
            if ($comment -ge 0) { $value = $value.Substring(0, $comment).Trim() }
        }
        [Environment]::SetEnvironmentVariable($key, $value)
    }
}

function Set-EnvValue([string]$Path, [string]$Key, [string]$Value) {
    $lines = @()
    if (Test-Path $Path) { $lines = @(Get-Content -Path $Path -Encoding utf8) }
    $pattern = "^\s*" + [regex]::Escape($Key) + "\s*="
    $written = $false
    $changed = $false
    $result = foreach ($line in $lines) {
        if ($line -match $pattern) {
            if (-not $written) {
                $existing = ($line -split "=", 2)[1].Trim().Trim('"')
                if ($existing -ne $Value) { $changed = $true }
                "$Key=`"$Value`""
                $written = $true
            }
            continue
        }
        $line
    }
    $result = @($result)
    if (-not $written) {
        $result += "$Key=`"$Value`""
        $changed = $true
    }
    Save-Utf8NoBom -Path $Path -Lines $result
    return $changed
}

function Save-Utf8NoBom([string]$Path, [string[]]$Lines) {
    $text = ($Lines -join "`r`n") + "`r`n"
    [System.IO.File]::WriteAllText($Path, $text, (New-Object System.Text.UTF8Encoding($false)))
}

# 调用原生程序。PowerShell 5.1 在 $ErrorActionPreference = 'Stop' 时会把原生程序的
# stderr 当成致命错误（uv、psql、pg_ctl 都会往 stderr 写正常进度），所以这里临时
# 降级为 Continue，只用退出码判断成败。
function Invoke-NativeCapture([string]$FilePath, [string[]]$Arguments) {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = & $FilePath @Arguments 2>&1
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previous
    }
    return @{ ExitCode = $code; Output = (($output | Out-String).Trim()) }
}

function Invoke-NativeStream([string]$FilePath, [string[]]$Arguments, [string]$LogPath = $null) {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        if ($LogPath) {
            & $FilePath @Arguments 2>&1 | Tee-Object -FilePath $LogPath | ForEach-Object { Write-Host $_ }
            $code = $LASTEXITCODE
        } else {
            & $FilePath @Arguments
            $code = $LASTEXITCODE
        }
    } finally {
        $ErrorActionPreference = $previous
    }
    return $code
}

function Write-LogTail([string]$Path, [int]$LineCount = 25) {
    if (-not (Test-Path $Path)) { return }
    $tail = Get-Content -Path $Path -Encoding utf8 -Tail $LineCount
    Write-Host "  ---- $([IO.Path]::GetFileName($Path)) 最后 $LineCount 行 ----" -ForegroundColor DarkGray
    foreach ($line in $tail) { Write-Host "  $line" -ForegroundColor DarkGray }
}

function New-RandomString([int]$Length) {
    $alphabet = "abcdefghijklmnopqrstuvwxyz0123456789".ToCharArray()
    $chars = for ($i = 0; $i -lt $Length; $i++) { $alphabet | Get-Random }
    return -join $chars
}

function Get-CommandPath([string]$Name) {
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    return $null
}

function Find-Tool([string]$Name) {
    $local = Join-Path $BinDir $Name
    if (Test-Path $local) { return $local }
    return Get-CommandPath $Name
}

function Start-Background {
    param(
        [string]$Name,
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory,
        [hashtable]$Environment = @{}
    )
    $stdout = Join-Path $LogDir "$Name.log"
    $stderr = Join-Path $LogDir "$Name.err.log"
    $original = @{}
    foreach ($key in $Environment.Keys) {
        $original[$key] = [Environment]::GetEnvironmentVariable($key)
        [Environment]::SetEnvironmentVariable($key, $Environment[$key])
    }
    try {
        $process = Start-Process -FilePath $FilePath -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory `
            -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden -PassThru
    } finally {
        foreach ($key in $original.Keys) {
            [Environment]::SetEnvironmentVariable($key, $original[$key])
        }
    }
    Set-Content -Path (Join-Path $PidDir "$Name.pid") -Value $process.Id -Encoding ascii
    return $process
}

function Stop-Background([string]$Name) {
    $pidFile = Join-Path $PidDir "$Name.pid"
    if (-not (Test-Path $pidFile)) { return }
    $processId = (Get-Content -Path $pidFile -Encoding ascii | Select-Object -First 1).Trim()
    if ($processId) {
        $null = Invoke-NativeCapture "taskkill.exe" @("/PID", "$processId", "/T", "/F")
    }
    Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
}

function Get-RunningPid([string]$Name) {
    $pidFile = Join-Path $PidDir "$Name.pid"
    if (-not (Test-Path $pidFile)) { return $null }
    $processId = (Get-Content -Path $pidFile -Encoding ascii | Select-Object -First 1).Trim()
    if (-not $processId) { return $null }
    if (Get-Process -Id $processId -ErrorAction SilentlyContinue) { return $processId }
    return $null
}

# ---------------------------------------------------------------- PostgreSQL

function Get-PgBin {
    $candidates = @()
    $installRoot = "C:\Program Files\PostgreSQL"
    if (Test-Path $installRoot) {
        $candidates += Get-ChildItem -Path $installRoot -Directory |
            Sort-Object -Property { try { [version]$_.Name } catch { [version]"0.0" } } -Descending |
            ForEach-Object { Join-Path $_.FullName "bin" }
    }
    $onPath = Get-CommandPath "pg_ctl.exe"
    if ($onPath) { $candidates += (Split-Path -Parent $onPath) }
    foreach ($bin in $candidates) {
        if (Test-Path (Join-Path $bin "pg_ctl.exe")) { return $bin }
    }
    return $null
}

function Test-PgClusterRunning([string]$PgBin) {
    if (-not (Test-Path (Join-Path $PgData "PG_VERSION"))) { return $false }
    $result = Invoke-NativeCapture (Join-Path $PgBin "pg_isready.exe") @("-h", "127.0.0.1", "-p", "$PgPort", "-U", $PgUser, "-d", "postgres")
    return $result.ExitCode -eq 0
}

# 端口可连通 ≠ 数据库可用：postmaster 会先监听、再做崩溃恢复，这期间连接会报
# "the database system is starting up"。必须用 pg_isready 轮询到真正可接受连接。
function Wait-PgReady([string]$PgBin, [int]$TimeoutSeconds = 60) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $result = Invoke-NativeCapture (Join-Path $PgBin "pg_isready.exe") @("-h", "127.0.0.1", "-p", "$PgPort", "-U", $PgUser, "-d", "postgres")
        if ($result.ExitCode -eq 0) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

# 强制停掉本仓库的集群：先正常停，不行再按 postmaster.pid 里的 PID 杀进程树。
# 处理"postmaster 还在监听但已经不响应查询"的僵死状态（例如同时起了两个 postmaster）。
function Stop-PgClusterForce([string]$PgBin) {
    $pgCtl = Join-Path $PgBin "pg_ctl.exe"
    $null = Invoke-NativeCapture $pgCtl @("-D", $PgData, "-m", "immediate", "stop")
    Start-Sleep -Milliseconds 700
    if (-not (Test-Port -Port $PgPort)) {
        Remove-Item (Join-Path $PgData "postmaster.pid") -Force -ErrorAction SilentlyContinue
        return
    }
    $pidFile = Join-Path $PgData "postmaster.pid"
    if (Test-Path $pidFile) {
        $staleId = (Get-Content -Path $pidFile -TotalCount 1 -Encoding ascii).Trim()
        if ($staleId -match "^\d+$") {
            $null = Invoke-NativeCapture "taskkill.exe" @("/PID", $staleId, "/T", "/F")
        }
    }
    Start-Sleep -Milliseconds 700
    if (-not (Test-Port -Port $PgPort)) {
        Remove-Item (Join-Path $PgData "postmaster.pid") -Force -ErrorAction SilentlyContinue
    }
}

function Start-PgServer([string]$PgBin) {
    $pgCtl = Join-Path $PgBin "pg_ctl.exe"
    # 用 Start-Process 而不是 `& pg_ctl ... *> $null`：postgres 后台进程会继承
    # pg_ctl 的输出管道，管道不关闭会把 PowerShell 卡住。也不能加 -Wait：它会
    # 连 postgres 子进程一起等，脚本同样会挂住。所以只轮询端口。
    $startArgs = '-D "{0}" -o "-p {1}" -l "{2}" -w start' -f $PgData, $PgPort, $PgLog
    $null = Start-Process -FilePath $pgCtl -ArgumentList $startArgs -NoNewWindow -PassThru `
        -RedirectStandardOutput (Join-Path $LogDir "pg-start.log") `
        -RedirectStandardError (Join-Path $LogDir "pg-start.err.log")
    return (Wait-Port -Port $PgPort -TimeoutSeconds 45)
}

function Start-PgCluster([string]$PgBin) {
    if ($ResetDb -and (Test-Path $PgData)) {
        if (Test-Port -Port $PgPort) { Stop-PgClusterForce $PgBin }
        Remove-Item -Path $PgData -Recurse -Force
        Write-Ok "已清空 .local\pgdata"
    }

    if (-not (Test-Path (Join-Path $PgData "PG_VERSION"))) {
        Write-Step "初始化私有 PostgreSQL 集群（.local\pgdata，端口 $PgPort）"
        New-Item -ItemType Directory -Force -Path $LocalDir | Out-Null
        $pwFile = Join-Path $LocalDir "pg-init-password.txt"
        Set-Content -Path $pwFile -Value $PgPassword -NoNewline -Encoding ascii
        try {
            $init = Invoke-NativeCapture (Join-Path $PgBin "initdb.exe") @(
                "-D", $PgData, "-U", $PgUser, "-A", "scram-sha-256", "--pwfile=$pwFile", "-E", "UTF8", "--locale=C"
            )
        } finally {
            Remove-Item -Path $pwFile -Force -ErrorAction SilentlyContinue
        }
        if ($init.ExitCode -ne 0) {
            Stop-With "initdb 失败：$($init.Output)`n可改用已有数据库：.\local-dev.ps1 -DatabaseUrl `"postgresql://user:pass@127.0.0.1:5432/strata`""
        }
        Write-Ok "集群已初始化"
    }

    if (Wait-PgReady $PgBin 2) {
        Write-Ok "PostgreSQL 已在运行（端口 $PgPort）"
    } else {
        if (Test-Port -Port $PgPort) {
            Write-Warn "端口 $PgPort 有监听但数据库不响应（僵死或重复启动），强制重启本地集群"
            Stop-PgClusterForce $PgBin
            if (Test-Port -Port $PgPort) {
                Stop-With "端口 $PgPort 被其它程序占用。请先释放它，或改用 -PgPort 指定其它端口。"
            }
        }
        Write-Step "启动 PostgreSQL（端口 $PgPort）"
        if (-not (Start-PgServer $PgBin)) {
            Stop-With "PostgreSQL 启动失败，详见 $PgLog"
        }
        if (-not (Wait-PgReady $PgBin 90)) {
            Write-Warn "数据库未就绪，强制重启一次"
            Stop-PgClusterForce $PgBin
            if (-not (Start-PgServer $PgBin) -or -not (Wait-PgReady $PgBin 90)) {
                Stop-With "PostgreSQL 仍无法就绪，建议重建本地集群：.\local-dev.ps1 -ResetDb（详见 $PgLog）"
            }
        }
    }
    Write-Ok "PostgreSQL 已就绪（端口 $PgPort）"

    $env:PGPASSWORD = $PgPassword
    try {
        $psql = Join-Path $PgBin "psql.exe"
        $exists = Invoke-NativeCapture $psql @("-h", "127.0.0.1", "-p", "$PgPort", "-U", $PgUser, "-d", "postgres", "-tAc", "SELECT 1 FROM pg_database WHERE datname = '$PgDatabase'")
        if ($exists.Output.Trim() -ne "1") {
            $created = Invoke-NativeCapture (Join-Path $PgBin "createdb.exe") @("-h", "127.0.0.1", "-p", "$PgPort", "-U", $PgUser, $PgDatabase)
            if ($created.ExitCode -ne 0 -and $created.Output -notmatch "already exists") {
                Stop-With "创建数据库 $PgDatabase 失败：$($created.Output)"
            }
            Write-Ok "数据库 $PgDatabase 已创建"
        } else {
            Write-Ok "数据库 $PgDatabase 已存在"
        }
    } finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# ---------------------------------------------------------------- 状态 / 停止

function Show-Status {
    Write-Step "服务状态"

    $pgBin = Get-PgBin
    if ($DatabaseUrl) {
        Write-Host "  数据库：使用外部连接串（$DatabaseUrl）"
    } elseif ($pgBin -and (Test-PgClusterRunning $pgBin)) {
        Write-Ok "PostgreSQL 运行中（127.0.0.1:$PgPort）"
    } else {
        Write-Warn "PostgreSQL 未运行"
    }

    foreach ($entry in @(
            @{ Name = "api"; Label = "Django API"; Port = $ApiPort },
            @{ Name = "frontend"; Label = "前端"; Port = 0 }
        )) {
        $processId = Get-RunningPid $entry.Name
        if ($processId) {
            Write-Ok "$($entry.Label) 运行中（PID $processId）"
        } else {
            Write-Warn "$($entry.Label) 未运行"
        }
    }

    foreach ($app in $Apps) {
        if (-not $AppPorts.ContainsKey($app)) { continue }
        $port = $AppPorts[$app]
        if (Test-Port -Port $port) {
            Write-Ok "$app 监听 http://localhost:$port"
        } else {
            Write-Warn "$app 未监听 $port"
        }
    }

    if (Test-Port -Port $ApiPort) { Write-Ok "API 监听 http://localhost:$ApiPort" }
    Write-Host "`n日志目录：$LogDir"
}

function Invoke-StopAll {
    Write-Step "停止本地开发环境"
    foreach ($name in @("frontend", "api", "minio", "redis")) {
        if (Get-RunningPid $name) {
            Stop-Background $name
            Write-Ok "$name 已停止"
        }
    }
    $pgBin = Get-PgBin
    if ($pgBin -and (Test-Path (Join-Path $PgData "PG_VERSION"))) {
        Stop-PgClusterForce $pgBin
        if (-not (Test-Port -Port $PgPort)) {
            Write-Ok "PostgreSQL 已停止"
        } else {
            Write-Warn "端口 $PgPort 仍被占用，可能不是本脚本启动的实例"
        }
    }
    Write-Host ""
}

function Start-InteractiveMonitor {
    $streams = @()
    foreach ($entry in @(
            @{ Name = "API"; Path = (Join-Path $LogDir "api.log"); Color = "Gray" },
            @{ Name = "API 错误"; Path = (Join-Path $LogDir "api.err.log"); Color = "Red" },
            @{ Name = "前端"; Path = (Join-Path $LogDir "frontend.log"); Color = "Gray" },
            @{ Name = "前端错误"; Path = (Join-Path $LogDir "frontend.err.log"); Color = "Red" }
        )) {
        if (-not (Test-Path $entry.Path)) { New-Item -ItemType File -Path $entry.Path -Force | Out-Null }
        $fileStream = [IO.File]::Open($entry.Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
        $null = $fileStream.Seek(0, [IO.SeekOrigin]::End)
        $streams += @{
            Name = $entry.Name
            Color = $entry.Color
            Stream = $fileStream
            Reader = New-Object IO.StreamReader($fileStream, [Text.Encoding]::UTF8)
        }
    }

    Write-Host ""
    Write-Host "开发环境正在运行，下面会实时显示新增日志。" -ForegroundColor Green
    Write-Host "  [O] 打开主应用  [S] 查看状态  [L] 打开日志目录  [Q] 退出监控（服务继续）  [X] 停止全部服务" -ForegroundColor Cyan
    Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

    $lastApiState = [bool](Get-RunningPid "api")
    $lastFrontendState = [bool](Get-RunningPid "frontend")
    $nextHealthCheck = (Get-Date).AddSeconds(5)

    try {
        while ($true) {
            foreach ($stream in $streams) {
                while ($stream.Reader.Peek() -ge 0) {
                    $line = $stream.Reader.ReadLine()
                    if ($null -ne $line) { Write-Host "[$($stream.Name)] $line" -ForegroundColor $stream.Color }
                }
            }

            if ((Get-Date) -ge $nextHealthCheck) {
                $apiState = [bool](Get-RunningPid "api")
                $frontendState = [bool](Get-RunningPid "frontend")
                if ($apiState -ne $lastApiState) {
                    if ($apiState) { Write-Ok "Django API 已恢复运行" } else { Write-Bad "Django API 已退出，请查看 api.err.log" }
                    $lastApiState = $apiState
                }
                if ($frontendState -ne $lastFrontendState) {
                    if ($frontendState) { Write-Ok "前端已恢复运行" } else { Write-Bad "前端已退出，请查看 frontend.err.log" }
                    $lastFrontendState = $frontendState
                }
                $nextHealthCheck = (Get-Date).AddSeconds(5)
            }

            if ([Console]::KeyAvailable) {
                $key = [Console]::ReadKey($true).Key
                switch ($key) {
                    "O" { Start-Process "http://localhost:3000" }
                    "S" { Show-Status }
                    "L" { Start-Process "explorer.exe" -ArgumentList $LogDir }
                    "Q" {
                        Write-Host "`n已退出监控，开发服务仍在后台运行。使用 .\local-dev.ps1 -Stop 停止。" -ForegroundColor Yellow
                        return
                    }
                    "X" {
                        Write-Host ""
                        Invoke-StopAll
                        return
                    }
                }
            }
            Start-Sleep -Milliseconds 200
        }
    } finally {
        foreach ($stream in $streams) {
            $stream.Reader.Dispose()
            $stream.Stream.Dispose()
        }
    }
}

# ---------------------------------------------------------------- 主流程

New-Item -ItemType Directory -Force -Path $LocalDir, $LogDir, $PidDir, $BinDir | Out-Null

if ($Stop) {
    Invoke-StopAll
    return
}

if ($Status) {
    Show-Status
    return
}

Write-Host ""
Write-Host "Strata 本地开发环境（不使用 Docker）" -ForegroundColor Magenta
Write-Host "仓库：$Root"

# 1. 环境变量文件
Write-Step "准备 .env 文件"
$envTargets = @(
    $Root,
    (Join-Path $Root "apps\web"),
    (Join-Path $Root "apps\admin"),
    (Join-Path $Root "apps\space"),
    (Join-Path $Root "apps\live"),
    $ApiDir
)
foreach ($dir in $envTargets) {
    $example = Join-Path $dir ".env.example"
    $target = Join-Path $dir ".env"
    if ((Test-Path $example) -and -not (Test-Path $target)) {
        Copy-Item -Path $example -Destination $target
        Write-Ok "生成 $(Resolve-Path -Relative $target)"
    }
}
if (-not (Test-Path $ApiEnv)) { Stop-With "缺少 apps\api\.env（模板 .env.example 不存在？）" }

# 2. 数据库
$pgBin = $null
if ($SkipApi) {
    Write-Step "跳过 API 与数据库（-SkipApi）"
} elseif ($DatabaseUrl) {
    Write-Step "使用外部数据库"
    Write-Ok "DATABASE_URL = $DatabaseUrl"
} else {
    $pgBin = Get-PgBin
    if (-not $pgBin) {
        Stop-With "未找到 PostgreSQL（需要 pg_ctl.exe 与 initdb.exe）。请安装 PostgreSQL 15+，或使用 -DatabaseUrl 指定已有数据库。"
    }
    Start-PgCluster $pgBin
}

# 3. 可选的 Redis / MinIO
$useRedis = $false
$useMinio = $false
if (-not $SkipApi) {
    $redisExe = Find-Tool "redis-server.exe"
    if ($redisExe -and -not (Test-Port -Port $RedisPort)) {
        Write-Step "启动 Redis（端口 $RedisPort）"
        $redisDataDir = Join-Path $LocalDir "redis-data"
        New-Item -ItemType Directory -Force -Path $redisDataDir | Out-Null
        Start-Background -Name "redis" -FilePath $redisExe `
            -Arguments @("--port", "$RedisPort", "--dir", $redisDataDir) `
            -WorkingDirectory $LocalDir | Out-Null
        $useRedis = Wait-Port -Port $RedisPort -TimeoutSeconds 10
        if ($useRedis) { Write-Ok "Redis 已启动" } else { Write-Warn "Redis 启动失败，改用进程内缓存" }
    } elseif (Test-Port -Port $RedisPort) {
        $useRedis = $true
        Write-Ok "检测到本机 Redis（端口 $RedisPort）"
    } else {
        Write-Warn "未找到 redis-server.exe，缓存使用进程内实现（功能基本可用）"
    }

    $minioExe = Find-Tool "minio.exe"
    if ($minioExe -and -not (Test-Port -Port $MinioPort)) {
        Write-Step "启动 MinIO（端口 $MinioPort，控制台 9090）"
        Start-Background -Name "minio" -FilePath $minioExe `
            -Arguments @("server", (Join-Path $LocalDir "minio-data"), "--address", ":$MinioPort", "--console-address", ":9090") `
            -WorkingDirectory $LocalDir `
            -Environment @{ MINIO_ROOT_USER = $PgUser; MINIO_ROOT_PASSWORD = "strata-minio-secret" } | Out-Null
        $useMinio = Wait-Port -Port $MinioPort -TimeoutSeconds 20
        if ($useMinio) { Write-Ok "MinIO 已启动" } else { Write-Warn "MinIO 启动失败，附件上传将不可用" }
    } elseif (Test-Port -Port $MinioPort) {
        $useMinio = $true
        Write-Ok "检测到本机 MinIO（端口 $MinioPort）"
    } else {
        Write-Warn "未找到 minio.exe，附件上传将不可用（其余功能正常）"
    }
}

# 4. 写入后端环境变量
Write-Step "写入 apps\api\.env"
Import-DotEnv $ApiEnv

$secretKey = [Environment]::GetEnvironmentVariable("SECRET_KEY")
if (-not $secretKey) { $secretKey = New-RandomString 50 }
$awsAccessKey = [Environment]::GetEnvironmentVariable("AWS_ACCESS_KEY_ID")
if (-not $awsAccessKey -or $awsAccessKey -eq "access-key") { $awsAccessKey = New-RandomString 20 }
$awsSecretKey = [Environment]::GetEnvironmentVariable("AWS_SECRET_ACCESS_KEY")
if (-not $awsSecretKey -or $awsSecretKey -eq "secret-key") { $awsSecretKey = New-RandomString 40 }

$dbUrl = $DatabaseUrl
if (-not $dbUrl) {
    $dbUrl = "postgresql://${PgUser}:${PgPassword}@127.0.0.1:${PgPort}/${PgDatabase}"
}

$dbPort = if ($DatabaseUrl) { "5432" } else { "$PgPort" }
$minioFlag = if ($useMinio) { "1" } else { "0" }

$settings = [ordered]@{
    DEBUG                  = "1"
    SECRET_KEY             = $secretKey
    DATABASE_URL           = $dbUrl
    POSTGRES_HOST          = "127.0.0.1"
    POSTGRES_PORT          = $dbPort
    POSTGRES_USER          = $PgUser
    POSTGRES_PASSWORD      = $PgPassword
    POSTGRES_DB            = $PgDatabase
    REDIS_HOST             = "127.0.0.1"
    REDIS_PORT             = "$RedisPort"
    REDIS_URL              = "redis://127.0.0.1:$RedisPort/0"
    AMQP_URL               = "memory://"
    USE_MINIO              = $minioFlag
    AWS_ACCESS_KEY_ID      = $awsAccessKey
    AWS_SECRET_ACCESS_KEY  = $awsSecretKey
    AWS_S3_ENDPOINT_URL    = "http://127.0.0.1:$MinioPort"
    AWS_S3_BUCKET_NAME     = "uploads"
    WEB_URL                = "http://localhost:3000"
    CORS_ALLOWED_ORIGINS   = "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3100"
}
foreach ($key in $settings.Keys) {
    $null = Set-EnvValue -Path $ApiEnv -Key $key -Value $settings[$key]
}
Write-Ok "已写入 $($settings.Count) 个变量"

# 4b. 把 API 端口同步到各前端应用的 .env
# 前端从 .env 里读 VITE_API_BASE_URL 决定打哪个后端，而 .env 是从 .env.example
# 复制来的（写死了 8000）。只改 -ApiPort 不同步这里，前端就会连到错误的端口。
$apiBaseUrl = "http://localhost:$ApiPort"
$frontendEnvTargets = @(
    @{ Path = (Join-Path $Root "apps\web\.env");   Key = "VITE_API_BASE_URL" },
    @{ Path = (Join-Path $Root "apps\admin\.env"); Key = "VITE_API_BASE_URL" },
    @{ Path = (Join-Path $Root "apps\space\.env"); Key = "VITE_API_BASE_URL" },
    @{ Path = (Join-Path $Root "apps\live\.env");  Key = "API_BASE_URL" }
)
$synced = 0
foreach ($target in $frontendEnvTargets) {
    if (-not (Test-Path $target.Path)) { continue }
    if (Set-EnvValue -Path $target.Path -Key $target.Key -Value $apiBaseUrl) { $synced++ }
}
if ($synced -gt 0) {
    Write-Ok "已同步 $synced 个前端 .env 的 API 地址为 $apiBaseUrl"
} else {
    Write-Ok "前端 .env 的 API 地址已是 $apiBaseUrl"
}

# 5. 后端依赖 + 迁移 + 初始化
if (-not $SkipApi) {
    $uv = Get-CommandPath "uv"
    if (-not $uv) { Stop-With "未找到 uv，请安装：https://docs.astral.sh/uv/" }
    $uvVersion = (& $uv --version) -join ""
    if ($uvVersion -notmatch "0\.12\.21") {
        Write-Warn "uv 版本为 $uvVersion，仓库要求 0.12.21（uv self update 0.12.21）"
    }

    Write-Step "安装 Python 依赖（uv sync，首次可能较慢）"
    if ($Mirror -and -not $env:UV_DEFAULT_INDEX) {
        $env:UV_DEFAULT_INDEX = "https://pypi.tuna.tsinghua.edu.cn/simple"
        Write-Ok "使用 PyPI 镜像：$env:UV_DEFAULT_INDEX"
    }
    Push-Location $ApiDir
    try {
        $syncLog = Join-Path $LogDir "uv-sync.log"
        if ((Invoke-NativeStream $uv @("sync", "--python", "3.12") $syncLog) -ne 0) {
            Write-LogTail $syncLog 25
            Stop-With "uv sync 失败（需要能访问 PyPI；网络慢可加 -Mirror）"
        }
        Write-Ok "依赖就绪"

        Write-Step "应用数据库迁移"
        $migrateLog = Join-Path $LogDir "migrate.log"
        if ((Invoke-NativeStream $uv @("run", "python", "manage.py", "migrate", "--noinput", "--settings=$SettingsModule") $migrateLog) -ne 0) {
            Write-LogTail $migrateLog 40
            Stop-With "数据库迁移失败，见上方 migrate.log 尾部"
        }
        Write-Ok "迁移完成"

        Write-Step "初始化实例"
        Import-DotEnv $ApiEnv
        $instanceLog = Join-Path $LogDir "instance.log"
        if ((Invoke-NativeStream $uv @("run", "python", "manage.py", "register_instance", "local-native", "--settings=$SettingsModule") $instanceLog) -eq 0) {
            Write-Ok "实例已注册"
        } else {
            Write-Warn "实例注册跳过（可忽略）"
        }
        if ((Invoke-NativeStream $uv @("run", "python", "manage.py", "configure_instance", "--settings=$SettingsModule") $instanceLog) -eq 0) {
            Write-Ok "实例配置完成"
        } else {
            Write-Warn "实例配置跳过（可忽略）"
        }
        if ($useMinio) {
            $bucketLog = Join-Path $LogDir "bucket.log"
            if ((Invoke-NativeStream $uv @("run", "python", "manage.py", "create_bucket", "--settings=$SettingsModule") $bucketLog) -eq 0) {
                Write-Ok "对象存储 bucket 就绪"
            } else {
                Write-Warn "bucket 创建失败（附件上传可能不可用）"
            }
        }
    } finally {
        Pop-Location
    }

    if (-not (Test-Port -Port $ApiPort)) {
        Write-Step "启动 Django（http://localhost:$ApiPort）"
        $env:STRATA_LOCAL_REDIS = if ($useRedis) { "1" } else { "0" }
        Start-Background -Name "api" -FilePath $uv `
            -Arguments @("run", "python", "manage.py", "runserver", "0.0.0.0:$ApiPort", "--settings", $SettingsModule) `
            -WorkingDirectory $ApiDir | Out-Null
        if (-not (Wait-Port -Port $ApiPort -TimeoutSeconds 90)) {
            Stop-With "Django 启动失败，详见 $(Join-Path $LogDir 'api.err.log')"
        }
        Write-Ok "Django 已启动"
    } else {
        Write-Warn "端口 $ApiPort 已被占用，跳过 API 启动"
    }
}

# 6. 前端
if (-not $SkipFrontend) {
    $pnpm = Get-CommandPath "pnpm.cmd"
    if (-not $pnpm) { $pnpm = Get-CommandPath "pnpm" }
    if (-not $pnpm) { Stop-With "未找到 pnpm，请先 corepack enable pnpm" }

    if (-not (Test-Path (Join-Path $Root "node_modules"))) {
        Write-Step "安装前端依赖（pnpm install）"
        Push-Location $Root
        try {
            if ((Invoke-NativeStream $pnpm @("install") (Join-Path $LogDir "pnpm-install.log")) -ne 0) { Stop-With "pnpm install 失败" }
        } finally {
            Pop-Location
        }
    }

    if (-not (Get-RunningPid "frontend")) {
        Write-Step "启动前端：$($Apps -join ', ')"
        $arguments = @("turbo", "run", "dev")
        foreach ($app in $Apps) { $arguments += "--filter=./apps/$app" }
        Start-Background -Name "frontend" -FilePath $pnpm -Arguments $arguments -WorkingDirectory $Root | Out-Null

        foreach ($app in $Apps) {
            if (-not $AppPorts.ContainsKey($app)) { continue }
            $port = $AppPorts[$app]
            if (Wait-Port -Port $port -TimeoutSeconds 300) {
                Write-Ok "$app 就绪：http://localhost:$port"
            } else {
                Write-Warn "$app 未在 120s 内就绪，详见 $(Join-Path $LogDir 'frontend.log')"
            }
        }
    } else {
        Write-Warn "前端已在运行，跳过"
    }
}

# 7. 汇总
Write-Host ""
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
if (-not $SkipFrontend) {
    Write-Host "  主应用    http://localhost:3000"
    Write-Host "  管理后台  http://localhost:3001/god-mode/   （首次注册实例管理员，结尾的 / 不能省）"
    Write-Host "  分享页    http://localhost:3002"
}
if (-not $SkipApi) {
    Write-Host "  API       http://localhost:$ApiPort"
    if ($useMinio) { Write-Host "  MinIO     http://localhost:9090" }
}
Write-Host "  日志      $LogDir"
Write-Host "  停止      .\local-dev.ps1 -Stop"
Write-Host "  状态      .\local-dev.ps1 -Status"
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
if (-not $SkipFrontend -and -not $SkipApi) {
    Write-Host "打开 http://localhost:3001/god-mode/ 注册管理员（结尾的 / 不能省），再用同一账号登录 http://localhost:3000" -ForegroundColor Green
}
Write-Host ""

if (-not $Detach) {
    try {
        Start-InteractiveMonitor
    } catch {
        Write-Warn "当前终端不支持交互监控：$($_.Exception.Message)"
        Write-Host "服务已在后台运行；可用 .\local-dev.ps1 -Status 查看状态。"
    }
}
