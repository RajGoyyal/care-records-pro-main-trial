@echo off
setlocal
echo.
echo ====================================
echo   Build HMIS Backend EXE (Windows) - D Drive Install
echo ====================================
echo.

REM Change working directory to python_hmis on D drive
cd /d "D:\python_hmis" || exit /b 1

echo Checking Python...
python --version >nul 2>&1 || (
  echo Python not found. Install Python 3.9+ and add to PATH.
  pause & exit /b 1
)

echo Creating/Activating venv...
if not exist .venv (
  python -m venv .venv || (echo venv failed & pause & exit /b 1)
)
call .venv\Scripts\activate.bat || echo Using system Python

echo Installing build deps...
pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt pyinstaller waitress >nul 2>&1

echo Cleaning previous build...
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build

echo Building EXE with PyInstaller...
pyinstaller --noconfirm --clean ^
  --name HMIS-Backend ^
  --add-data "hmis.db;." ^
  --add-data "templates;templates" ^
  --hidden-import flask ^
  --console ^
  hmis_launcher.py

if errorlevel 1 (
  echo Build failed.
  pause & exit /b 1
)

echo.
echo Build complete: D:\python_hmis\dist\HMIS-Backend\HMIS-Backend.exe
echo You can run start_app.bat to start the EXE and open the frontend.
echo.
pause
