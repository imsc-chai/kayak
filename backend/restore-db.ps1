# MongoDB Database Restore Script
# This script restores MongoDB from a backup

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupPath
)

$dataDir = "E:\Kayak\backend\services\user-service\data"
$dataDirBackup = "$dataDir.old_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

Write-Host "🔄 Starting MongoDB restore..." -ForegroundColor Cyan

# Check if backup path exists
if (-not (Test-Path $BackupPath)) {
    Write-Host "❌ Error: Backup path not found: $BackupPath" -ForegroundColor Red
    exit 1
}

# Check if data directory exists
if (Test-Path $dataDir) {
    Write-Host "⚠️  Current data directory exists. Creating backup..." -ForegroundColor Yellow
    try {
        Copy-Item -Path $dataDir -Destination $dataDirBackup -Recurse -Force
        Write-Host "✅ Current data backed up to: $dataDirBackup" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error backing up current data: $_" -ForegroundColor Red
        exit 1
    }
}

# Restore from backup
Write-Host "📦 Restoring from backup..." -ForegroundColor Cyan
try {
    # Remove existing data directory if it exists
    if (Test-Path $dataDir) {
        Remove-Item -Path $dataDir -Recurse -Force
    }
    
    # Copy backup to data directory
    Copy-Item -Path $BackupPath -Destination $dataDir -Recurse -Force
    Write-Host "✅ Restore completed successfully!" -ForegroundColor Green
    Write-Host "   Data restored from: $BackupPath" -ForegroundColor Cyan
    Write-Host "`n💡 You can now start MongoDB to use the restored data." -ForegroundColor Yellow
} catch {
    Write-Host "❌ Error during restore: $_" -ForegroundColor Red
    Write-Host "   Attempting to restore previous data..." -ForegroundColor Yellow
    
    # Try to restore from backup we created
    if (Test-Path $dataDirBackup) {
        Remove-Item -Path $dataDir -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item -Path $dataDirBackup -Destination $dataDir -Recurse -Force
        Write-Host "✅ Previous data restored." -ForegroundColor Green
    }
    exit 1
}

Write-Host "`n✅ Restore process completed!" -ForegroundColor Green

