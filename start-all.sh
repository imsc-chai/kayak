#!/bin/bash

# Kayak Travel Booking System - Quick Start Script (Mac/Linux)
# This script starts all services in separate terminal windows

echo "=== KAYAK TRAVEL BOOKING SYSTEM ==="
echo "Starting all services..."
echo ""

# Check if Docker is running
echo "Checking Docker..."
if ! docker ps > /dev/null 2>&1; then
    echo "⚠️  Docker might not be running. Please start Docker Desktop first!"
    read -p "Press any key to continue anyway..."
fi

# Start Redis (if not already running)
echo "Starting Redis..."
if ! docker ps --filter "name=kayak-redis" --format "{{.Names}}" | grep -q kayak-redis; then
    cd docker
    docker-compose up redis -d
    cd ..
    sleep 2
else
    echo "✅ Redis is already running"
fi

# Start Kafka
echo "Starting Kafka and Zookeeper..."
cd kafka
docker-compose up -d
cd ..
sleep 3

# Start Backend Services
echo "Starting backend services..."

# API Gateway
osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/backend/api-gateway\" && echo \"=== API GATEWAY (Port 5000) ===\" && npm start"'
sleep 1

# Admin Service
osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/backend/services/admin-service\" && echo \"=== ADMIN SERVICE (Port 5006) ===\" && npm start"'
sleep 1

# User Service
osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/backend/services/user-service\" && echo \"=== USER SERVICE (Port 5001) ===\" && npm start"'
sleep 1

# Flight Service
osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/backend/services/flight-service\" && echo \"=== FLIGHT SERVICE (Port 5002) ===\" && npm start"'
sleep 1

# Hotel Service
osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/backend/services/hotel-service\" && echo \"=== HOTEL SERVICE (Port 5003) ===\" && npm start"'
sleep 1

# Car Service
osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/backend/services/car-service\" && echo \"=== CAR SERVICE (Port 5004) ===\" && npm start"'
sleep 1

# Billing Service
osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/backend/services/billing-service\" && echo \"=== BILLING SERVICE (Port 5005) ===\" && npm start"'
sleep 2

# Start Frontend
echo "Starting frontend..."
osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/frontend\" && echo \"=== FRONTEND (Port 5173) ===\" && echo \"Starting Vite dev server...\" && npm run dev"'

echo ""
echo "=== ALL SERVICES STARTED ==="
echo ""
echo "Services running:"
echo "  - API Gateway: http://localhost:5000"
echo "  - Kafka & Zookeeper (Docker)"
echo "  - Admin Service: http://localhost:5006"
echo "  - User Service: http://localhost:5001"
echo "  - Flight Service: http://localhost:5002"
echo "  - Hotel Service: http://localhost:5003"
echo "  - Car Service: http://localhost:5004"
echo "  - Billing Service: http://localhost:5005"
echo "  - Frontend: http://localhost:5173"
echo ""
echo "⚠️  IMPORTANT:"
echo "  1. Make sure MongoDB is running on port 27020"
echo "  2. Wait 10-15 seconds for all services to start"
echo "  3. Open http://localhost:5173 in your browser"
echo ""
