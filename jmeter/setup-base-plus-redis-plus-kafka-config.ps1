# Setup for B + S + K (Base + Redis + Kafka) Configuration - Both Enabled
Write-Host "Setting up B + S + K (Base + Redis + Kafka) Configuration..." -ForegroundColor Cyan
Write-Host "   - Redis: ENABLED" -ForegroundColor Green
Write-Host "   - Kafka: ENABLED" -ForegroundColor Green
Write-Host ""

# Start Redis
Write-Host "Starting Redis..." -ForegroundColor Green
Set-Location ..\docker
$redisContainer = docker ps -a --filter "name=kayak-redis" --format "{{.Names}}"
if ($redisContainer -eq "kayak-redis") {
    docker-compose -f docker-compose.yml start redis
} else {
    docker-compose -f docker-compose.yml up redis -d
}
Set-Location ..\jmeter
Start-Sleep -Seconds 2
Write-Host "[OK] Redis started" -ForegroundColor Green

# Start Kafka
Write-Host "Starting Kafka and Zookeeper..." -ForegroundColor Green
Set-Location ..\kafka
docker-compose -f docker-compose.yml up -d
Set-Location ..\jmeter
Start-Sleep -Seconds 5
Write-Host "[OK] Kafka and Zookeeper started" -ForegroundColor Green

# Clear Redis cache for clean test
Write-Host "Clearing Redis cache..." -ForegroundColor Green
docker exec -it kayak-redis redis-cli FLUSHALL 2>$null
Write-Host "[OK] Redis cache cleared" -ForegroundColor Green

Write-Host ""
Write-Host "[OK] B + S + K (Base + Redis + Kafka) Configuration Ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Restart all services: .\start-all.ps1" -ForegroundColor White
Write-Host "   2. Wait for services to start" -ForegroundColor White
Write-Host "   3. Run JMeter test plan" -ForegroundColor White
Write-Host "   4. Save results as: results-base-plus-redis-plus-kafka.csv" -ForegroundColor White

