@echo off
echo Starting Task Manager local server...
echo.

REM Try Node.js http-server first (preferred)
where node >nul 2>&1
if %errorlevel% == 0 (
    echo Using Node.js http-server on port 8000
    echo Opening http://localhost:8000 in your browser...
    echo Press Ctrl+C to stop the server
    echo.
    echo Note: Cache disabled for development - code updates load automatically
    echo.
    REM Start server in new window and open browser after short delay
    start "Task Manager Server" cmd /k "npx http-server -p 8000 -c-1 --cors"
    timeout /t 3 /nobreak >nul
    start "" "http://localhost:8000"
    goto :end
)

REM Try Python as fallback
where python >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python HTTP server on port 8000
    echo Opening http://localhost:8000 in your browser...
    echo Press Ctrl+C to stop the server
    echo.
    REM Start server in new window and open browser after short delay
    start "Task Manager Server" cmd /k "python -m http.server 8000"
    timeout /t 3 /nobreak >nul
    start "" "http://localhost:8000"
    goto :end
)

REM Try PHP
where php >nul 2>&1
if %errorlevel% == 0 (
    echo Using PHP built-in server on port 8000
    echo Opening http://localhost:8000 in your browser...
    echo Press Ctrl+C to stop the server
    echo.
    REM Start server in new window and open browser after short delay
    start "Task Manager Server" cmd /k "php -S localhost:8000"
    timeout /t 3 /nobreak >nul
    start "" "http://localhost:8000"
    goto :end
)

REM If nothing is found
echo Error: No suitable server found!
echo Please install one of the following:
echo   - Node.js (recommended): https://nodejs.org/
echo   - Python: https://www.python.org/downloads/
echo   - PHP: https://www.php.net/downloads.php
echo.
echo Or manually run: npx http-server -p 8000
echo.
pause

:end

