@echo off
echo Starting BLPG (Blackjack Multiplayer Game) - Production Mode
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo Building and starting the application in production mode...
echo Frontend will be available at: http://localhost:5180
echo Backend API will be available at: http://localhost:5185
echo.

docker-compose up --build

echo.
echo Application stopped. Press any key to exit.
pause >nul