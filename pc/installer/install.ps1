<#
  RinCast PC installer: the steps RinCast-<version>-Setup.exe runs, and what a manual install
  from the unpacked release zip or a staged package (dist\RinCast) runs. It asks for
  administrator rights if it needs them.

      powershell -ExecutionPolicy Bypass -File install.ps1 [-InstallDir <path>] [-SkipAudio] [-NoStart] [-AllowPublic]

  What it does:
    1. Copies RinCast Streamer and the SteamVR driver to %ProgramFiles%\RinCast.
    2. Adds Windows Firewall rules so headsets can reach the streamer on Private and
       Domain networks. Public networks stay closed until someone allows them in RinCast
       Streamer (General, Networks), which a reinstall keeps. -AllowPublic allows them now.
    3. Registers the RinCast XR OpenXR runtime, if this is a local build that has it.
    4. Registers the SteamVR driver with vrpathreg (if SteamVR is installed).
    5. Installs the RinCast Speaker / RinCast Microphone audio driver, if this
       package has one. Release packages normally don't.
    6. Creates a Start menu shortcut and an uninstaller entry.
#>
[CmdletBinding()]
param(
    [string]$InstallDir = (Join-Path $env:ProgramFiles 'RinCast'),
    [switch]$SkipAudio,
    [switch]$NoStart,
    [switch]$AllowPublic,
    [switch]$Elevated  # internal: this is the window that self-elevation opened
)

$ErrorActionPreference = 'Stop'
# The native setup reads this stream as UTF-8 so Chinese progress/error text is preserved.
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$source = $PSScriptRoot
$sentinelName = '.rincast-install'

function Close-Window {
    # The elevated window closes when the script ends; keep the result readable.
    if ($Elevated) { Read-Host '按 Enter 关闭此窗口' | Out-Null }
}

trap {
    Write-Host "`nRinCast 安装失败：$_" -ForegroundColor Red
    Close-Window
    exit 1
}

function Step($text) { Write-Host "-> $text" -ForegroundColor Cyan }
# Not Write-Warning: its prefix is translated, and RinCast's setup looks for these.
function Warn($text) { Write-Host "!  $text" -ForegroundColor Yellow }

# An elevated PowerShell can run as a different account than the person at the
# desktop, and then HKCU and %LOCALAPPDATA% belong to that admin account.
function Get-DesktopUserSid {
    $session = (Get-Process -Id $PID).SessionId
    $shell = Get-CimInstance Win32_Process -Filter "Name='explorer.exe' AND SessionId=$session" | Select-Object -First 1
    if ($shell) {
        $sid = (Invoke-CimMethod -InputObject $shell -MethodName GetOwnerSid).Sid
        if ($sid -and (Test-Path "Registry::HKEY_USERS\$sid")) { return $sid }
    }
    return [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
}

$InstallDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($InstallDir).TrimEnd('\')

$id = [Security.Principal.WindowsIdentity]::GetCurrent()
if (-not ([Security.Principal.WindowsPrincipal]$id).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    $argv = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", '-InstallDir', "`"$InstallDir`"", '-Elevated')
    foreach ($flag in 'SkipAudio', 'NoStart', 'AllowPublic') {
        if ((Get-Variable $flag -ValueOnly).IsPresent) { $argv += "-$flag" }
    }
    $child = Start-Process powershell.exe -Verb RunAs -ArgumentList $argv -Wait -PassThru
    exit $child.ExitCode
}

if (-not (Test-Path (Join-Path $source 'RinCast Streamer.exe'))) {
    throw "install.ps1 旁边找不到 RinCast Streamer.exe。请先解压完整发行包。"
}

# uninstall.ps1 removes the whole install folder, so never adopt one that holds other files.
$sentinel = Join-Path $InstallDir $sentinelName
if ($InstallDir -eq [IO.Path]::GetPathRoot($InstallDir).TrimEnd('\')) {
    throw "请选择用于安装 RinCast 的文件夹，而不是磁盘根目录（$InstallDir）。"
}
if ((Test-Path $InstallDir) -and -not (Test-Path $sentinel) -and $InstallDir -ine (Join-Path $env:ProgramFiles 'RinCast') -and
    (Get-ChildItem $InstallDir -Force | Select-Object -First 1)) {
    throw "$InstallDir 已包含其他文件。请选择一个空文件夹。"
}

$versionFile = Join-Path $source 'VERSION'
$version = if (Test-Path $versionFile) { (Get-Content $versionFile -TotalCount 1).Trim() } else { '0.0.0' }

# 1. Files -------------------------------------------------------------------
Step "正在将文件复制到 $InstallDir"
# SteamVR keeps RinCast's driver loaded, so it has to close too, or copying the driver fails
# halfway through and leaves old and new files mixed.
$running = @(Get-Process 'RinCast Streamer', 'vrserver', 'vrmonitor', 'vrcompositor', 'vrdashboard', 'vrwebhelper', 'vrstartup' -ErrorAction SilentlyContinue)
if ($running | Where-Object ProcessName -like 'vr*') { Write-Host '   正在关闭 SteamVR 以更新 RinCast 驱动。' }
if ($running) {
    $running | Stop-Process -Force
    # Windows keeps the exe locked until the process has really gone.
    $running | Wait-Process -Timeout 10 -ErrorAction SilentlyContinue
}
Start-Sleep -Milliseconds 500
New-Item -ItemType Directory -Force $InstallDir | Out-Null
if ($source.TrimEnd('\') -ine $InstallDir) {
    foreach ($item in 'RinCast Streamer.exe', 'Uninstall RinCast.exe', 'rincast-audio-setup.exe', 'ui', 'driver', 'openxr', 'audio',
        'install.ps1', 'uninstall.ps1', 'LICENSES', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'VERSION') {
        $from = Join-Path $source $item
        if (Test-Path $from) { Copy-Item $from $InstallDir -Recurse -Force }
    }
}
Set-Content -Path $sentinel -Value 'Created by the RinCast installer. uninstall.ps1 removes this folder only if this file exists.' -Encoding Ascii
# A downloaded zip marks every file as coming from the internet.
Get-ChildItem $InstallDir -Recurse -File | Unblock-File
$exe = Join-Path $InstallDir 'RinCast Streamer.exe'

# 2. Firewall ----------------------------------------------------------------
Step '正在添加防火墙规则'
# Someone who allowed Public networks in RinCast Streamer keeps that choice.
$hadPublic = @(Get-NetFirewallRule -DisplayName 'RinCast Streamer' -ErrorAction SilentlyContinue |
    Where-Object { "$($_.Profile)" -match 'Public|Any' }).Count -gt 0
$programProfiles = if ($AllowPublic -or $hadPublic) { 'Private', 'Domain', 'Public' } else { 'Private', 'Domain' }
$profiles = 'Private', 'Domain'
Get-NetFirewallRule -Group 'RinCast' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
# The rule RinCast Streamer writes itself has the same name, outside the group.
Get-NetFirewallRule -DisplayName 'RinCast Streamer' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
# Dismissing Windows' firewall prompt leaves "Block" rules for the exe, which win over Allow rules.
Get-NetFirewallRule -DisplayName 'rincast streamer.exe' -ErrorAction SilentlyContinue |
    Where-Object Action -eq 'Block' | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName 'RinCast Streamer' -Group 'RinCast' -Direction Inbound -Action Allow `
    -Program $exe -Protocol UDP -Profile $programProfiles | Out-Null
New-NetFirewallRule -DisplayName 'RinCast discovery (UDP 38710)' -Group 'RinCast' -Direction Inbound -Action Allow `
    -Protocol UDP -LocalPort 38710 -Profile $profiles | Out-Null
New-NetFirewallRule -DisplayName 'RinCast streaming (UDP 38711)' -Group 'RinCast' -Direction Inbound -Action Allow `
    -Protocol UDP -LocalPort 38711 -Profile $profiles | Out-Null

# 3. OpenXR runtime (local builds only) ---------------------------------------
if (Test-Path (Join-Path $source 'openxr\rincast-openxr.json')) {
    Step '正在注册 RinCast XR OpenXR 运行时'
    $manifest = Join-Path $InstallDir 'openxr\rincast-openxr.json'
    $xrKey = 'HKLM:\SOFTWARE\Khronos\OpenXR\1\AvailableRuntimes'
    New-Item -Force $xrKey | Out-Null
    New-ItemProperty -Path $xrKey -Name $manifest -Value 0 -PropertyType DWord -Force | Out-Null
}

# 4. SteamVR driver -----------------------------------------------------------
$driverDir = Join-Path $InstallDir 'driver\rincast'
$userSid = Get-DesktopUserSid
$steam = (Get-ItemProperty "Registry::HKEY_USERS\$userSid\Software\Valve\Steam" -ErrorAction SilentlyContinue).SteamPath
$vrpathreg = if ($steam) { Join-Path $steam 'steamapps\common\SteamVR\bin\win64\vrpathreg.exe' }
if ($userSid -ne $id.User.Value) {
    # vrpathreg writes to the profile of the account it runs as, which is the wrong one here.
    Write-Host '   RinCast Streamer 首次启动时会注册 SteamVR 驱动。' -ForegroundColor DarkGray
} elseif ($vrpathreg -and (Test-Path $vrpathreg)) {
    Step '正在注册 SteamVR 驱动'
    & $vrpathreg adddriver $driverDir | Out-Null
} else {
    Write-Host '   未找到 SteamVR；安装 SteamVR 后，RinCast Streamer 会注册驱动。' -ForegroundColor DarkGray
}

# 5. Audio driver -------------------------------------------------------------
if (-not $SkipAudio) {
    if (Test-Path (Join-Path $source 'audio\RinCastAudio.inf')) {
        $inf = Join-Path $InstallDir 'audio\RinCastAudio.inf'
        Step '正在安装 RinCast 扬声器和麦克风'
        $cert = Join-Path $InstallDir 'audio\RinCastTest.cer'
        if (Test-Path $cert) {
            # Test-signed development build: trust the test certificate on this machine.
            Import-Certificate -FilePath $cert -CertStoreLocation Cert:\LocalMachine\Root | Out-Null
            Import-Certificate -FilePath $cert -CertStoreLocation Cert:\LocalMachine\TrustedPublisher | Out-Null
            $bcd = (bcdedit /enum '{current}') -join "`n"
            if ($bcd -notmatch 'testsigning\s+Yes') {
                Warn ('音频驱动使用测试签名。请启用测试签名（"bcdedit /set testsigning on"）并重启，' +
                    '然后再次运行 "rincast-audio-setup.exe install audio\RinCastAudio.inf"。')
            }
        }
        & (Join-Path $InstallDir 'rincast-audio-setup.exe') install $inf
        switch ($LASTEXITCODE) {
            0 { }
            3010 { Warn '请重启 Windows 以完成音频驱动安装。' }
            default { Warn "音频驱动安装失败（退出代码 $LASTEXITCODE）。如果 Steam 已安装串流设备，RinCast 将改用这些设备。" }
        }
    } else {
        Write-Host '   此程序包不含 RinCast 音频驱动。音频将使用 Steam 串流扬声器和麦克风。' -ForegroundColor DarkGray
    }
}

# 6. Shortcuts and uninstall entry --------------------------------------------
Step '正在创建快捷方式'
$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('CommonPrograms')) 'RinCast Streamer.lnk'))
$lnk.TargetPath = $exe
$lnk.WorkingDirectory = $InstallDir
$lnk.Save()

$un = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\RinCast'
New-Item -Force $un | Out-Null
# Apps > Installed apps runs the uninstaller program where there is one (setup packages).
$uninstaller = Join-Path $InstallDir 'Uninstall RinCast.exe'
$uninstall = if (Test-Path $uninstaller) { "`"$uninstaller`"" } else { "powershell.exe -ExecutionPolicy Bypass -File `"$InstallDir\uninstall.ps1`"" }
$sizeKb = [int]((Get-ChildItem $InstallDir -Recurse -File | Measure-Object Length -Sum).Sum / 1KB)
$props = @{
    DisplayName     = 'RinCast'
    DisplayVersion  = $version
    Publisher       = 'RinCast contributors'
    DisplayIcon     = $exe
    InstallLocation = $InstallDir
    UninstallString = $uninstall
    URLInfoAbout    = 'https://rincast.com'
    EstimatedSize   = $sizeKb
    NoModify        = 1
    NoRepair        = 1
}
if (Test-Path $uninstaller) { $props.QuietUninstallString = "`"$uninstaller`" --quiet" }
foreach ($k in $props.Keys) {
    $type = if ($props[$k] -is [int]) { 'DWord' } else { 'String' }
    New-ItemProperty -Path $un -Name $k -Value $props[$k] -PropertyType $type -Force | Out-Null
}

Write-Host "`nRinCast $version 已安装。" -ForegroundColor Green
# Through Explorer, so the streamer runs as the desktop user and not elevated.
if (-not $NoStart) { Start-Process explorer.exe -ArgumentList "`"$exe`"" }
Close-Window
