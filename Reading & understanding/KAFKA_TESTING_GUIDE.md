# 🚀 Kafka Testing Guide

Complete guide to test Kafka integration in the KAYAK Travel Booking System.

## 📋 Prerequisites

1. **Docker Desktop** must be running
2. **MongoDB** should be running on port 27020
3. **Backend services** should be running (at least billing, user, admin services)

---

## 🎯 Step 1: Start Kafka

### Windows (PowerShell):

```powershell
cd kafka
docker-compose up -d
```

### Mac/Linux:

```bash
cd kafka
docker-compose up -d
```

### Verify Kafka is Running:

```bash
docker ps
```

You should see:
- `kayak-zookeeper` (port 2181)
- `kayak-kafka` (port 9092)

**Expected Output:**
```
CONTAINER ID   IMAGE                          STATUS         PORTS
abc123def456   confluentinc/cp-kafka:7.5.0    Up 2 minutes   0.0.0.0:9092->9092/tcp
xyz789uvw012   confluentinc/cp-zookeeper:7.5.0 Up 2 minutes   0.0.0.0:2181->2181/tcp
```

---

## 🎯 Step 2: Start Backend Services with Kafka Consumers

The following services have Kafka consumers:

1. **Billing Service** (Port 5005) - Consumes `booking.created`
2. **User Service** (Port 5001) - Consumes `booking.confirmed`
3. **Admin Service** (Port 5006) - Consumes all booking events
4. **Flight Service** (Port 5002) - Consumes `booking.created`
5. **Hotel Service** (Port 5003) - Consumes `booking.created`
6. **Car Service** (Port 5004) - Consumes `booking.created`

**Start these services:**

```bash
# Terminal 1: Billing Service
cd backend/services/billing-service
npm start

# Terminal 2: User Service
cd backend/services/user-service
npm start

# Terminal 3: Admin Service
cd backend/services/admin-service
npm start

# Terminal 4: Flight Service (optional)
cd backend/services/flight-service
npm start

# Terminal 5: Hotel Service (optional)
cd backend/services/hotel-service
npm start

# Terminal 6: Car Service (optional)
cd backend/services/car-service
npm start
```

**What to Look For in Service Logs:**

When services start, you should see:
```
✅ Kafka consumer billing-service-group connected and subscribed to bookings
```

Or if there's an error:
```
❌ Error connecting Kafka consumer: Connection timeout
```

---

## 🎯 Step 3: Monitor Kafka Messages (Real-Time)

### Option A: Using the Monitoring Script

**Windows:**
```powershell
cd kafka
.\monitor-bookings.ps1
```

**Mac/Linux:**
```bash
cd kafka
chmod +x monitor-bookings.sh
./monitor-bookings.sh
```

### Option B: Using Docker Directly

```bash
docker exec -it kayak-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic bookings \
  --from-beginning \
  --property print.timestamp=true \
  --property print.key=true \
  --property print.value=true
```

**Expected Output:**
```
CreateTime: 1705320000000    key: BOOK123    value: {"eventType":"booking.created","timestamp":"2025-01-15T10:30:00.000Z","bookingId":"BOOK123",...}
```

**Keep this terminal open** - it will show all messages in real-time!

---

## 🎯 Step 4: Test Kafka by Creating a Booking

### Test Method 1: Through the Frontend (Recommended)

1. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open Browser:** http://localhost:5173

3. **Login:**
   - Email: `john.doe@example.com`
   - Password: `password123`

4. **Create a Booking:**
   - Search for a flight/hotel/car
   - Click "Book Now"
   - Complete the booking process

5. **Watch the Kafka Monitor Terminal:**
   - You should see messages appearing in real-time!

**Expected Messages:**
```json
{
  "eventType": "booking.created",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "bookingId": "BKG1234",
  "userId": "692cb77e73b6f6b497c2eb3e",
  "type": "flight",
  "itemId": "FLIGHT001",
  "totalAmount": 299.99
}
```

Then after payment:
```json
{
  "eventType": "booking.confirmed",
  "timestamp": "2025-01-15T10:30:05.000Z",
  "bookingId": "BKG1234",
  "userId": "692cb77e73b6f6b497c2eb3e",
  "paymentStatus": "completed"
}
```

### Test Method 2: Direct API Call

**Create a booking via API:**

```powershell
# 1. Login to get token
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/users/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"john.doe@example.com","password":"password123"}'

$token = $loginResponse.token

# 2. Create a booking (this will trigger Kafka event)
$bookingData = @{
  userId = $loginResponse.user._id
  type = "flight"
  itemId = "FLIGHT001"
  details = @{
    departureAirport = @{ city = "New York"; iataCode = "JFK" }
    arrivalAirport = @{ city = "Los Angeles"; iataCode = "LAX" }
    departureDateTime = "2025-02-01T10:00:00Z"
    arrivalDateTime = "2025-02-01T13:00:00Z"
    airline = "American Airlines"
    price = 299.99
  }
  totalAmount = 299.99
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:5001/api/users/$($loginResponse.user._id)/bookings" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{Authorization = "Bearer $token"} `
  -Body $bookingData
```

**Watch the Kafka monitor** - you should see the event!

### Test Method 3: Using the Billing Service Directly

```powershell
# Create billing record (this publishes booking.created event)
$billingData = @{
  userId = "692cb77e73b6f6b497c2eb3e"
  bookingId = "BKG_TEST_001"
  type = "flight"
  amount = 299.99
  paymentMethod = "credit_card"
  status = "pending"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5005/api/billing" `
  -Method POST `
  -ContentType "application/json" `
  -Body $billingData
```

---

## 🎯 Step 5: Verify Consumer Processing

### Check Service Logs

After a booking is created, check each service's terminal:

**Billing Service Terminal:**
```
📨 Received event: booking.created
✅ Processing booking: BKG1234
✅ Published booking.confirmed event to Kafka
```

**User Service Terminal:**
```
📨 Received event: booking.confirmed
✅ Updating user booking history for user: 692cb77e73b6f6b497c2eb3e
```

**Admin Service Terminal:**
```
📨 Received event: booking.created
📨 Received event: booking.confirmed
✅ Analytics updated for booking: BKG1234
```

**Flight/Hotel/Car Service Terminal:**
```
📨 Received event: booking.created
✅ Updating availability for FLIGHT001
```

---

## 🎯 Step 6: Test Different Event Types

### Test Booking Created Event

```powershell
# This happens automatically when you create a booking
# Check Kafka monitor for: booking.created
```

### Test Booking Confirmed Event

```powershell
# This happens when payment is processed
# Check Kafka monitor for: booking.confirmed
```

### Test Booking Cancelled Event

```powershell
# Cancel a booking through the API
Invoke-RestMethod -Uri "http://localhost:5001/api/users/USER_ID/bookings/BOOKING_ID" `
  -Method DELETE `
  -Headers @{Authorization = "Bearer $token"}
```

**Expected in Kafka:**
```json
{
  "eventType": "booking.cancelled",
  "bookingId": "BKG1234",
  "reason": "user_request"
}
```

---

## ✅ What to Expect - Success Indicators

### ✅ Kafka is Working If:

1. **Docker containers are running:**
   ```bash
   docker ps | grep kafka
   # Should show kayak-kafka and kayak-zookeeper
   ```

2. **Services connect successfully:**
   - Service logs show: `✅ Kafka consumer ... connected`
   - No connection errors

3. **Messages appear in monitor:**
   - When you create a booking, messages appear in the Kafka monitor terminal
   - Messages have proper JSON format
   - Timestamps are included

4. **Consumers process messages:**
   - Service logs show: `📨 Received event: ...`
   - Services perform their actions (update database, send notifications, etc.)

5. **No errors in logs:**
   - No `❌ Error` messages in service logs
   - No timeout errors

---

## ❌ Troubleshooting

### Problem: Kafka containers won't start

**Solution:**
```bash
# Check Docker is running
docker ps

# Check for port conflicts
netstat -ano | findstr :9092  # Windows
lsof -i :9092                  # Mac/Linux

# Restart containers
cd kafka
docker-compose down
docker-compose up -d
```

### Problem: Services can't connect to Kafka

**Error:** `Connection timeout` or `ECONNREFUSED`

**Solution:**
1. Verify Kafka is running: `docker ps`
2. Check Kafka logs: `docker logs kayak-kafka`
3. Verify port 9092 is accessible: `telnet localhost 9092`
4. Check `KAFKA_BROKERS` environment variable in services

### Problem: No messages in Kafka monitor

**Solution:**
1. Verify booking was actually created (check database)
2. Check billing service logs for: `✅ Published booking.created event`
3. Verify you're monitoring the correct topic: `bookings`
4. Try `--from-beginning` flag to see old messages

### Problem: Consumers not receiving messages

**Solution:**
1. Check consumer group ID is unique per service
2. Verify services are subscribed to `bookings` topic
3. Check service logs for connection status
4. Restart the service

### Problem: Messages appear but services don't process them

**Solution:**
1. Check service logs for error messages
2. Verify event handlers are registered
3. Check database connection (services need MongoDB)
4. Verify event format matches expected schema

---

## 📊 Advanced Testing

### List All Topics

```bash
docker exec -it kayak-kafka kafka-topics --list --bootstrap-server localhost:9092
```

**Expected:**
```
bookings
__consumer_offsets
```

### Check Topic Details

```bash
docker exec -it kayak-kafka kafka-topics --describe --topic bookings --bootstrap-server localhost:9092
```

### Check Consumer Groups

```bash
docker exec -it kayak-kafka kafka-consumer-groups --list --bootstrap-server localhost:9092
```

**Expected:**
```
billing-service-group
user-service-group
admin-service-group
flight-service-group
hotel-service-group
car-service-group
```

### Check Consumer Group Status

```bash
docker exec -it kayak-kafka kafka-consumer-groups --describe --group billing-service-group --bootstrap-server localhost:9092
```

---

## 🎯 Quick Test Checklist

- [ ] Docker Desktop is running
- [ ] Kafka containers are up (`docker ps`)
- [ ] Kafka monitor is running and showing messages
- [ ] Backend services are running (billing, user, admin)
- [ ] Services show "Kafka consumer connected" in logs
- [ ] Created a test booking
- [ ] Saw `booking.created` event in Kafka monitor
- [ ] Services processed the event (check logs)
- [ ] Saw `booking.confirmed` event after payment
- [ ] User booking history was updated
- [ ] Admin analytics were updated

---

## 📝 Test Scenarios

### Scenario 1: Complete Booking Flow

1. User searches for flight
2. User clicks "Book Now"
3. **Expected:** `booking.created` event published
4. Billing service processes payment
5. **Expected:** `booking.confirmed` event published
6. User service updates booking history
7. Admin service updates analytics

### Scenario 2: Multiple Bookings

1. Create 3 bookings quickly
2. **Expected:** All 3 `booking.created` events appear in Kafka
3. **Expected:** All services process all events
4. **Expected:** No messages are lost

### Scenario 3: Service Restart

1. Create a booking
2. Stop a consumer service (e.g., user-service)
3. Create another booking
4. Restart the service
5. **Expected:** Service processes missed messages (if `fromBeginning: true`)

---

## 🎉 Success!

If all tests pass, Kafka is working correctly! You should see:

✅ Messages flowing through Kafka  
✅ Services consuming and processing events  
✅ Real-time updates across services  
✅ No errors in logs  

---

**Next:** Test Redis integration!

