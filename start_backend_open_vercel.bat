@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title HMIS Backend + Vercel Frontend
color 0B

REM ===== Configure this to your Vercel URL (no trailing slash) =====
set "VERCEL_URL=https://YOUR-VERCEL-PROJECT.vercel.app"

set "ROOT=%~dp0"
set "BACKEND_PY=%ROOT%run_production_server.py"
set "REQ=%ROOT%python_hmis\requirements.txt"
set "VENV_ACT=%ROOT%python_hmis\.venv\Scripts\activate.bat"
set "HMIS_HOST=127.0.0.1"
set "HMIS_PORT=5000"
set "BACKEND_BASE=http://%HMIS_HOST%:%HMIS_PORT%"

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║   NHCE HMIS - Start Backend (Python) + Open Vercel UI     ║
echo ╚══════════════════════════════════════════════════════════╝
echo   Root: %ROOT%
echo   Backend: %BACKEND_BASE%
echo   Vercel:  %VERCEL_URL%
echo.

if /I "%VERCEL_URL%"=="https://YOUR-VERCEL-PROJECT.vercel.app" (
  color 0E
  echo ⚠️  Please edit this script and set VERCEL_URL to your Vercel app URL.
  echo     Example: set "VERCEL_URL=https://care-records-pro-main-trial.vercel.app"
  echo.
)

REM Basic checks
if not exist "%BACKEND_PY%" (
  color 0C
  echo ❌ Backend launcher not found: %BACKEND_PY%
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

echo ⏳ Waiting for server to become healthy at %BACKEND_BASE%/api/health
set /a tries=0
set /a maxTries=20
set "SP=|/-\"
:wait_health_vercel
set /a idx=tries%%4
<nul set /p=  Checking health %SP:~%idx%,1%  
powershell -NoProfile -Command "try { $r=Invoke-RestMethod -UseBasicParsing -Uri '%BACKEND_BASE%/api/health' -TimeoutSec 2; if ($r.status -eq 'ok') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 goto health_ok_vercel
set /a tries+=1
if %tries% GEQ %maxTries% goto health_fail_vercel
timeout /t 1 /nobreak >nul
echo.
goto wait_health_vercel

:health_ok_vercel
echo.
color 0A
echo ✅ Backend is up.
goto open_vercel

:health_fail_vercel
echo.
color 0E
echo ⚠️  Could not confirm server readiness, opening UI anyway.

:open_vercel
set "OPEN_URL=%VERCEL_URL%/?backend=%BACKEND_BASE%"
echo 🌐 Opening Vercel UI: %OPEN_URL%
start "HMIS Frontend (Vercel)" "%OPEN_URL%"

echo.
color 0A
echo ✅ Backend and Vercel Frontend launched.
echo    Close the backend window to stop the server.
echo.
pause
endlocal
