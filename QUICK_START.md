# 🚀 Quick Start Guide for Your Friend

## Simple 3-Step Setup

### Step 1: Install Prerequisites

Make sure these are installed:
- ✅ **Node.js** (v16+) - https://nodejs.org/
- ✅ **MongoDB** (v7.0+) - https://www.mongodb.com/try/download/community
- ✅ **Docker Desktop** - https://www.docker.com/products/docker-desktop

### Step 2: Install Dependencies

Open PowerShell in the project folder and run:

```powershell
# Install all backend dependencies
cd backend\services\admin-service && npm install && cd ..\..
cd user-service && npm install && cd ..\..
cd flight-service && npm install && cd ..\..
cd hotel-service && npm install && cd ..\..
cd car-service && npm install && cd ..\..
cd billing-service && npm install && cd ..\..\..\..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 3: Start Everything

**Option A: Use the Quick Start Script (Easiest)**

```powershell
.\start-all.ps1
```

**Option B: Manual Start**

1. **Start MongoDB:**
   ```powershell
   # Create data folder
   New-Item -ItemType Directory -Path "data\mongodb" -Force
   
   # Start MongoDB (adjust path to your MongoDB installation)
   "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath "$PWD\data\mongodb" --port 27020
   ```

2. **Start Kafka:**
   ```powershell
   cd kafka
   docker-compose up -d
   cd ..
   ```

3. **Start All Services:**
   - Open 6 separate terminal windows
   - In each, run:
     ```powershell
     # Terminal 1
     cd backend\services\admin-service && npm start
     
     # Terminal 2
     cd backend\services\user-service && npm start
     
     # Terminal 3
     cd backend\services\flight-service && npm start
     
     # Terminal 4
     cd backend\services\hotel-service && npm start
     
     # Terminal 5
     cd backend\services\car-service && npm start
     
     # Terminal 6
     cd backend\services\billing-service && npm start
     ```

4. **Start Frontend:**
   ```powershell
   cd frontend
   npm run dev
   ```

5. **Open Browser:**
   - Go to: http://localhost:5173

---

## 🎯 What Your Friend Needs to Know

### Ports Used:
- **5001** - User Service
- **5002** - Flight Service
- **5003** - Hotel Service
- **5004** - Car Service
- **5005** - Billing Service
- **5006** - Admin Service
- **5173** - Frontend
- **27020** - MongoDB
- **9092** - Kafka
- **2181** - Zookeeper

### First Time Setup:
1. **Seed the database** (optional but recommended):
   ```powershell
   cd backend\services\user-service && node seed.js && cd ..\..
   cd flight-service && node seed.js && cd ..\..
   cd hotel-service && node seed.js && cd ..\..
   cd car-service && node seed.js && cd ..\..
   ```

2. **Create an admin account** or use seeded credentials from `SEED_CREDENTIALS.txt`

### Access Points:
- **User App:** http://localhost:5173
- **Admin Dashboard:** http://localhost:5173/admin/login

---

## ⚠️ Common Issues

### "Port already in use"
- Stop any services using those ports
- Check: `netstat -ano | findstr ":5001"` (replace with your port)
- Kill: `Stop-Process -Id <PID> -Force`

### "MongoDB connection failed"
- Make sure MongoDB is running
- Check port 27020 is available
- Verify MongoDB path is correct

### "Kafka not working"
- Make sure Docker Desktop is running
- Check: `docker ps` (should see kayak-kafka and kayak-zookeeper)
- Restart: `cd kafka && docker-compose restart`

### "Services not starting"
- Make sure all `npm install` completed successfully
- Check Node.js version: `node --version` (should be 16+)
- Check service logs for specific errors

---

## 📝 Full Instructions

For detailed setup instructions, see **SETUP_INSTRUCTIONS.md**

---

## 💡 Pro Tips

1. **Keep all terminal windows open** while using the app
2. **Start MongoDB first**, then services
3. **Wait 10-15 seconds** after starting services before using the app
4. **Use the quick start script** (`start-all.ps1`) for easiest setup
5. **Check console logs** if something doesn't work

Good luck! 🎉

