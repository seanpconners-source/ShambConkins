@echo off
setlocal
cd /d "%~dp0"
echo.
echo ============================================
echo   ShambConkins - LOCAL AUTOMATED TESTS
echo   No GitHub Actions or cloud minutes used
echo ============================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\run-local-tests.ps1" -Mode Full
set "result=%errorlevel%"
echo.
if not "%result%"=="0" (echo TESTS NEED ATTENTION. See local-test-reports.) else (echo LOCAL AUTOMATED TESTS PASSED.)
echo.
pause
exit /b %result%
