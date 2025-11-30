# Kafka Topic Monitor for Bookings
# This script monitors the 'bookings' topic in real-time

Write-Host "📊 Monitoring Kafka 'bookings' topic..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Yellow
Write-Host ""

docker exec kayak-kafka kafka-console-consumer `
    --bootstrap-server localhost:9092 `
    --topic bookings `
    --from-beginning `
    --property print.timestamp=true `
    --property print.key=true `
    --property print.value=true

