@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title HMIS Production Launcher
color 0A

set "ROOT=%~dp0"
set "BACKEND_PY=%ROOT%run_production_server.py"
set "REQ=%ROOT%python_hmis\requirements.txt"
set "VENV_ACT=%ROOT%python_hmis\.venv\Scripts\activate.bat"
set "FRONT=%ROOT%hmis-standalone.html"
set "HMIS_HOST=127.0.0.1"
set "HMIS_PORT=5000"

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║           NHCE HMIS - Production (Server + UI)           ║
echo ╚══════════════════════════════════════════════════════════╝
echo   Root: %ROOT%
echo   Host: %HMIS_HOST%   Port: %HMIS_PORT%
echo.

REM Basic checks
if not exist "%BACKEND_PY%" (
  color 0C
  echo ❌ Backend launcher not found: %BACKEND_PY%
  echo    Make sure you run this from the project root.
  pause
  exit /b 1
)
if not exist "%FRONT%" (
  color 0C
  echo ❌ Frontend file not found: %FRONT%
  pause
  exit /b 1
)

REM Optional: activate virtual environment if present
if exist "%VENV_ACT%" (
  echo 🔧 Activating virtual environment...
  call "%VENV_ACT%"
)

REM Ensure Python is available
python --version >nul 2>&1
if errorlevel 1 (
  color 0C
  echo ❌ Python is not installed or not in PATH.
  echo    Please install Python 3.9+ and restart this script.
  pause
  exit /b 1
)

echo 📦 Ensuring production dependencies (Flask + Waitress)...
pip install -r "%REQ%" >nul
if errorlevel 1 (
  color 0E
  echo ⚠️  Package installation had warnings. Continuing...
)

echo 🚀 Starting backend (production WSGI) in a separate window...
start "HMIS Backend (Production)" python "%BACKEND_PY%"

echo ⏳ Waiting for server to become healthy at http://%HMIS_HOST%:%HMIS_PORT%/api/health
set /a tries=0
set /a maxTries=20
set "SP=|/-\"
:wait_health
set /a idx=tries%%4
<nul set /p=  Checking health %SP:~%idx%,1%  
powershell -NoProfile -Command "try { $r=Invoke-RestMethod -UseBasicParsing -Uri 'http://%HMIS_HOST%:%HMIS_PORT%/api/health' -TimeoutSec 2; if ($r.status -eq 'ok') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 goto health_ok
set /a tries+=1
if %tries% GEQ %maxTries% goto health_fail
timeout /t 1 /nobreak >nul
echo.
goto wait_health

:health_ok
echo.
color 0A
echo ✅ Server is up.
goto open_ui

:health_fail
echo.
color 0E
echo ⚠️  Could not confirm server readiness, opening UI anyway.

:open_ui
echo 🌐 Opening frontend in default browser...
start "HMIS Frontend" "%FRONT%"

echo.
color 0A
echo ✅ Backend and Frontend launched.
echo    Keep this window open if you want to re-run quickly.
echo    Backend runs in its own window. Close that to stop the server.
echo.
pause
endlocal
