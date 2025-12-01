# Kafka Topic Monitor for Bookings
# This script monitors the 'bookings' topic in real-time with pretty formatting

Write-Host "Monitoring Kafka 'bookings' topic..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Yellow
Write-Host ""
Write-Host "Using Node.js pretty formatter..." -ForegroundColor Green
Write-Host ""

# Check if Node.js is available
$nodeAvailable = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeAvailable) {
    Write-Host "Node.js not found. Falling back to basic output..." -ForegroundColor Yellow
    docker exec kayak-kafka kafka-console-consumer `
        --bootstrap-server localhost:9092 `
        --topic bookings `
        --from-beginning `
        --property print.timestamp=true `
        --property print.key=true `
        --property print.value=true
} else {
    # Use Node.js pretty formatter
    node monitor-bookings-pretty.js
}
