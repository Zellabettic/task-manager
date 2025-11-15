@echo off
echo Deploying to GitHub...
echo.

REM Get commit message from user or use default
set /p MESSAGE="Enter commit message (or press Enter for default): "
if "%MESSAGE%"=="" set MESSAGE=Update task manager

REM Run PowerShell script
powershell.exe -ExecutionPolicy Bypass -File "%~dp0deploy-github.ps1" -Message "%MESSAGE%"

pause

