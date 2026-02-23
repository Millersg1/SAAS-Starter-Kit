@echo off
echo ========================================
echo Updating .env with Stripe Keys
echo ========================================
echo.

REM Check if .env exists
if not exist .env (
    echo Error: .env file not found!
    echo Please create a .env file first.
    pause
    exit /b 1
)

REM Backup existing .env
copy .env .env.backup >nul
echo Backup created: .env.backup

REM Add Stripe keys to .env
echo.
echo Adding Stripe configuration to .env...
echo.

REM Check if Stripe keys already exist
findstr /C:"STRIPE_SECRET_KEY" .env >nul
if %errorlevel% equ 0 (
    echo Stripe keys already exist in .env
    echo Please update them manually or delete the existing lines first.
    pause
    exit /b 1
)

REM Append Stripe configuration
(
echo.
echo # ==============================================
echo # STRIPE CONFIGURATION
echo # ==============================================
echo STRIPE_SECRET_KEY=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
echo STRIPE_PUBLISHABLE_KEY=pk_live_51SxRSDH7DLU0lDSa8dx5PyKrxYV0d1KYBw7y39gbd8A7vlpjvIIi7cFbBbGQoLui6Tv0G4oG7uzdO1fG2abBLKDc00n5rVMlJq
echo STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
echo STRIPE_API_VERSION=2023-10-16
) >> .env

echo.
echo ========================================
echo Stripe keys added successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Run: node create-stripe-products.js
echo 2. Configure webhook in Stripe Dashboard
echo 3. Update STRIPE_WEBHOOK_SECRET in .env
echo.
pause
