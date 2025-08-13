@echo off
echo.
echo ========================================
echo    HMIS Complete Development Setup
echo ========================================
echo.
echo This will:
echo 1. Start the Python Flask backend server
echo 2. Open the HMIS application in your browser
echo.

REM Start the Flask server in a new window
echo Starting Flask server in background...
start "HMIS Flask Server" cmd /k "start_server.bat"

REM Wait a moment for the server to start
echo Waiting for server to initialize...
timeout /t 3 /nobreak >nul

REM Open the HMIS application in default browser
echo Opening HMIS application in browser...
start "" "hmis-standalone.html"

echo.
echo ========================================
echo Development environment started!
echo.
echo Server: http://localhost:5000
echo Frontend: hmis-standalone.html (opened in browser)
echo.
echo Close the "HMIS Flask Server" window to stop the backend.
echo ========================================
echo.
pause
