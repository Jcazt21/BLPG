@echo off
setlocal enabledelayedexpansion

REM Colors for better output
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "CYAN=[96m"
set "NC=[0m"

echo %CYAN%========================================%NC%
echo %CYAN%  BLPG - Development Docker Manager     %NC%
echo %CYAN%========================================%NC%
echo.

:menu
echo %BLUE%Select an option:%NC%
echo %GREEN%1.%NC% Start application (build + run)
echo %GREEN%2.%NC% Start application (no build)
echo %GREEN%3.%NC% Stop application
echo %GREEN%4.%NC% View logs
echo %GREEN%5.%NC% Clean up (remove containers/images)
echo %GREEN%6.%NC% Full reset (clean + rebuild)
echo %GREEN%7.%NC% Health check
echo %GREEN%8.%NC% Shell into container
echo %GREEN%9.%NC% Exit
echo.

set /p choice="Enter your choice (1-9): "

if "%choice%"=="1" goto start_build
if "%choice%"=="2" goto start_no_build
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto logs
if "%choice%"=="5" goto cleanup
if "%choice%"=="6" goto full_reset
if "%choice%"=="7" goto health_check
if "%choice%"=="8" goto shell
if "%choice%"=="9" goto exit
goto menu

:start_build
echo %BLUE%Starting application with build...%NC%
docker-compose up --build --remove-orphans
goto menu

:start_no_build
echo %BLUE%Starting application without build...%NC%
docker-compose up
goto menu

:stop
echo %BLUE%Stopping application...%NC%
docker-compose down
echo %GREEN%✓ Application stopped%NC%
echo.
goto menu

:logs
echo %BLUE%Showing application logs...%NC%
echo %YELLOW%Press Ctrl+C to return to menu%NC%
echo.
docker-compose logs -f
goto menu

:cleanup
echo %BLUE%Cleaning up containers and images...%NC%
docker-compose down --remove-orphans
docker system prune -f
echo %GREEN%✓ Cleanup completed%NC%
echo.
goto menu

:full_reset
echo %BLUE%Performing full reset...%NC%
docker-compose down --remove-orphans
docker system prune -af
docker-compose up --build --remove-orphans
goto menu

:health_check
echo %BLUE%Checking application health...%NC%
curl -s http://localhost:5185/health >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Backend is healthy%NC%
) else (
    echo %RED%✗ Backend is not responding%NC%
)

curl -s http://localhost:5180 >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Frontend is accessible%NC%
) else (
    echo %RED%✗ Frontend is not responding%NC%
)
echo.
goto menu

:shell
echo %BLUE%Opening shell in container...%NC%
docker exec -it BLPG /bin/sh
goto menu

:exit
echo %GREEN%Goodbye!%NC%
exit /b 0