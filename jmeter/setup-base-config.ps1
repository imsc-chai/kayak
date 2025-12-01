# Setup for B (Base) Configuration - No Redis, No Kafka
Write-Host "Setting up B (Base) Configuration..." -ForegroundColor Cyan
Write-Host "   - Redis: DISABLED" -ForegroundColor Yellow
Write-Host "   - Kafka: DISABLED" -ForegroundColor Yellow
Write-Host ""

# Stop Redis
Write-Host "Stopping Redis..." -ForegroundColor Green
docker stop kayak-redis 2>$null
docker rm kayak-redis 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Redis stopped and removed" -ForegroundColor Green
} else {
    Write-Host "[WARN] Redis was not running" -ForegroundColor Yellow
}

# Stop Kafka
Write-Host "Stopping Kafka and Zookeeper..." -ForegroundColor Green
Set-Location ..\kafka
docker-compose -f docker-compose.yml down 2>$null
Set-Location ..\jmeter
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Kafka and Zookeeper stopped and removed" -ForegroundColor Green
} else {
    Write-Host "[WARN] Kafka was not running" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[OK] B (Base) Configuration Ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Use start-all-base.ps1 (NOT start-all.ps1):" -ForegroundColor White
Write-Host "      cd .." -ForegroundColor Gray
Write-Host "      .\start-all-base.ps1" -ForegroundColor Gray
Write-Host "   2. Wait for services to start" -ForegroundColor White
Write-Host "   3. Services will log Redis/Kafka connection errors - this is NORMAL" -ForegroundColor Yellow
Write-Host "   4. Run JMeter test plan" -ForegroundColor White
Write-Host "   5. Save results as: results-base.csv" -ForegroundColor White

