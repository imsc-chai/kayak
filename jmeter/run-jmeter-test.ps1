# JMeter Test Runner with HTML Report Generation
# Usage: .\run-jmeter-test.ps1 <config-name> <results-filename>
# Example: .\run-jmeter-test.ps1 "base" "results-base"

param(
    [Parameter(Mandatory=$true)]
    [string]$ConfigName,
    
    [Parameter(Mandatory=$true)]
    [string]$ResultsFile
)

# JMeter installation path
$JMETER_HOME = "C:\Users\Chai\Tools\apache-jmeter-5.6.3"
$JMETER_BIN = "$JMETER_HOME\bin\jmeter.bat"

# Check if JMeter exists
if (-not (Test-Path $JMETER_BIN)) {
    Write-Host "❌ JMeter not found at: $JMETER_BIN" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please update `$JMETER_HOME in this script to your JMeter installation path" -ForegroundColor Yellow
    Write-Host "Example: C:\apache-jmeter-5.6" -ForegroundColor Yellow
    exit 1
}

# Test plan path
$TEST_PLAN = "$PWD\KAYAK_JMETER_TEST_PLAN.jmx"

# Results file paths
$CSV_FILE = "$PWD\$ResultsFile.csv"
$HTML_DIR = "$PWD\$ResultsFile-html"

Write-Host "=== Running JMeter Test: $ConfigName ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Plan: $TEST_PLAN" -ForegroundColor White
Write-Host "CSV Results: $CSV_FILE" -ForegroundColor White
Write-Host "HTML Report: $HTML_DIR\index.html" -ForegroundColor White
Write-Host ""

# Remove old results if they exist
if (Test-Path $CSV_FILE) {
    Remove-Item $CSV_FILE -Force
    Write-Host "Removed old CSV file" -ForegroundColor Yellow
}

if (Test-Path $HTML_DIR) {
    Remove-Item $HTML_DIR -Recurse -Force
    Write-Host "Removed old HTML report" -ForegroundColor Yellow
}

Write-Host "Starting JMeter test..." -ForegroundColor Green
Write-Host "This will take 30-60 seconds..." -ForegroundColor Yellow
Write-Host ""

# Run JMeter in non-GUI mode with HTML report
& $JMETER_BIN -n -t $TEST_PLAN -l $CSV_FILE -e -o $HTML_DIR

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Test completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Results:" -ForegroundColor Cyan
    Write-Host "  CSV: $CSV_FILE" -ForegroundColor White
    Write-Host "  HTML Report: $HTML_DIR\index.html" -ForegroundColor White
    Write-Host ""
    Write-Host "Opening HTML report in browser..." -ForegroundColor Green
    Start-Process "$HTML_DIR\index.html"
} else {
    Write-Host ""
    Write-Host "❌ Test failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

