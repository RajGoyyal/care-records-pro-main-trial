@echo off
setlocal
echo.
echo ====================================
echo    Start HMIS App (EXE + Frontend + Deployment) - D Drive
echo ====================================
echo.

REM Set paths for D drive
set ROOT=D:\
set EXE=%ROOT%python_hmis\dist\HMIS-Backend\HMIS-Backend.exe
set FRONT=%ROOT%hmis-standalone.html
set SERVER_DIR=%ROOT%python_hmis

REM Check EXE exists
if not exist "%EXE%" (
  echo EXE not found at:
  echo    %EXE%
  echo Run build_exe_d_drive.bat first.
  pause
  exit /b 1
)

REM Start backend EXE
echo Starting backend EXE...
start "HMIS Backend" "%EXE%"

REM Wait for backend to start
echo Waiting 2 seconds for server...
timeout /t 2 /nobreak >nul

REM Open frontend in default browser
echo Opening frontend in default browser...
start "HMIS Frontend" "%FRONT%"

REM Start Flask deployment server
echo Starting deployment server...
cd /d "%SERVER_DIR%"
if not exist "app.py" (
    echo Error: app.py not found in python_hmis directory!
    pause
    exit /b 1
)

REM Activate venv if exists
if exist ".venv" (
    call .venv\Scripts\activate.bat
)

REM Install/check required packages
pip install -r requirements.txt >nul 2>&1

REM Start Flask server
start "Deployment Server" cmd /c "python app.py"

echo.
echo All services started from D drive.
echo.
pause
