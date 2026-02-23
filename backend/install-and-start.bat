@echo off
echo ========================================
echo ClientHub Backend - Install and Start
echo ========================================
echo.
cd /d "%~dp0"
echo Current directory: %CD%
echo.
echo Step 1: Installing dependencies...
echo.
call npm install
echo.
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo.
echo Step 2: Starting backend server...
echo.
call npm run dev
