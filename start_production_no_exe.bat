@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title HMIS Production (No EXE)
color 0B

set "ROOT=%~dp0"
set "BACKEND_PY=%ROOT%run_production_server.py"
set "REQ=%ROOT%python_hmis\requirements.txt"
set "VENV_ACT=%ROOT%python_hmis\.venv\Scripts\activate.bat"
set "FRONT_FILE=%ROOT%hmis-standalone.html"
set "HMIS_HOST=127.0.0.1"
set "HMIS_PORT=5000"

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║          NHCE HMIS - Production (Python + Browser)        ║
echo ╚══════════════════════════════════════════════════════════╝
echo   Root: %ROOT%
echo   Host: %HMIS_HOST%   Port: %HMIS_PORT%
echo.

REM Checks
if not exist "%BACKEND_PY%" (
  color 0C
  echo ❌ Backend launcher not found: %BACKEND_PY%
  pause
  exit /b 1
)
if not exist "%FRONT_FILE%" (
  color 0C
  echo ❌ Frontend file not found: %FRONT_FILE%
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
:wait_health_noexe
set /a idx=tries%%4
<nul set /p=  Checking health %SP:~%idx%,1%  
powershell -NoProfile -Command "try { $r=Invoke-RestMethod -UseBasicParsing -Uri 'http://%HMIS_HOST%:%HMIS_PORT%/api/health' -TimeoutSec 2; if ($r.status -eq 'ok') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 goto health_ok_noexe
set /a tries+=1
if %tries% GEQ %maxTries% goto health_fail_noexe
timeout /t 1 /nobreak >nul
echo.
goto wait_health_noexe

:health_ok_noexe
echo.
color 0A
echo ✅ Server is up.
goto open_ui_noexe

:health_fail_noexe
echo.
color 0E
echo ⚠️  Could not confirm server readiness, opening UI anyway.

:open_ui_noexe
echo 🌐 Opening frontend in browser...
REM Build a file:/// URL for robust browser handling
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$p=[System.IO.Path]::GetFullPath('%FRONT_FILE%'); $u='file:///'+$p.Replace('\\','/'); Write-Output $u"`) do set "FRONT_URL=%%I"

REM Prefer Edge, then Chrome, then Firefox; else use default handler
where msedge >nul 2>&1
if %errorlevel%==0 (
  start "" msedge "%FRONT_URL%"
) else (
  where chrome >nul 2>&1
  if %errorlevel%==0 (
    start "" chrome "%FRONT_URL%"
  ) else (
    where firefox >nul 2>&1
    if %errorlevel%==0 (
      start "" firefox "%FRONT_URL%"
    ) else (
      start "" "%FRONT_URL%"
    )
  )
)

echo.
color 0A
echo ✅ Backend (Python) and Frontend launched.
echo    This script does NOT start any EXE. Close the backend window to stop the server.
echo.
pause
endlocal
