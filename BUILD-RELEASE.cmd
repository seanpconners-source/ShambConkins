@echo off
setlocal
cd /d "%~dp0"
echo.
echo ShambConkins - build the game app from the checked-out branch and play it here
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0BUILD-RELEASE.ps1"
set "code=%errorlevel%"
echo.
if "%code%"=="0" (
  echo The game app is in the releases folder.
) else (
  echo The build was NOT completed. Read the error above.
)
echo.
pause
exit /b %code%
