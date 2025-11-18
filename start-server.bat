@echo off
echo Starting Task Manager local server...
echo.

REM Try Python first (most common)
where python >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python HTTP server on port 8000
    echo Open http://localhost:8000 in your browser
    echo Press Ctrl+C to stop the server
    echo.
    python -m http.server 8000
    goto :end
)

REM Try Node.js http-server
where node >nul 2>&1
if %errorlevel% == 0 (
    echo Using Node.js http-server on port 8000
    echo Open http://localhost:8000 in your browser
    echo Press Ctrl+C to stop the server
    echo.
    npx http-server -p 8000
    goto :end
)

REM Try PHP
where php >nul 2>&1
if %errorlevel% == 0 (
    echo Using PHP built-in server on port 8000
    echo Open http://localhost:8000 in your browser
    echo Press Ctrl+C to stop the server
    echo.
    php -S localhost:8000
    goto :end
)

REM If nothing is found
echo Error: No suitable server found!
echo Please install one of the following:
echo   - Python: https://www.python.org/downloads/
echo   - Node.js: https://nodejs.org/
echo   - PHP: https://www.php.net/downloads.php
echo.
echo Or manually run: python -m http.server 8000
echo.
pause

:end

