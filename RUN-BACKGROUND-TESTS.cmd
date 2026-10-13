@echo off
setlocal
cd /d "%~dp0"
if not exist "%~dp0local-test-reports" mkdir "%~dp0local-test-reports"
echo.
echo ShambConkins - LOW-IMPACT BACKGROUND AUTOMATED TESTS
echo ----------------------------------------------------
echo Starting a MINIMIZED LOW CPU PRIORITY full test run.
echo One browser game at a time, 12 small batches, RAM safeguards.
echo Logs and results: local-test-reports
echo Nothing is uploaded. No GitHub Actions minutes used.
echo.
start "ShambConkins Low-Impact Background QA" /MIN /LOW powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\run-local-tests.ps1" -Mode Background
if errorlevel 1 (
  echo Could not launch low-priority test process.
  pause
  exit /b 1
)
echo Started. You can leave this window; the tests continue separately.
echo Check local-test-reports\LATEST-PROGRESS.txt while running.
echo Check local-test-reports\LATEST-SUMMARY.txt after completion.
echo Keep the laptop PLUGGED IN, with the lid OPEN.
echo Sleeping or closing the lid may interrupt tests.
timeout /t 6 /nobreak >nul
exit /b 0
