@echo off
echo Starting Task Manager Server...
echo.
echo Make sure you're in the Task Manager folder!
echo.
echo The server will start on http://localhost:8000
echo Keep this window open while using the app.
echo Press Ctrl+C to stop the server.
echo.
echo.

REM Try Python 3 first
python -m http.server 8000 2>nul
if %errorlevel% equ 0 goto :end

REM Try Python 3 with python3 command
python3 -m http.server 8000 2>nul
if %errorlevel% equ 0 goto :end

REM Try Python 2
python -m SimpleHTTPServer 8000 2>nul
if %errorlevel% equ 0 goto :end

REM If Python not found, try Node.js
echo Python not found. Trying Node.js...
where npx >nul 2>&1
if %errorlevel% equ 0 (
    npx http-server -p 8000
    if %errorlevel% equ 0 goto :end
)

REM If Node.js not found, try PowerShell (built into Windows)
echo Node.js not found. Trying PowerShell...
powershell -ExecutionPolicy Bypass -File "%~dp0start-server.ps1" 2>nul
if %errorlevel% equ 0 goto :end

echo.
echo ERROR: Could not start server.
echo.
echo Please install one of the following:
echo   1. Python 3 (https://www.python.org/downloads/)
echo   2. Node.js (https://nodejs.org/)
echo.
echo Or use VS Code with Live Server extension.
echo.
pause

:end

