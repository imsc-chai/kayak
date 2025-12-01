# Kayak Travel Booking System - Complete Setup Guide

## 🎯 Overview

This guide will help you set up and run the complete Kayak Travel Booking System on **Windows** or **Mac**. This includes all microservices, databases, Redis, Kafka, and seeding 10,000+ records with user profiles.

**Repository**: https://github.com/imsc-chai/kayak

---

## 📋 Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version` (should show v18+)

2. **MongoDB** (v7.0 or higher)
   - Windows: Download from https://www.mongodb.com/try/download/community
   - Mac: `brew install mongodb-community@7.0` or download installer
   - Verify: `mongod --version`

3. **Docker Desktop**
   - Windows: https://www.docker.com/products/docker-desktop/
   - Mac: https://www.docker.com/products/docker-desktop/
   - Verify: `docker --version`

4. **Git**
   - Windows: https://git-scm.com/download/win
   - Mac: Usually pre-installed, or `brew install git`
   - Verify: `git --version`

5. **Python 3.8+** (for AI Agent - optional)
   - Windows: https://www.python.org/downloads/
   - Mac: Usually pre-installed, or `brew install python3`
   - Verify: `python --version` or `python3 --version`

---

## 🚀 Step-by-Step Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/imsc-chai/kayak.git
cd kayak
```

### Step 2: Install Dependencies

**Install root dependencies:**
```bash
npm install
```

This will install dependencies for all workspaces (frontend, backend services, API Gateway).

**Install AI Agent dependencies (optional):**
```bash
cd ai-agent
pip install -r requirements.txt
cd ..
```

### Step 3: Start MongoDB

**Windows:**
```powershell
cd frontend
.\start-mongodb-27020.ps1
```

**Mac/Linux:**
```bash
# Create data and log directories
mkdir -p database/data database/logs

# Start MongoDB on port 27020
mongod --port 27020 --dbpath ./database/data --logpath ./database/logs/mongod.log --fork
```

**Verify MongoDB is running:**
```bash
mongosh --port 27020
# Type 'exit' to quit
```

### Step 4: Start Redis and Kafka (Docker)

**Make sure Docker Desktop is running!**

**Windows:**
```powershell
# Start Redis
cd docker
docker-compose up redis -d
cd ..

# Start Kafka and Zookeeper
cd kafka
docker-compose up -d
cd ..
```

**Mac/Linux:**
```bash
# Start Redis
cd docker
docker-compose up redis -d
cd ..

# Start Kafka and Zookeeper
cd kafka
docker-compose up -d
cd ..
```

**Verify Docker containers:**
```bash
docker ps
# Should show: kayak-redis, kayak-kafka, kayak-zookeeper
```

### Step 5: Seed the Database (10,000+ Records)

**This step creates:**
- 2,500+ flights
- 3,500+ hotels
- 4,000+ cars
- Default users (see credentials below)
- Default admin (see credentials below)

**Windows:**
```powershell
cd backend
node seed-bulk-all.js
```

**Mac/Linux:**
```bash
cd backend
node seed-bulk-all.js
```

**This will take 2-5 minutes. Wait for completion.**

**Verify data was seeded:**
```bash
node check-counts.js
```

Should show:
- Flights: ~2,500+
- Hotels: ~3,500+
- Cars: ~4,000+
- Users: Multiple users
- Admins: At least 1 admin

### Step 6: Start All Services

**Windows:**
```powershell
.\start-all.ps1
```

**Mac/Linux:**
```bash
chmod +x start-all.sh
./start-all.sh
```

**Or start manually:**

**Windows (PowerShell):**
```powershell
# Terminal 1: API Gateway
cd backend/api-gateway
npm start

# Terminal 2: User Service
cd backend/services/user-service
npm start

# Terminal 3: Flight Service
cd backend/services/flight-service
npm start

# Terminal 4: Hotel Service
cd backend/services/hotel-service
npm start

# Terminal 5: Car Service
cd backend/services/car-service
npm start

# Terminal 6: Billing Service
cd backend/services/billing-service
npm start

# Terminal 7: Admin Service
cd backend/services/admin-service
npm start

# Terminal 8: Frontend
cd frontend
npm run dev
```

**Mac/Linux (Terminal):**
```bash
# Same commands as Windows, but use separate terminal windows/tabs
```

### Step 7: Start AI Agent (Optional)

**Windows:**
```powershell
cd ai-agent
python -m uvicorn app.main:app --reload --port 8000
```

**Mac/Linux:**
```bash
cd ai-agent
python3 -m uvicorn app.main:app --reload --port 8000
```

### Step 8: Verify Everything is Running

**Check services:**
- Frontend: http://localhost:5173
- API Gateway: http://localhost:5000
- AI Agent: http://localhost:8000

**Check service health:**
```bash
curl http://localhost:5001/health  # User Service
curl http://localhost:5002/health  # Flight Service
curl http://localhost:5003/health  # Hotel Service
curl http://localhost:5004/health  # Car Service
curl http://localhost:5005/health  # Billing Service
curl http://localhost:5006/health  # Admin Service
```

Each should return: `{"status":"ok","service":"..."}`

---

## 🔑 Default Credentials

After seeding, you can login with:

### User Accounts
Check `backend/SEED_CREDENTIALS.txt` for user credentials, or use:
- Email: `user@example.com`
- Password: `password123`

### Admin Account
- Email: `admin@kayak.com`
- Password: `admin123`

**⚠️ Change these passwords in production!**

---

## 📊 Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 5173 | http://localhost:5173 |
| API Gateway | 5000 | http://localhost:5000 |
| User Service | 5001 | http://localhost:5001 |
| Flight Service | 5002 | http://localhost:5002 |
| Hotel Service | 5003 | http://localhost:5003 |
| Car Service | 5004 | http://localhost:5004 |
| Billing Service | 5005 | http://localhost:5005 |
| Admin Service | 5006 | http://localhost:5006 |
| AI Agent | 8000 | http://localhost:8000 |
| MongoDB | 27020 | mongodb://localhost:27020 |
| Redis | 6379 | localhost:6379 |
| Kafka | 9092 | localhost:9092 |

---

## 🛠️ Troubleshooting

### MongoDB Won't Start

**Error:** `Port 27020 already in use`

**Windows:**
```powershell
netstat -ano | findstr :27020
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -ti:27020 | xargs kill -9
```

**Error:** `MongoDB data directory not found`

**Solution:** Create directories:
```bash
mkdir -p database/data database/logs
```

### Docker Containers Won't Start

**Error:** `Docker daemon not running`

**Solution:**
1. Start Docker Desktop
2. Wait for it to fully start
3. Try again

**Error:** `Port already in use`

**Windows:**
```powershell
# Check what's using the port
netstat -ano | findstr :6379  # Redis
netstat -ano | findstr :9092  # Kafka

# Stop the process
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -ti:6379 | xargs kill -9  # Redis
lsof -ti:9092 | xargs kill -9  # Kafka
```

### Services Won't Connect to MongoDB

**Error:** `MongoDB connection error`

**Solution:**
1. Verify MongoDB is running: `mongosh --port 27020`
2. Check MongoDB logs: `database/logs/mongod.log`
3. Ensure port 27020 is not blocked by firewall

### Services Won't Connect to Redis/Kafka

**Error:** `Redis connection error` or `Kafka connection error`

**Solution:**
1. Verify Docker containers are running: `docker ps`
2. Check container logs: `docker logs kayak-redis` or `docker logs kayak-kafka`
3. Restart containers if needed:
   ```bash
   docker restart kayak-redis
   docker restart kayak-kafka kayak-zookeeper
   ```

### Database Seeding Fails

**Error:** `ValidationError` or `Duplicate key error`

**Solution:**
1. Clear existing data (optional):
   ```bash
   mongosh --port 27020
   use kayak_flights
   db.flights.deleteMany({})
   # Repeat for hotels, cars, users, etc.
   ```
2. Run seed again: `node seed-bulk-all.js`

### Port Already in Use

**Error:** `Port 5001 already in use` (or any port)

**Windows:**
```powershell
netstat -ano | findstr :5001
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -ti:5001 | xargs kill -9
```

### Dependencies Not Installing

**Error:** `Cannot find module 'express'`

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Frontend Not Loading

**Error:** Blank page or connection errors

**Solution:**
1. Check if frontend is running: http://localhost:5173
2. Check browser console for errors
3. Verify all backend services are running
4. Check API Gateway is running on port 5000

---

## 📁 Project Structure

```
kayak/
├── frontend/                 # React/Redux Frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Redux store
│   │   └── services/        # API services
│   └── package.json
│
├── backend/
│   ├── api-gateway/         # API Gateway (Port 5000)
│   ├── services/
│   │   ├── user-service/    # User management (Port 5001)
│   │   ├── flight-service/  # Flight management (Port 5002)
│   │   ├── hotel-service/   # Hotel management (Port 5003)
│   │   ├── car-service/     # Car rental (Port 5004)
│   │   ├── billing-service/ # Billing & payments (Port 5005)
│   │   └── admin-service/   # Admin dashboard (Port 5006)
│   └── shared/              # Shared utilities
│
├── ai-agent/                # FastAPI AI Service (Port 8000)
├── database/                 # MongoDB data and logs
├── docker/                   # Docker Compose for Redis
├── kafka/                    # Kafka configuration
├── jmeter/                   # Performance testing
├── scripts/                  # Utility scripts
└── SETUP_GUIDE.md           # This file
```

---

## 🔄 Daily Startup (After Initial Setup)

Once everything is set up, starting the system daily is simple:

### Quick Start (Windows):
```powershell
# 1. Start MongoDB
cd frontend
.\start-mongodb-27020.ps1

# 2. Start everything else
cd ..
.\start-all.ps1
```

### Quick Start (Mac/Linux):
```bash
# 1. Start MongoDB
mongod --port 27020 --dbpath ./database/data --logpath ./database/logs/mongod.log --fork

# 2. Start Docker containers
cd docker && docker-compose up redis -d && cd ..
cd kafka && docker-compose up -d && cd ..

# 3. Start all services
./start-all.sh
```

**Your data persists automatically!** MongoDB stores data on disk, so all your users, bookings, flights, hotels, and cars will still be there.

---

## 🛑 Shutting Down

### Stop Services:
- Close all terminal windows running services (Ctrl+C)
- Or close the terminal windows

### Stop Docker Containers:
```bash
docker stop kayak-redis kayak-kafka kayak-zookeeper
```

### Stop MongoDB:
**Windows:** Close the PowerShell window running MongoDB, or:
```powershell
taskkill /F /IM mongod.exe
```

**Mac/Linux:**
```bash
# Find MongoDB process
ps aux | grep mongod
# Kill it
kill <PID>
# Or if started with --fork:
mongosh --port 27020 --eval "db.shutdownServer()"
```

---

## 📝 Important Notes

1. **Data Persistence**: MongoDB data is stored in `database/data/` and persists between restarts
2. **Environment Variables**: Default values are provided, but you can create `.env` files in each service for customization
3. **Port Conflicts**: If ports are in use, either stop the conflicting service or change ports in service configuration
4. **Docker Required**: Redis and Kafka require Docker Desktop to be running
5. **Database Seeding**: Only needed once (or if you clear the database). Data persists after seeding.

---

## 🆘 Need Help?

1. Check the troubleshooting section above
2. Check service logs in terminal windows
3. Check MongoDB logs: `database/logs/mongod.log`
4. Check Docker logs: `docker logs kayak-redis` or `docker logs kayak-kafka`
5. Open an issue on GitHub: https://github.com/imsc-chai/kayak/issues

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] MongoDB is running on port 27020
- [ ] Redis container is running (`docker ps`)
- [ ] Kafka containers are running (`docker ps`)
- [ ] All 6 microservices are running (check terminal windows)
- [ ] API Gateway is running on port 5000
- [ ] Frontend is accessible at http://localhost:5173
- [ ] Database has 10,000+ records (`node backend/check-counts.js`)
- [ ] Can login with default credentials
- [ ] Can search flights, hotels, cars
- [ ] Can create bookings

---

**Last Updated**: December 2025
**Repository**: https://github.com/imsc-chai/kayak

