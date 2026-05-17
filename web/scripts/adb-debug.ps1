# adb-debug.ps1 — convenience wrapper around adb for the Brooks Android app.
#
# Usage from any shell (PowerShell, Windows Terminal, or Git Bash via pwsh):
#   .\scripts\adb-debug.ps1 <command> [args...]
#
# Run without arguments to see the help screen.
#
# This script:
#   • Auto-finds adb.exe in the standard Android Studio install location
#     and prepends it to PATH for the current process (no permanent install
#     needed)
#   • Wraps the 12 commands you actually use 80% of the time during phone
#     debugging
#   • Targets uk.brooksweb.app by default — change $PackageName below if
#     you ever fork the app

param(
    [Parameter(Position = 0)]
    [string]$Command = 'help',

    [Parameter(Position = 1, ValueFromRemainingArguments = $true)]
    [string[]]$Rest = @()
)

$ErrorActionPreference = 'Stop'

$PackageName = 'uk.brooksweb.app'
$AdbCandidates = @(
    "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
    "$env:ANDROID_HOME\platform-tools\adb.exe",
    "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe",
    "$env:ProgramFiles\Android\Android Studio\bin\adb.exe"
)

# ────────────────────────────────────────────────────────────────────────────
# Resolve adb

function Find-Adb {
    $cmd = Get-Command adb.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Path }
    foreach ($candidate in $AdbCandidates) {
        if ($candidate -and (Test-Path $candidate)) { return $candidate }
    }
    return $null
}

$AdbPath = Find-Adb
if (-not $AdbPath) {
    Write-Host "adb.exe not found." -ForegroundColor Red
    Write-Host "Checked PATH and these locations:" -ForegroundColor Yellow
    $AdbCandidates | ForEach-Object { Write-Host "  $_" }
    Write-Host ""
    Write-Host "Install Android Studio (which bundles platform-tools) or download" -ForegroundColor Yellow
    Write-Host "platform-tools standalone from:" -ForegroundColor Yellow
    Write-Host "  https://developer.android.com/studio/releases/platform-tools" -ForegroundColor Yellow
    exit 1
}

# Make adb available in this process so any sub-shells / Bash blocks work.
$adbDir = Split-Path -Parent $AdbPath
if ($env:Path -notlike "*$adbDir*") {
    $env:Path = "$adbDir;$env:Path"
}

function Invoke-Adb {
    param([string[]]$Arguments)
    & $AdbPath @Arguments
}

# ────────────────────────────────────────────────────────────────────────────
# Commands

function Show-Help {
    Write-Host ""
    Write-Host "adb-debug.ps1 — Brooks Android debugging helper" -ForegroundColor Cyan
    Write-Host "Target package: $PackageName" -ForegroundColor DarkGray
    Write-Host "adb: $AdbPath" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "USAGE:" -ForegroundColor Yellow
    Write-Host "  .\scripts\adb-debug.ps1 <command>"
    Write-Host ""
    Write-Host "COMMANDS:" -ForegroundColor Yellow
    Write-Host "  devices         List connected devices"
    Write-Host "  inspect         Open chrome://inspect for WebView debugging"
    Write-Host "  logs            Tail logcat filtered to the Brooks app process"
    Write-Host "  console         Tail Capacitor + Chromium console output only"
    Write-Host "  save-logs       Dump full logcat to brooks-log.txt and exit"
    Write-Host "  install <apk>   Install a freshly built APK (-r replace mode)"
    Write-Host "  uninstall       Uninstall the app completely (clears all data)"
    Write-Host "  stop            Force-stop the app process"
    Write-Host "  clear           Clear app data (keep app installed)"
    Write-Host "  info            Show installed version + package info"
    Write-Host "  screenshot      Save phone screen to screen.png"
    Write-Host "  record [sec]    Record screen video (default 30s) -> repro.mp4"
    Write-Host "  wireless <ip>   Switch to wireless ADB; if no IP given, prints how"
    Write-Host "  pidof           Print the app's PID (handy for piping)"
    Write-Host "  help            Show this help"
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
    Write-Host "  .\scripts\adb-debug.ps1 devices"
    Write-Host "  .\scripts\adb-debug.ps1 logs              # Ctrl+C to stop"
    Write-Host "  .\scripts\adb-debug.ps1 install android\app\build\outputs\apk\release\app-release.apk"
    Write-Host "  .\scripts\adb-debug.ps1 record 15"
    Write-Host ""
}

function Cmd-Devices {
    Write-Host "Connected devices:" -ForegroundColor Cyan
    Invoke-Adb @('devices', '-l')
}

function Cmd-Inspect {
    Write-Host "Opening chrome://inspect/#devices in your default browser..." -ForegroundColor Cyan
    Write-Host "1) Make sure the Brooks app is OPEN on the phone." -ForegroundColor DarkGray
    Write-Host "2) Wait 3-5 sec for 'WebView in $PackageName' to appear." -ForegroundColor DarkGray
    Write-Host "3) Click 'inspect' next to it to open full DevTools." -ForegroundColor DarkGray
    Start-Process "chrome://inspect/#devices"
}

function Get-AppPid {
    $pidString = (Invoke-Adb @('shell', 'pidof', '-s', $PackageName)) -join ''
    $pidString = $pidString.Trim()
    if (-not $pidString) { return $null }
    return $pidString
}

function Cmd-Logs {
    $appPid = Get-AppPid
    if (-not $appPid) {
        Write-Host "App not running. Launching $PackageName..." -ForegroundColor Yellow
        Invoke-Adb @('shell', 'monkey', '-p', $PackageName, '-c', 'android.intent.category.LAUNCHER', '1') | Out-Null
        Start-Sleep -Seconds 2
        $appPid = Get-AppPid
        if (-not $appPid) {
            Write-Host "Could not launch app. Open it manually on the phone and retry." -ForegroundColor Red
            exit 1
        }
    }
    Write-Host "Tailing logcat for PID $appPid ($PackageName). Ctrl+C to stop." -ForegroundColor Cyan
    Invoke-Adb @('logcat', "--pid=$appPid", '-v', 'time')
}

function Cmd-Console {
    Write-Host "Tailing Capacitor + Chromium WebView console only. Ctrl+C to stop." -ForegroundColor Cyan
    Invoke-Adb @('logcat', '-s', 'Capacitor:V', 'Console:V', 'chromium:V', '-v', 'time')
}

function Cmd-SaveLogs {
    $out = 'brooks-log.txt'
    Write-Host "Dumping full logcat buffer to $out..." -ForegroundColor Cyan
    Invoke-Adb @('logcat', '-d') | Out-File -Encoding utf8 $out
    $size = (Get-Item $out).Length
    Write-Host "Wrote $size bytes to $out" -ForegroundColor Green
}

function Cmd-Install {
    if ($Rest.Count -lt 1) {
        Write-Host "Usage: adb-debug.ps1 install <path-to-apk>" -ForegroundColor Red
        exit 1
    }
    $apk = $Rest[0]
    if (-not (Test-Path $apk)) {
        Write-Host "APK not found: $apk" -ForegroundColor Red
        exit 1
    }
    Write-Host "Installing $apk (replace mode)..." -ForegroundColor Cyan
    Invoke-Adb @('install', '-r', $apk)
}

function Cmd-Uninstall {
    Write-Host "Uninstalling $PackageName (clears all data)..." -ForegroundColor Cyan
    Invoke-Adb @('uninstall', $PackageName)
}

function Cmd-Stop {
    Write-Host "Force-stopping $PackageName..." -ForegroundColor Cyan
    Invoke-Adb @('shell', 'am', 'force-stop', $PackageName)
    Write-Host "Done." -ForegroundColor Green
}

function Cmd-Clear {
    Write-Host "Clearing app data for $PackageName (app stays installed)..." -ForegroundColor Cyan
    Invoke-Adb @('shell', 'pm', 'clear', $PackageName)
}

function Cmd-Info {
    Write-Host "Package info for $PackageName" -ForegroundColor Cyan
    Write-Host "---" -ForegroundColor DarkGray
    $dump = Invoke-Adb @('shell', 'dumpsys', 'package', $PackageName)
    $dump | Select-String -Pattern 'versionName|versionCode|firstInstallTime|lastUpdateTime|targetSdk|minSdk' |
        ForEach-Object { Write-Host ("  " + $_.ToString().Trim()) }
}

function Cmd-Screenshot {
    $out = 'screen.png'
    Write-Host "Capturing screenshot -> $out..." -ForegroundColor Cyan
    Invoke-Adb @('exec-out', 'screencap', '-p') | Set-Content -Path $out -Encoding Byte
    Write-Host "Saved $out" -ForegroundColor Green
}

function Cmd-Record {
    $sec = if ($Rest.Count -ge 1) { [int]$Rest[0] } else { 30 }
    $remoteFile = '/sdcard/repro.mp4'
    $localFile = 'repro.mp4'
    Write-Host "Recording $sec seconds of phone screen to $remoteFile..." -ForegroundColor Cyan
    Invoke-Adb @('shell', 'screenrecord', "--time-limit=$sec", $remoteFile)
    Write-Host "Pulling to $localFile..." -ForegroundColor Cyan
    Invoke-Adb @('pull', $remoteFile, $localFile)
    Invoke-Adb @('shell', 'rm', $remoteFile) | Out-Null
    Write-Host "Saved $localFile" -ForegroundColor Green
}

function Cmd-Wireless {
    if ($Rest.Count -lt 1) {
        Write-Host "How to switch ADB to wireless:" -ForegroundColor Cyan
        Write-Host "  1. Phone + laptop on the same Wi-Fi, phone still plugged in via USB."
        Write-Host "  2. Run: .\scripts\adb-debug.ps1 wireless prepare"
        Write-Host "  3. Note the phone's IP (printed at the end)."
        Write-Host "  4. Unplug the cable."
        Write-Host "  5. Run: .\scripts\adb-debug.ps1 wireless <phone-ip>"
        exit 0
    }
    if ($Rest[0] -eq 'prepare') {
        Invoke-Adb @('tcpip', '5555')
        Write-Host "Phone IP candidates:" -ForegroundColor Cyan
        Invoke-Adb @('shell', 'ip', '-f', 'inet', 'addr', 'show', 'wlan0') |
            Select-String -Pattern 'inet '
        Write-Host ""
        Write-Host "Now unplug the cable, then run: adb-debug.ps1 wireless <that-ip>" -ForegroundColor Yellow
        exit 0
    }
    $ip = $Rest[0]
    Write-Host "Connecting to $ip:5555..." -ForegroundColor Cyan
    Invoke-Adb @('connect', "${ip}:5555")
    Invoke-Adb @('devices')
}

function Cmd-Pidof {
    $appPid = Get-AppPid
    if (-not $appPid) {
        Write-Host "App not running." -ForegroundColor Yellow
        exit 1
    }
    Write-Output $appPid
}

# ────────────────────────────────────────────────────────────────────────────
# Dispatch

switch ($Command.ToLower()) {
    'help'        { Show-Help }
    '-h'          { Show-Help }
    '--help'      { Show-Help }
    'devices'     { Cmd-Devices }
    'inspect'     { Cmd-Inspect }
    'logs'        { Cmd-Logs }
    'console'     { Cmd-Console }
    'save-logs'   { Cmd-SaveLogs }
    'install'     { Cmd-Install }
    'uninstall'   { Cmd-Uninstall }
    'stop'        { Cmd-Stop }
    'clear'       { Cmd-Clear }
    'info'        { Cmd-Info }
    'screenshot'  { Cmd-Screenshot }
    'record'      { Cmd-Record }
    'wireless'    { Cmd-Wireless }
    'pidof'       { Cmd-Pidof }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Show-Help
        exit 1
    }
}
