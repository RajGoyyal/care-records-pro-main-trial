@echo off
setlocal
echo.
echo ====================================
echo   Start HMIS Backend EXE (Windows) - D Drive
echo ====================================
echo.

REM Change working directory to EXE location on D drive
cd /d "D:\python_hmis\dist\HMIS-Backend" || exit /b 1

echo Starting HMIS Backend EXE...
start "HMIS-Backend" "HMIS-Backend.exe"
echo.
echo HMIS Backend EXE started from D drive.
echo.
pause
