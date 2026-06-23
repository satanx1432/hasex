@echo off
REM Production RAG System - Quick Start Script for Windows

echo ==================================
echo Production RAG System - Quick Start
echo ==================================

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo ✓ Created .env file
    echo   Please edit .env to configure your settings
) else (
    echo ✓ .env file already exists
)

REM Build and start services
echo.
echo Building Docker images and starting services...
docker-compose up -d --build

echo.
echo ==================================
echo Services Started
echo ==================================
echo Qdrant: http://localhost:6333
echo API: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.

echo Waiting for services to be ready...
timeout /t 15 /nobreak

echo.
echo Checking service health...
curl -s http://localhost:8000/health
if %errorlevel% equ 0 (
    echo.
    echo ✓ API is healthy
) else (
    echo.
    echo ⚠ API health check failed, but services are starting...
    echo   Check logs with: docker-compose logs -f
)

echo.
echo ==================================
echo Quick Start Commands
echo ==================================
echo View logs: docker-compose logs -f
echo Stop services: docker-compose down
echo Restart services: docker-compose restart
echo.
echo Test the API:
echo   curl http://localhost:8000/health
echo   curl http://localhost:8000/stats
echo.
echo ==================================
echo System Ready!
echo ==================================

pause
