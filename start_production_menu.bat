@echo off
setlocal ENABLEDELAYEDEXPANSION
title HMIS Backend + Frontend (Python 3.13)

:: =============================================================
:: HMIS Launcher (Python 3.13.7) – starts backend (Waitress) + frontend (Vite)
:: =============================================================

set APP_DIR=%~dp0python_hmis
set VENV_DIR_PY313=%~dp0venv313
set REQUIREMENTS=%APP_DIR%\requirements.txt
cd /d "%~dp0"

echo ==============================================
echo   HMIS Backend + Frontend Launcher (Python 3.13)
echo ==============================================
echo  - Backend  : Waitress on http://localhost:8000
echo  - Frontend : Vite dev on http://localhost:5173
echo  - Logs     : Created under HMIS_DATA_DIR\logs (server.log)
echo ==============================================

for /f "tokens=*" %%P in ('py -0p ^| find "3.13"') do set PY313_EXE=%%P
if not defined PY313_EXE (
    echo [ERROR] Python 3.13 not found via 'py' launcher.
    echo Install Python 3.13.7 from https://www.python.org/downloads/windows/
    pause
    goto end
)
echo [INFO] Python 3.13 detected at: %PY313_EXE%

if not exist "%VENV_DIR_PY313%" (
    echo [INFO] Creating virtual environment (venv313)...
    "%PY313_EXE%" -m venv "%VENV_DIR_PY313%"
)
call "%VENV_DIR_PY313%\Scripts\activate.bat"
python --version

if exist "%REQUIREMENTS%" (
    echo [INFO] Installing backend dependencies (requirements.txt)...
    pip install --upgrade pip wheel setuptools >nul 2>&1
    pip install -r "%REQUIREMENTS%" >nul
) else (
    echo [WARN] requirements.txt not found at %REQUIREMENTS%
)

echo [INFO] Launching backend on http://localhost:8000 (8 threads)...
set HMIS_SUPPRESS_QUEUE_WARN=1
start "HMIS Backend" cmd /k "call \"%VENV_DIR_PY313%\Scripts\activate.bat\" && python -m waitress --listen=0.0.0.0:8000 --threads=8 python_hmis.app"

REM --- Frontend (Vite dev server) ---
if not exist package.json (
    echo [WARN] package.json not found in project root; skipping frontend start.
    goto poststart
)
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org/ and re-run.
    goto poststart
)
if not exist node_modules (
    echo [INFO] Installing frontend dependencies (npm install)...
    call npm install
)
echo [INFO] Starting Vite dev server (npm run dev)...
start "HMIS Frontend" cmd /k "npm run dev"
REM Give frontend a moment before opening browser
timeout /t 2 >nul
start "" http://localhost:5173/

:poststart
echo.
echo [RUNNING]
echo   Backend : http://localhost:8000
echo   Frontend: http://localhost:5173 (if started)
echo Close the backend/frontend windows to stop services.
echo This launcher can now exit safely.
echo.
pause

:end
endlocal

