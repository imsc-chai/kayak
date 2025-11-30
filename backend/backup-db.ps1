# MongoDB Database Backup Script
# This script backs up the MongoDB data directory to prevent data loss

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "E:\Kayak\backups"
$dataDir = "E:\Kayak\backend\services\user-service\data"
$backupPath = Join-Path $backupDir "mongodb_backup_$timestamp"

Write-Host "🔄 Starting MongoDB backup..." -ForegroundColor Cyan

# Create backup directory if it doesn't exist
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "✅ Created backup directory: $backupDir" -ForegroundColor Green
}

# Check if data directory exists
if (-not (Test-Path $dataDir)) {
    Write-Host "❌ Error: Data directory not found at $dataDir" -ForegroundColor Red
    Write-Host "   Please ensure MongoDB data directory exists before backing up." -ForegroundColor Yellow
    exit 1
}

# Stop MongoDB if running (optional - comment out if you want to backup while running)
Write-Host "⚠️  Note: For best results, stop MongoDB before backing up." -ForegroundColor Yellow
Write-Host "   You can backup while MongoDB is running, but it's safer to stop it first." -ForegroundColor Yellow

# Copy data directory
Write-Host "📦 Copying data directory..." -ForegroundColor Cyan
try {
    Copy-Item -Path $dataDir -Destination $backupPath -Recurse -Force
    Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
    Write-Host "   Backup location: $backupPath" -ForegroundColor Cyan
    
    # Get backup size
    $backupSize = (Get-ChildItem -Path $backupPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "   Backup size: $([math]::Round($backupSize, 2)) MB" -ForegroundColor Cyan
    
    Write-Host "`n💡 To restore from backup:" -ForegroundColor Yellow
    Write-Host "   1. Stop MongoDB" -ForegroundColor White
    Write-Host "   2. Delete or rename current data directory" -ForegroundColor White
    Write-Host "   3. Copy backup folder to: $dataDir" -ForegroundColor White
    Write-Host "   4. Start MongoDB" -ForegroundColor White
} catch {
    Write-Host "❌ Error during backup: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Backup process completed!" -ForegroundColor Green

