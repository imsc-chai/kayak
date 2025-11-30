# Test script for AI Agent endpoints
$baseUrl = "http://localhost:8000/api"

Write-Host "=== Testing AI Agent Endpoints ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Car search with make filtering (Toyota)
Write-Host "Test 1: Car search - 'Find me some Toyota Cars'" -ForegroundColor Yellow
$body1 = @{
    message = "Find me some Toyota Cars"
    conversation_history = @()
    user_id = $null
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/chat" -Method Post -Body $body1 -ContentType "application/json"
    Write-Host "Response: $($response1.response)" -ForegroundColor Green
    if ($response1.search_results -and $response1.search_results.cars) {
        $cars = $response1.search_results.cars
        Write-Host "Found $($cars.Count) cars" -ForegroundColor Green
        foreach ($car in $cars[0..2]) {
            Write-Host "  - $($car.company) $($car.model) in $($car.location.city) - $$($car.dailyRentalPrice)/day" -ForegroundColor White
        }
    } else {
        Write-Host "No cars found" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Booking details query
Write-Host "Test 2: Booking details query - 'What are my booking details?'" -ForegroundColor Yellow
$body2 = @{
    message = "What are my booking details?"
    conversation_history = @()
    user_id = $null
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/chat" -Method Post -Body $body2 -ContentType "application/json"
    Write-Host "Response: $($response2.response)" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Trip planning checklist
Write-Host "Test 3: Trip planning - 'Give me trip planning checklist'" -ForegroundColor Yellow
$body3 = @{
    message = "Give me trip planning checklist"
    conversation_history = @()
    user_id = $null
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri "$baseUrl/chat" -Method Post -Body $body3 -ContentType "application/json"
    Write-Host "Response (first 500 chars):" -ForegroundColor Green
    Write-Host $response3.response.Substring(0, [Math]::Min(500, $response3.response.Length)) -ForegroundColor White
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: Trip suggestions
Write-Host "Test 4: Trip suggestions - 'Suggest me a trip'" -ForegroundColor Yellow
$body4 = @{
    message = "Suggest me a trip"
    conversation_history = @()
    user_id = $null
} | ConvertTo-Json

try {
    $response4 = Invoke-RestMethod -Uri "$baseUrl/chat" -Method Post -Body $body4 -ContentType "application/json"
    Write-Host "Response:" -ForegroundColor Green
    Write-Host $response4.response -ForegroundColor White
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 5: Flight search
Write-Host "Test 5: Flight search - 'Find flights to Los Angeles'" -ForegroundColor Yellow
$body5 = @{
    message = "Find flights to Los Angeles"
    conversation_history = @()
    user_id = $null
} | ConvertTo-Json

try {
    $response5 = Invoke-RestMethod -Uri "$baseUrl/chat" -Method Post -Body $body5 -ContentType "application/json"
    Write-Host "Response: $($response5.response)" -ForegroundColor Green
    if ($response5.search_results -and $response5.search_results.flights) {
        $flights = $response5.search_results.flights
        Write-Host "Found $($flights.Count) flights" -ForegroundColor Green
        foreach ($flight in $flights[0..2]) {
            Write-Host "  - $($flight.airline) $($flight.flightId): $($flight.departureAirport.city) → $($flight.arrivalAirport.city) - $$($flight.ticketPrice)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 6: General conversation
Write-Host "Test 6: General conversation - 'Hello, how can you help me?'" -ForegroundColor Yellow
$body6 = @{
    message = "Hello, how can you help me?"
    conversation_history = @()
    user_id = $null
} | ConvertTo-Json

try {
    $response6 = Invoke-RestMethod -Uri "$baseUrl/chat" -Method Post -Body $body6 -ContentType "application/json"
    Write-Host "Response: $($response6.response)" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== All Tests Complete ===" -ForegroundColor Cyan

