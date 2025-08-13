@echo off
setlocal
echo.
echo ====================================
echo    Start HMIS App (EXE + Frontend)
echo ====================================
echo.

set ROOT=%~dp0
set EXE=%ROOT%python_hmis\dist\HMIS-Backend\HMIS-Backend.exe
set FRONT=%ROOT%hmis-standalone.html

if not exist "%EXE%" (
  echo EXE not found at:
  echo    %EXE%
  echo Run build_exe.bat first.
  pause
  exit /b 1
)

echo Starting backend...
start "HMIS Backend" "%EXE%"

echo Waiting 2 seconds for server...
timeout /t 2 /nobreak >nul

echo Opening frontend in default browser...
start "HMIS Frontend" "%FRONT%"

echo Done. Close this window if not needed.
