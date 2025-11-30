# 🍎 MacBook Setup Guide - KAYAK Travel Booking System

Complete step-by-step guide to set up and run the KAYAK Travel Booking System on macOS.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [MongoDB Setup](#mongodb-setup)
4. [Database Seeding](#database-seeding)
5. [Backend Services Setup](#backend-services-setup)
6. [Frontend Setup](#frontend-setup)
7. [AI Agent Setup (Optional)](#ai-agent-setup-optional)
8. [Kafka Setup (Optional)](#kafka-setup-optional)
9. [Running the Application](#running-the-application)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)

---

## 📦 Prerequisites

### 1. Install Homebrew (Package Manager)

If you don't have Homebrew installed:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Verify installation:
```bash
brew --version
```

### 2. Install Node.js (v18 or higher)

```bash
brew install node@18
```

Or install the latest LTS version:
```bash
brew install node
```

Verify installation:
```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be v9.0.0 or higher
```

### 3. Install MongoDB

```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
```

**Start MongoDB service:**
```bash
brew services start mongodb-community@7.0
```

Verify MongoDB is installed:
```bash
mongod --version
mongosh --version
```

### 4. Install Python 3.10+ (For AI Agent)

```bash
brew install python@3.11
```

Verify installation:
```bash
python3 --version  # Should be 3.10 or higher
pip3 --version
```

### 5. Install Docker Desktop (For Kafka)

Download and install from: https://www.docker.com/products/docker-desktop/

Or using Homebrew:
```bash
brew install --cask docker
```

After installation, open Docker Desktop from Applications and ensure it's running.

Verify Docker:
```bash
docker --version
docker-compose --version
```

### 6. Install Git

```bash
brew install git
```

Verify:
```bash
git --version
```

---

## 🚀 Initial Setup

### Step 1: Clone the Repository

```bash
cd ~
git clone https://github.com/imsc-chai/kayak.git
cd kayak
```

### Step 2: Install Root Dependencies

```bash
npm install
```

This will install dependencies for the root project and shared packages.

### Step 3: Install Backend Service Dependencies

```bash
# Install dependencies for all backend services
cd backend/services/user-service && npm install && cd ../../..
cd backend/services/flight-service && npm install && cd ../../..
cd backend/services/hotel-service && npm install && cd ../../..
cd backend/services/car-service && npm install && cd ../../..
cd backend/services/billing-service && npm install && cd ../../..
cd backend/services/admin-service && npm install && cd ../../..
cd backend/api-gateway && npm install && cd ../..
cd backend/shared && npm install && cd ../..
```

**Or use this one-liner:**
```bash
find backend -name "package.json" -not -path "*/node_modules/*" -execdir npm install \;
```

### Step 4: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 5: Install Kafka Dependencies (Optional)

```bash
cd kafka
npm install
cd ..
```

---

## 🗄️ MongoDB Setup

### Step 1: Create Database Directories

```bash
mkdir -p database/data
mkdir -p database/logs
```

### Step 2: Start MongoDB on Port 27020

**Option A: Using MongoDB service (Recommended)**

First, stop the default MongoDB service:
```bash
brew services stop mongodb-community@7.0
```

Then start MongoDB on port 27020:
```bash
mongod --port 27020 --dbpath ./database/data --logpath ./database/logs/mongod.log --fork
```

**Option B: Run in foreground (for debugging)**

```bash
mongod --port 27020 --dbpath ./database/data --logpath ./database/logs/mongod.log
```

Keep this terminal open. Press `Ctrl+C` to stop.

### Step 3: Verify MongoDB is Running

Open a new terminal and run:
```bash
mongosh --port 27020
```

You should see:
```
Current Mongosh Log ID: ...
Connecting to: mongodb://127.0.0.1:27020/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+...
Using MongoDB: ...
Using Mongosh: ...
```

Type `exit` to quit.

### Step 4: Check MongoDB Status

```bash
# Check if MongoDB is listening on port 27020
lsof -i :27020
```

You should see a `mongod` process.

---

## 🌱 Database Seeding

### Step 1: Seed All Data

This will populate the database with:
- 20 Flights
- 20 Hotels
- 20 Cars
- 5 Users
- 3 Admins
- Booking history
- Reviews
- Analytics data

```bash
node backend/seed-all.js
```

**Expected output:**
```
🌱 Starting database seeding process...

📦 Seeding Flights...
✅ Flights seeded successfully!

📦 Seeding Hotels...
✅ Hotels seeded successfully!

📦 Seeding Cars...
✅ Cars seeded successfully!

📦 Seeding Users...
✅ Users seeded successfully!

📦 Seeding Admins...
✅ Admins seeded successfully!

🎉 All seeding completed successfully!

📋 SUMMARY:
  ✅ 20 Flights
  ✅ 20 Hotels
  ✅ 20 Cars
  ✅ 5 Users
  ✅ 3 Admins
```

### Step 2: Verify Seeded Data

Connect to MongoDB:
```bash
mongosh --port 27020
```

Check collections:
```javascript
use kayak_users
show collections
db.users.countDocuments()
db.bookings.countDocuments()

use kayak_flights
db.flights.countDocuments()

use kayak_hotels
db.hotels.countDocuments()

use kayak_cars
db.cars.countDocuments()

use kayak_admins
db.admins.countDocuments()

exit
```

### Step 3: Default Credentials

After seeding, you can use these credentials:

**User Accounts:**
- Email: `john.doe@example.com` | Password: `password123`
- Email: `jane.smith@example.com` | Password: `password123`
- Email: `michael.johnson@example.com` | Password: `password123`
- Email: `emily.williams@example.com` | Password: `password123`
- Email: `david.brown@example.com` | Password: `password123`

**Admin Accounts:**
- Email: `admin@kayak.com` | Password: `admin123` (Super Admin)
- Email: `manager@kayak.com` | Password: `admin123` (Admin)
- Email: `moderator@kayak.com` | Password: `admin123` (Moderator)

See `SEED_CREDENTIALS.txt` for full details.

---

## 🔧 Backend Services Setup

### Service Ports

| Service | Port | URL |
|---------|------|-----|
| User Service | 5001 | http://localhost:5001 |
| Flight Service | 5002 | http://localhost:5002 |
| Hotel Service | 5003 | http://localhost:5003 |
| Car Service | 5004 | http://localhost:5004 |
| Billing Service | 5005 | http://localhost:5005 |
| Admin Service | 5006 | http://localhost:5006 |
| API Gateway | 5000 | http://localhost:5000 |

### Environment Variables (Optional)

Each service has default configurations. You can create `.env` files if needed:

**Example for `backend/services/user-service/.env`:**
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27020/kayak_users
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

**Note:** The project works with default values, so you can skip this step.

---

## 🎨 Frontend Setup

The frontend is a React application using Vite.

### Configuration

The frontend is already configured. No additional setup needed.

### Port

Frontend runs on: **http://localhost:5173**

---

## 🤖 AI Agent Setup (Optional)

### Step 1: Install Python Dependencies

```bash
cd ai-agent
pip3 install -r requirements.txt
cd ..
```

### Step 2: Create Environment File

Create `ai-agent/.env`:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo

# Optional - for real-time weather information
WEATHER_API_KEY=your_openweathermap_api_key_here

# Service URLs (defaults shown)
USER_SERVICE_URL=http://localhost:5001
FLIGHT_SERVICE_URL=http://localhost:5002
HOTEL_SERVICE_URL=http://localhost:5003
CAR_SERVICE_URL=http://localhost:5004

# Server Configuration
PORT=8000
```

### Step 3: Get API Keys

1. **OpenAI API Key:**
   - Sign up at https://platform.openai.com/
   - Create an API key in your account settings
   - Add credits to your account

2. **OpenWeatherMap API Key (Optional):**
   - Sign up for free at https://openweathermap.org/api
   - Get your API key from the dashboard

### Step 4: Run AI Agent

```bash
cd ai-agent
python3 -m uvicorn app.main:app --reload --port 8000
```

The AI Agent will run on: **http://localhost:8000**

---

## 📨 Kafka Setup (Optional)

### Step 1: Start Kafka and Zookeeper

```bash
cd kafka
docker-compose up -d
cd ..
```

This will start:
- Zookeeper on port 2181
- Kafka on port 9092

### Step 2: Verify Kafka is Running

```bash
docker ps
```

You should see `kayak-zookeeper` and `kayak-kafka` containers running.

### Step 3: Stop Kafka (when needed)

```bash
cd kafka
docker-compose down
cd ..
```

---

## 🚀 Running the Application

### Option 1: Automated Script (Recommended)

```bash
chmod +x start-all.sh
./start-all.sh
```

This script will:
1. Check and start MongoDB
2. Start all backend services in separate terminal windows
3. Start the frontend
4. Verify all services are running

### Option 2: Manual Start (Step by Step)

#### Terminal 1: MongoDB
```bash
mongod --port 27020 --dbpath ./database/data --logpath ./database/logs/mongod.log
```

#### Terminal 2: User Service
```bash
cd backend/services/user-service
npm start
```

#### Terminal 3: Flight Service
```bash
cd backend/services/flight-service
npm start
```

#### Terminal 4: Hotel Service
```bash
cd backend/services/hotel-service
npm start
```

#### Terminal 5: Car Service
```bash
cd backend/services/car-service
npm start
```

#### Terminal 6: Billing Service
```bash
cd backend/services/billing-service
npm start
```

#### Terminal 7: Admin Service
```bash
cd backend/services/admin-service
npm start
```

#### Terminal 8: API Gateway (Optional)
```bash
cd backend/api-gateway
npm start
```

#### Terminal 9: Frontend
```bash
cd frontend
npm run dev
```

#### Terminal 10: AI Agent (Optional)
```bash
cd ai-agent
python3 -m uvicorn app.main:app --reload --port 8000
```

#### Terminal 11: Kafka (Optional)
```bash
cd kafka
docker-compose up
```

### Option 3: Using npm Scripts

```bash
# Start all services (if configured in package.json)
npm run start:all

# Or start individually
npm run start:user      # User Service
npm run start:flight    # Flight Service
npm run start:hotel     # Hotel Service
npm run start:car       # Car Service
npm run start:billing   # Billing Service
npm run start:admin     # Admin Service
npm run start:gateway   # API Gateway
npm run dev:frontend    # Frontend
```

---

## ✅ Testing

### Step 1: Verify All Services are Running

Check each service:

```bash
# User Service
curl http://localhost:5001/health

# Flight Service
curl http://localhost:5002/health

# Hotel Service
curl http://localhost:5003/health

# Car Service
curl http://localhost:5004/health

# Billing Service
curl http://localhost:5005/health

# Admin Service
curl http://localhost:5006/health

# API Gateway
curl http://localhost:5000/health

# AI Agent (if running)
curl http://localhost:8000/health
```

Each should return: `{"status":"ok","service":"..."}`

### Step 2: Access the Application

1. **Frontend:** Open http://localhost:5173 in your browser
2. **Admin Dashboard:** Open http://localhost:5173/admin/login

### Step 3: Test User Login

1. Go to http://localhost:5173
2. Click "Login"
3. Use credentials:
   - Email: `john.doe@example.com`
   - Password: `password123`

### Step 4: Test Admin Login

1. Go to http://localhost:5173/admin/login
2. Use credentials:
   - Email: `admin@kayak.com`
   - Password: `admin123`

### Step 5: Test Features

**User Features:**
- ✅ Search flights, hotels, cars
- ✅ View search results
- ✅ Book flights, hotels, cars
- ✅ View booking history
- ✅ Submit reviews
- ✅ View profile
- ✅ Add favorites

**Admin Features:**
- ✅ View analytics dashboard
- ✅ Manage flights (CRUD)
- ✅ Manage hotels (CRUD)
- ✅ Manage cars (CRUD)
- ✅ Manage users
- ✅ View revenue reports
- ✅ View booking statistics

**AI Agent Features (if enabled):**
- ✅ Natural language search
- ✅ Booking details query
- ✅ Trip planning checklist
- ✅ Trip suggestions
- ✅ Weather queries (if API key set)

### Step 6: Test API Endpoints

**Search Flights:**
```bash
curl "http://localhost:5002/api/flights?to=Los%20Angeles"
```

**Search Hotels:**
```bash
curl "http://localhost:5003/api/hotels?city=New%20York"
```

**Search Cars:**
```bash
curl "http://localhost:5004/api/cars?city=Miami"
```

**Get User Bookings:**
```bash
# First, login to get a token
curl -X POST http://localhost:5001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@example.com","password":"password123"}'

# Use the token from response
curl http://localhost:5001/api/users/USER_ID/bookings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🐛 Troubleshooting

### MongoDB Issues

**Problem: Port 27020 already in use**

```bash
# Find the process
lsof -i :27020

# Kill the process
kill -9 <PID>
```

**Problem: MongoDB won't start**

```bash
# Check if MongoDB is already running as a service
brew services list

# Stop the service
brew services stop mongodb-community@7.0

# Start manually on port 27020
mongod --port 27020 --dbpath ./database/data --logpath ./database/logs/mongod.log --fork
```

**Problem: Permission denied on database/data**

```bash
# Fix permissions
chmod -R 755 database/data
chmod -R 755 database/logs
```

### Node.js Issues

**Problem: Port already in use**

```bash
# Find process on port
lsof -i :5001  # Replace with your port

# Kill the process
kill -9 <PID>
```

**Problem: Module not found errors**

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Do this for each service that has issues
cd backend/services/user-service
rm -rf node_modules package-lock.json
npm install
```

**Problem: npm install fails**

```bash
# Clear npm cache
npm cache clean --force

# Try again
npm install
```

### Python/AI Agent Issues

**Problem: Python not found**

```bash
# Check Python installation
which python3
python3 --version

# If not installed
brew install python@3.11
```

**Problem: pip install fails**

```bash
# Upgrade pip
pip3 install --upgrade pip

# Try installing again
cd ai-agent
pip3 install -r requirements.txt
```

**Problem: OpenAI API errors**

- Check your API key is correct in `ai-agent/.env`
- Verify you have credits in your OpenAI account
- Check the API key has proper permissions

### Docker/Kafka Issues

**Problem: Docker not running**

```bash
# Start Docker Desktop
open -a Docker

# Wait for it to start, then verify
docker ps
```

**Problem: Kafka containers won't start**

```bash
# Check Docker logs
docker-compose -f kafka/docker-compose.yml logs

# Restart containers
cd kafka
docker-compose down
docker-compose up -d
```

**Problem: Port 9092 or 2181 already in use**

```bash
# Find and kill processes
lsof -i :9092
lsof -i :2181
kill -9 <PID>
```

### Frontend Issues

**Problem: Frontend won't load**

1. Check if frontend is running: http://localhost:5173
2. Check browser console for errors (F12)
3. Verify all backend services are running
4. Check `frontend/src/services/api.js` for correct API URLs

**Problem: CORS errors**

- Ensure backend services are running
- Check CORS configuration in backend services
- Verify API URLs in frontend are correct

### Database Connection Issues

**Problem: Services can't connect to MongoDB**

1. Verify MongoDB is running:
   ```bash
   mongosh --port 27020
   ```

2. Check MongoDB logs:
   ```bash
   tail -f database/logs/mongod.log
   ```

3. Verify connection string in service code matches:
   ```
   mongodb://localhost:27020/kayak_users
   ```

### General Issues

**Problem: Services start but immediately crash**

1. Check service logs in terminal
2. Verify MongoDB is running
3. Check if required ports are available
4. Verify all dependencies are installed

**Problem: Data not showing**

1. Verify database was seeded:
   ```bash
   mongosh --port 27020
   use kayak_users
   db.users.countDocuments()
   ```

2. Re-seed if needed:
   ```bash
   node backend/seed-all.js
   ```

**Problem: Can't login**

1. Verify user exists in database
2. Check if password is correct (see SEED_CREDENTIALS.txt)
3. Verify JWT_SECRET is set (or using default)
4. Check browser console for errors

---

## 📝 Important Notes

### Data Persistence

- MongoDB data is stored in `./database/data`
- **DO NOT delete this directory** unless you want to lose all data
- To backup: Copy the `database/data` directory
- To restore: Replace `database/data` with your backup

### Ports Used

Make sure these ports are available:
- 27020 (MongoDB)
- 5000 (API Gateway)
- 5001 (User Service)
- 5002 (Flight Service)
- 5003 (Hotel Service)
- 5004 (Car Service)
- 5005 (Billing Service)
- 5006 (Admin Service)
- 5173 (Frontend)
- 8000 (AI Agent)
- 9092 (Kafka)
- 2181 (Zookeeper)

### Environment Variables

Most services work with defaults. You only need to set:
- `OPENAI_API_KEY` (for AI Agent)
- `WEATHER_API_KEY` (optional, for weather queries)

### Development vs Production

This setup is for **development only**. For production:
- Use environment variables for all secrets
- Set up proper authentication
- Configure CORS properly
- Use HTTPS
- Set up proper logging
- Configure rate limiting
- Use a production database

---

## 🎯 Quick Reference

### Start Everything
```bash
./start-all.sh
```

### Seed Database
```bash
node backend/seed-all.js
```

### Check Services
```bash
curl http://localhost:5001/health
curl http://localhost:5002/health
curl http://localhost:5003/health
curl http://localhost:5004/health
curl http://localhost:5005/health
curl http://localhost:5006/health
```

### Stop MongoDB
```bash
# If running in foreground: Ctrl+C
# If running as fork:
kill $(lsof -t -i:27020)
```

### Stop All Services
```bash
# Kill all Node processes
pkill -f node

# Stop MongoDB
kill $(lsof -t -i:27020)

# Stop Kafka
cd kafka && docker-compose down
```

### Access Points
- Frontend: http://localhost:5173
- Admin Login: http://localhost:5173/admin/login
- API Gateway: http://localhost:5000
- AI Agent: http://localhost:8000

---

## 📞 Need Help?

If you encounter issues:
1. Check the Troubleshooting section above
2. Check service logs in terminal windows
3. Verify MongoDB is running: `mongosh --port 27020`
4. Verify all dependencies are installed
5. Check GitHub Issues: https://github.com/imsc-chai/kayak/issues

---

## ✅ Checklist

Before you start coding, ensure:

- [ ] Node.js v18+ installed
- [ ] MongoDB installed and running on port 27020
- [ ] All npm dependencies installed
- [ ] Database seeded with data
- [ ] All backend services running
- [ ] Frontend running on port 5173
- [ ] Can access http://localhost:5173
- [ ] Can login with test user
- [ ] Can login with admin account
- [ ] AI Agent running (if using)
- [ ] Kafka running (if using)

---

**Last Updated:** December 2024

**Repository:** https://github.com/imsc-chai/kayak

