@echo off
setlocal
cd /d "%~dp0"
echo.
echo ShambConkins - compile standalone release HTML from MAIN
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0BUILD-RELEASE.ps1"
set "code=%errorlevel%"
echo.
if "%code%"=="0" (
  echo The compiled HTML is in the releases folder.
) else (
  echo The release was NOT completed. Read the error above.
)
echo.
pause
exit /b %code%
