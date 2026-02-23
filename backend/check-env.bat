@echo off
cd /d "%~dp0"
echo Checking environment variables...
echo.
node check-env.js
echo.
pause
