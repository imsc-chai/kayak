# Kayak Travel Booking System - Quick Start Script
# This script starts all services in separate windows

Write-Host "=== KAYAK TRAVEL BOOKING SYSTEM ===" -ForegroundColor Cyan
Write-Host "Starting all services..." -ForegroundColor Yellow
Write-Host ""

# Check if Docker is running (for Kafka)
Write-Host "Checking Docker..." -ForegroundColor Cyan
$dockerRunning = docker ps 2>$null
if (-not $dockerRunning) {
    Write-Host "⚠️  Docker might not be running. Please start Docker Desktop first!" -ForegroundColor Yellow
    Write-Host "Press any key to continue anyway..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Start Kafka
Write-Host "Starting Kafka and Zookeeper..." -ForegroundColor Green
Set-Location kafka
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '=== KAFKA & ZOOKEEPER ===' -ForegroundColor Cyan; docker-compose up"
Set-Location ..

Start-Sleep -Seconds 3

# Start Backend Services
Write-Host "Starting backend services..." -ForegroundColor Green

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend\services\admin-service'; Write-Host '=== ADMIN SERVICE (Port 5006) ===' -ForegroundColor Green; npm start"
Start-Sleep -Seconds 1

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend\services\user-service'; Write-Host '=== USER SERVICE (Port 5001) ===' -ForegroundColor Green; npm start"
Start-Sleep -Seconds 1

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend\services\flight-service'; Write-Host '=== FLIGHT SERVICE (Port 5002) ===' -ForegroundColor Green; npm start"
Start-Sleep -Seconds 1

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend\services\hotel-service'; Write-Host '=== HOTEL SERVICE (Port 5003) ===' -ForegroundColor Green; npm start"
Start-Sleep -Seconds 1

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend\services\car-service'; Write-Host '=== CAR SERVICE (Port 5004) ===' -ForegroundColor Green; npm start"
Start-Sleep -Seconds 1

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend\services\billing-service'; Write-Host '=== BILLING SERVICE (Port 5005) ===' -ForegroundColor Green; npm start"
Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Starting frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host '=== FRONTEND (Port 5173) ===' -ForegroundColor Green; Write-Host 'Starting Vite dev server...' -ForegroundColor Cyan; npm run dev"

Write-Host ""
Write-Host "=== ALL SERVICES STARTED ===" -ForegroundColor Green
Write-Host ""
Write-Host "Services running:" -ForegroundColor Cyan
Write-Host "  - Kafka & Zookeeper (Docker)" -ForegroundColor White
Write-Host "  - Admin Service: http://localhost:5006" -ForegroundColor White
Write-Host "  - User Service: http://localhost:5001" -ForegroundColor White
Write-Host "  - Flight Service: http://localhost:5002" -ForegroundColor White
Write-Host "  - Hotel Service: http://localhost:5003" -ForegroundColor White
Write-Host "  - Car Service: http://localhost:5004" -ForegroundColor White
Write-Host "  - Billing Service: http://localhost:5005" -ForegroundColor White
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT:" -ForegroundColor Yellow
Write-Host "  1. Make sure MongoDB is running on port 27020" -ForegroundColor White
Write-Host "  2. Wait 10-15 seconds for all services to start" -ForegroundColor White
Write-Host "  3. Open http://localhost:5173 in your browser" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

