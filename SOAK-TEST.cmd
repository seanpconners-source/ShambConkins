@echo off
setlocal
cd /d "%~dp0"
title ShambConkins soak test (close this window to stop)
echo.
echo ShambConkins SOAK TEST - runs the long tests until you close this window.
echo Report: %~dp0soak-reports\LATEST.md
echo Nothing is uploaded. No GitHub Actions minutes are used.
echo Options: SOAK-TEST.cmd -Hours 8   or   SOAK-TEST.cmd -NoOnline
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\soak.ps1" %*
echo.
echo Soak test stopped. Report: %~dp0soak-reports\LATEST.md
if exist "%~dp0soak-reports\LATEST.md" start "" notepad.exe "%~dp0soak-reports\LATEST.md"
pause
