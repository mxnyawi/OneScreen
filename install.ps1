# Install OneScreen on Windows with one command (in PowerShell):
#
#   irm https://raw.githubusercontent.com/mxnyawi/OneScreen/main/install.ps1 | iex
#
# Downloads the latest release into %LOCALAPPDATA%\Programs\OneScreen, adds a Start
# menu shortcut, starts it, and turns on launch at login. No admin rights needed.
# Run it again to update. To remove OneScreen:
#
#   irm https://raw.githubusercontent.com/mxnyawi/OneScreen/main/uninstall.ps1 | iex

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # the progress bar makes downloads very slow in Windows PowerShell 5.1
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$repo = 'mxnyawi/OneScreen'
$url  = "https://github.com/$repo/releases/latest/download/OneScreen-Windows.zip"
$dir  = Join-Path $env:LOCALAPPDATA 'Programs\OneScreen'
$exe  = Join-Path $dir 'onescreen.exe'
$zip  = Join-Path ([IO.Path]::GetTempPath()) 'OneScreen-Windows.zip'

Write-Host 'Downloading OneScreen...'
try {
    if ($env:ONESCREEN_ZIP) {
        Copy-Item -Path $env:ONESCREEN_ZIP -Destination $zip -Force   # used by CI to test a fresh build
    } else {
        Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    }
} catch {
    Write-Host "Download failed. Check your connection, or see https://github.com/$repo/releases" -ForegroundColor Red
    return
}

# stop an older copy so it can be replaced
Get-Process -Name onescreen -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500

New-Item -ItemType Directory -Force -Path $dir | Out-Null
Expand-Archive -Path $zip -DestinationPath $dir -Force
Remove-Item $zip -Force
Unblock-File -Path $exe

# Start menu shortcut
$shortcut = Join-Path ([Environment]::GetFolderPath('Programs')) 'OneScreen.lnk'
$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut($shortcut)
$link.TargetPath = $exe
$link.Description = 'Push your cursor toward a monitor. It moves there.'
$link.Save()

Write-Host 'Starting OneScreen...'
Start-Process -FilePath $exe -ArgumentList '--launch-at-login'

Write-Host 'Done. OneScreen is running: look for its icon in the system tray (click ^ if you do not see it).' -ForegroundColor Green
Write-Host 'To use it, push your cursor toward your monitor. It starts automatically when you sign in.'
