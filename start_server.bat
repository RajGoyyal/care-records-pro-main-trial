@echo off
echo.
echo ====================================
echo    HMIS Flask Server Launcher
echo ====================================
echo.
echo Starting HMIS Backend Server...
echo Server will be available at: http://localhost:5000
echo Open hmis-standalone.html in your browser for the frontend
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0python_hmis"

if not exist "app.py" (
    echo Error: app.py not found in python_hmis directory!
    echo Please make sure you're running this from the correct location.
    pause
    exit /b 1
)

echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH!
    echo Please install Python 3.9+ and add it to your PATH.
    pause
    exit /b 1
)

echo Checking if virtual environment exists...
if exist ".venv" (
    echo Activating virtual environment...
    call .venv\Scripts\activate.bat
    if errorlevel 1 (
        echo Warning: Failed to activate virtual environment, using system Python
    ) else (
        echo Virtual environment activated successfully
    )
) else (
    echo No virtual environment found, using system Python
    echo Tip: Create a virtual environment with: python -m venv .venv
)

echo Installing/checking required packages...
pip install -r requirements.txt >nul 2>&1
if errorlevel 1 (
    echo Warning: Some packages might not be installed correctly
)

echo.
echo Starting Flask server directly with app.py...
echo ====================================
python app.py

echo.
echo ====================================
echo Server stopped.
echo.
echo You can now:
echo 1. Close this window
echo 2. Press any key to restart the server
echo 3. Check the hmis.db file for your data
echo ====================================
pause
