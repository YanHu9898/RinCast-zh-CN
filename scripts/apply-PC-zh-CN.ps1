# Safely overlays the already-built RinCast zh-CN program files onto the existing
# default PC install. It does NOT run install.ps1/uninstall.ps1 or change firewall,
# SteamVR registration, registry entries, autostart, or user settings.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'

# Program Files needs an elevated token. Request normal Windows UAC consent only
# when the user runs this script; never stop RinCast or SteamVR to make room.
$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($id)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    $ps = (Get-Process -Id $PID).Path
    $runArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"{0}"' -f $PSCommandPath))
    try {
        $child = Start-Process -FilePath $ps -Verb RunAs -ArgumentList $runArgs -Wait -PassThru
        exit $child.ExitCode
    } catch {
        Write-Error '管理员权限未获准，未更改 RinCast 安装。'
        exit 1
    }
}

$install = 'C:\Program Files\RinCast'
$sourceCandidate = Join-Path $PSScriptRoot 'RinCast'
if (-not (Test-Path -LiteralPath $sourceCandidate -PathType Container)) {
    $sourceCandidate = Join-Path $PSScriptRoot '..\dist\RinCast'
}
if (-not (Test-Path -LiteralPath $sourceCandidate -PathType Container)) { throw "找不到汉化程序文件：$sourceCandidate" }
$source = (Resolve-Path -LiteralPath $sourceCandidate).Path
if (-not (Test-Path -LiteralPath $install -PathType Container)) { throw "找不到预期的 RinCast 安装目录：$install" }
$resolvedInstall = (Resolve-Path -LiteralPath $install).Path
if ($resolvedInstall -ne $install) { throw "安装目录与预期不符，拒绝覆盖：$resolvedInstall" }
if (-not (Test-Path -LiteralPath (Join-Path $install '.rincast-install') -PathType Leaf)) { throw '缺少 RinCast 安装标记，拒绝覆盖此目录。' }
$installedVersion = (Get-Content -LiteralPath (Join-Path $install 'VERSION') -TotalCount 1).Trim()
$packageVersion = (Get-Content -LiteralPath (Join-Path $source 'VERSION') -TotalCount 1).Trim()
if ($installedVersion -ne '1.0.3' -or $packageVersion -ne '1.0.3') { throw "版本不匹配（当前 $installedVersion，汉化包 $packageVersion），拒绝覆盖。" }
foreach ($file in @('RinCast Streamer.exe','Uninstall RinCast.exe','ui\i18n.js','ui\index.html','driver\rincast\driver.vrdrivermanifest')) {
    if (-not (Test-Path -LiteralPath (Join-Path $source $file) -PathType Leaf)) { throw ('汉化包缺少必需文件：{0}' -f $file) }
}
$processNames = @('RinCast Streamer','vrserver','vrmonitor','vrcompositor','vrdashboard','vrwebhelper','vrstartup')
$active = @(Get-Process -ErrorAction SilentlyContinue | Where-Object { $processNames -contains $_.ProcessName })
if ($active.Count) {
    $list = ($active | ForEach-Object { '{0} (PID {1})' -f $_.ProcessName, $_.Id }) -join ', '
    throw ('检测到 RinCast 或 SteamVR 正在运行：{0}。请先手动正常退出后再运行；脚本不会强行结束进程。' -f $list)
}

$backupParent = Join-Path $PSScriptRoot 'backups'
New-Item -ItemType Directory -Force -Path $backupParent | Out-Null
$backup = Join-Path $backupParent ('RinCast-before-zh-CN-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
if (Test-Path -LiteralPath $backup) { throw "备份目录已存在，拒绝覆盖：$backup" }
New-Item -ItemType Directory -Path $backup | Out-Null

# Back up every existing file before touching the program directory.
Get-ChildItem -LiteralPath $install -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $backup -Recurse -Force
}
$originalFiles = @(Get-ChildItem -LiteralPath $install -Recurse -File -Force)
$backupFiles = @(Get-ChildItem -LiteralPath $backup -Recurse -File -Force)
if ($originalFiles.Count -ne $backupFiles.Count) { throw "备份文件数量不一致（原目录 $($originalFiles.Count)，备份 $($backupFiles.Count)）；未覆盖安装。备份：$backup" }
foreach ($f in $originalFiles) {
    $rel = $f.FullName.Substring($resolvedInstall.Length + 1)
    $copy = Join-Path $backup $rel
    if (-not (Test-Path -LiteralPath $copy -PathType Leaf) -or (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $copy -Algorithm SHA256).Hash) {
        throw "备份校验失败：$rel。未覆盖安装。备份：$backup"
    }
}

try {
    Get-ChildItem -LiteralPath $source -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $install -Recurse -Force
    }
    foreach ($file in @('RinCast Streamer.exe','Uninstall RinCast.exe','ui\app.js','ui\index.html','ui\i18n.js','driver\rincast\driver.vrdrivermanifest')) {
        $a = Get-FileHash -LiteralPath (Join-Path $source $file) -Algorithm SHA256
        $b = Get-FileHash -LiteralPath (Join-Path $install $file) -Algorithm SHA256
        if ($a.Hash -ne $b.Hash) { throw "覆盖后校验失败：$file" }
    }
} catch {
    $failure = $_
    # Restore the original files from the verified backup. No app data is touched.
    Get-ChildItem -LiteralPath $backup -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $install -Recurse -Force
    }
    throw "更新失败，已尝试从备份恢复原文件。备份位置：$backup。详情：$failure"
}
Write-Host 'RinCast PC 端简体中文文件已更新并通过校验。' -ForegroundColor Green
Write-Host "原版完整备份：$backup"
Write-Host '个人设置、防火墙规则和 SteamVR 注册未改动。下次启动 RinCast Streamer 即可使用中文界面。'
