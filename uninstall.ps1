# Remove OneScreen from Windows (in PowerShell):
#
#   irm https://raw.githubusercontent.com/mxnyawi/OneScreen/main/uninstall.ps1 | iex

$ErrorActionPreference = 'SilentlyContinue'

Get-Process -Name onescreen | Stop-Process -Force
Start-Sleep -Milliseconds 500

Remove-Item -Recurse -Force (Join-Path $env:LOCALAPPDATA 'Programs\OneScreen')
Remove-Item -Force (Join-Path ([Environment]::GetFolderPath('Programs')) 'OneScreen.lnk')
Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'OneScreen'

Write-Host 'OneScreen removed. Your settings are in %APPDATA%\OneScreen (delete that folder too if you like).' -ForegroundColor Green
