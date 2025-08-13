@echo off
setlocal

REM Start HMIS backend with a production WSGI server (Waitress)
echo ======================================
echo   Starting HMIS (Production server)
echo ======================================

set ROOT=%~dp0
cd /d "%ROOT%"

if not exist "%ROOT%python_hmis\app.py" (
  echo Error: python_hmis\app.py not found.
  pause
  exit /b 1
)

REM Optional: use venv if present
if exist "%ROOT%python_hmis\.venv\Scripts\activate.bat" (
  call "%ROOT%python_hmis\.venv\Scripts\activate.bat"
)

REM Ensure dependencies (Flask + waitress)
pip install -r "%ROOT%python_hmis\requirements.txt"

set HMIS_HOST=127.0.0.1
set HMIS_PORT=5000

python "%ROOT%run_production_server.py"

endlocal
