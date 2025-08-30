@echo off
setlocal enabledelayedexpansion

REM Colors for better output
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

echo %BLUE%========================================%NC%
echo %BLUE%  BLPG (Blackjack Multiplayer Game)    %NC%
echo %BLUE%========================================%NC%
echo.

REM Check if .env file exists
if not exist ".env" (
    echo %YELLOW%Warning: .env file not found. Creating from .env.example...%NC%
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo %GREEN%✓ .env file created from template%NC%
    ) else (
        echo %RED%✗ Error: .env.example not found. Please create .env file manually.%NC%
        pause
        exit /b 1
    )
    echo.
)

REM Check if Docker is running
echo %BLUE%Checking Docker status...%NC%
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%✗ Error: Docker is not running. Please start Docker Desktop first.%NC%
    echo %YELLOW%  Tip: Wait for Docker Desktop to fully load before running this script.%NC%
    pause
    exit /b 1
)
echo %GREEN%✓ Docker is running%NC%

REM Check for port conflicts
echo %BLUE%Checking for port conflicts...%NC%
netstat -an | findstr ":5180" >nul 2>&1
if %errorlevel% equ 0 (
    echo %YELLOW%⚠ Warning: Port 5180 is already in use%NC%
    echo %YELLOW%  This might cause conflicts. Consider stopping other services.%NC%
)

netstat -an | findstr ":5185" >nul 2>&1
if %errorlevel% equ 0 (
    echo %YELLOW%⚠ Warning: Port 5185 is already in use%NC%
    echo %YELLOW%  This might cause conflicts. Consider stopping other services.%NC%
)

REM Clean up old containers and images (optional)
echo.
set /p cleanup="Clean up old containers and images? (y/N): "
if /i "!cleanup!"=="y" (
    echo %BLUE%Cleaning up old containers and images...%NC%
    docker-compose down --remove-orphans >nul 2>&1
    docker system prune -f >nul 2>&1
    echo %GREEN%✓ Cleanup completed%NC%
)

echo.
echo %BLUE%Building and starting the application...%NC%
echo %GREEN%Frontend will be available at: http://localhost:5180%NC%
echo %GREEN%Backend API will be available at: http://localhost:5185%NC%
echo %GREEN%Health check: http://localhost:5185/health%NC%
echo.
echo %YELLOW%Press Ctrl+C to stop the application%NC%
echo.

REM Start with better error handling
docker-compose up --build --remove-orphans
set docker_exit_code=%errorlevel%

echo.
if %docker_exit_code% neq 0 (
    echo %RED%✗ Application stopped with errors (exit code: %docker_exit_code%)%NC%
    echo %YELLOW%Check the logs above for details%NC%
) else (
    echo %GREEN%✓ Application stopped successfully%NC%
)

echo.
echo %BLUE%Press any key to exit...%NC%
pause >nul