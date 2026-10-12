@echo off
setlocal
cd /d "%~dp0"
echo.
echo ============================================
echo   ShambConkins - QUICK LOCAL CHECKS
echo   No GitHub Actions or cloud minutes used
echo ============================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\run-local-tests.ps1" -Mode Quick
set "result=%errorlevel%"
echo.
if not "%result%"=="0" (echo QUICK CHECKS NEED ATTENTION. See local-test-reports.) else (echo QUICK CHECKS PASSED.)
echo.
pause
exit /b %result%
