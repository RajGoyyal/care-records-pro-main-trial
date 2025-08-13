@echo off
echo.
echo ========================================
echo       HMIS First-Time Setup
echo ========================================
echo.
echo This script will set up your HMIS environment for the first time.
echo.

cd /d "%~dp0python_hmis"

echo Step 1: Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH!
    echo.
    echo Please:
    echo 1. Download Python 3.9+ from https://python.org
    echo 2. Install it and check "Add to PATH" during installation
    echo 3. Restart this script
    echo.
    pause
    exit /b 1
) else (
    echo ✓ Python is installed
)

echo.
echo Step 2: Creating virtual environment...
if exist ".venv" (
    echo ✓ Virtual environment already exists
) else (
    python -m venv .venv
    echo ✓ Virtual environment created
)

echo.
echo Step 3: Activating virtual environment...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo ✗ Failed to activate virtual environment
    pause
    exit /b 1
) else (
    echo ✓ Virtual environment activated
)

echo.
echo Step 4: Installing required packages...
pip install -r requirements.txt
if errorlevel 1 (
    echo ✗ Failed to install some packages
    echo Please check your internet connection and try again
    pause
    exit /b 1
) else (
    echo ✓ All packages installed successfully
)

echo.
echo Step 5: Testing server startup...
echo Starting server for 5 seconds to test...
timeout /t 2 /nobreak >nul
start /min python app.py
timeout /t 5 /nobreak >nul
taskkill /f /im python.exe >nul 2>&1

echo.
echo ========================================
echo           Setup Complete!
echo ========================================
echo.
echo Your HMIS system is ready to use!
echo.
echo Next steps:
echo 1. Run 'start_server.bat' to start the backend
echo 2. Open 'hmis-standalone.html' in your browser
echo 3. Or use 'start_development.bat' for automatic setup
echo.
echo Database file will be created at: python_hmis\hmis.db
echo ========================================
echo.
pause
