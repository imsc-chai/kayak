# Kayak Travel Booking System - Base Configuration (No Redis, No Kafka)
# This script starts all services WITHOUT Redis and Kafka for baseline testing

Write-Host "=== KAYAK TRAVEL BOOKING SYSTEM - BASE CONFIG ===" -ForegroundColor Cyan
Write-Host "Starting services WITHOUT Redis and Kafka..." -ForegroundColor Yellow
Write-Host ""

# Ensure Redis and Kafka are stopped
Write-Host "Ensuring Redis and Kafka are stopped..." -ForegroundColor Yellow
docker stop kayak-redis 2>$null
Set-Location docker
docker-compose -f docker-compose.yml stop kafka zookeeper 2>$null
Set-Location ..
Write-Host "[OK] Redis and Kafka are stopped" -ForegroundColor Green
Write-Host ""

# Start Backend Services (they will fail to connect to Redis/Kafka, which is OK)
Write-Host "Starting backend services..." -ForegroundColor Green
Write-Host "Note: Services will log Redis/Kafka connection errors - this is expected for Base config" -ForegroundColor Yellow
Write-Host ""

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

# Start API Gateway
Write-Host "Starting API Gateway..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend\api-gateway'; Write-Host '=== API GATEWAY (Port 5000) ===' -ForegroundColor Green; npm start"
Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Starting frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host '=== FRONTEND (Port 5173) ===' -ForegroundColor Green; Write-Host 'Starting Vite dev server...' -ForegroundColor Cyan; npm run dev"

Write-Host ""
Write-Host "=== ALL SERVICES STARTED (BASE CONFIG) ===" -ForegroundColor Green
Write-Host ""
Write-Host "Services running:" -ForegroundColor Cyan
Write-Host "  - Admin Service: http://localhost:5006" -ForegroundColor White
Write-Host "  - User Service: http://localhost:5001" -ForegroundColor White
Write-Host "  - Flight Service: http://localhost:5002" -ForegroundColor White
Write-Host "  - Hotel Service: http://localhost:5003" -ForegroundColor White
Write-Host "  - Car Service: http://localhost:5004" -ForegroundColor White
Write-Host "  - Billing Service: http://localhost:5005" -ForegroundColor White
Write-Host "  - API Gateway: http://localhost:5000" -ForegroundColor White
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Configuration: BASE (No Redis, No Kafka)" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANT:" -ForegroundColor Yellow
Write-Host "  1. Make sure MongoDB is running on port 27020" -ForegroundColor White
Write-Host "  2. Wait 10-15 seconds for all services to start" -ForegroundColor White
Write-Host "  3. Services will log Redis/Kafka connection errors - this is NORMAL" -ForegroundColor White
Write-Host "  4. Services will still work, just without caching/messaging" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

