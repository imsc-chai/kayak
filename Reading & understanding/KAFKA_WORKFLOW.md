# 🔄 Kafka Workflow - KAYAK Travel Booking System

## 📊 Complete Booking Flow

```
┌─────────────┐
│   USER      │
│  (Frontend) │
└──────┬──────┘
       │ 1. User clicks "Book Now"
       │    POST /api/billing
       ▼
┌─────────────────────┐
│  BILLING SERVICE    │
│  (Port 5005)        │
└──────┬──────────────┘
       │ 2. Create billing record
       │    - Save to MongoDB (billing collection)
       │    - Generate invoice
       │    - Process payment
       │
       │ 3. Publish to Kafka
       │    └─> Topic: "bookings"
       │        Event: "booking.created"
       │        Payload: { bookingId, userId, type, amount, ... }
       │
       ▼
┌─────────────────────┐
│   KAFKA TOPIC       │
│   "bookings"        │
│                     │
│  ┌────────────────┐ │
│  │ booking.created│ │  ← Event published here
│  └────────────────┘ │
└──────┬───────────────┘
       │
       │ 4. Multiple Consumers Subscribe
       │
       ├─────────────────────────────────────┐
       │                                     │
       ▼                                     ▼
┌─────────────────────┐      ┌─────────────────────┐
│   USER SERVICE        │      │   ADMIN SERVICE     │
│   (Port 5001)         │      │   (Port 5006)       │
│                       │      │                     │
│ Consumer Group:       │      │ Consumer Group:     │
│ user-service-group    │      │ admin-service-group │
│                       │      │                     │
│ Action:               │      │ Action:             │
│ - Updates user        │      │ - Updates analytics│
│   bookingHistory      │      │ - Tracks revenue    │
│ - Saves to MongoDB    │      │ - Logs events       │
│   (user collection)   │      │                     │
└───────────────────────┘      └─────────────────────┘
       │
       │
       ▼
┌─────────────────────┐
│  FLIGHT/HOTEL/CAR   │
│  SERVICES           │
│  (Ports 5002-5004)  │
│                     │
│ Consumer Group:     │
│ [service]-group     │
│                     │
│ Action:             │
│ - Updates           │
│   availability      │
│ - Decrements seats/ │
│   rooms/cars        │
└─────────────────────┘
       │
       │ 5. All services updated in their databases
       │
       ▼
┌─────────────┐
│   USER      │
│  (Frontend) │
└──────┬──────┘
       │ 6. Frontend fetches updated data
       │    GET /api/users/:id/bookings
       │    (from User Service)
       │
       ▼
   UI Updates
   ✅ Booking appears in "My Bookings"
```

---

## 🔄 Step-by-Step Flow

### Step 1: User Initiates Booking
- **Location**: Frontend (React)
- **Action**: User clicks "Book Now" on a flight/hotel/car
- **API Call**: `POST /api/billing` (Billing Service)

### Step 2: Billing Service Processes
- **Location**: Billing Service (Port 5005)
- **Actions**:
  1. ✅ Validates booking data
  2. ✅ Creates billing record in MongoDB
  3. ✅ Generates invoice number
  4. ✅ Processes payment
  5. ✅ **Publishes `booking.created` event to Kafka**

### Step 3: Kafka Event Published
- **Topic**: `bookings`
- **Event Type**: `booking.created`
- **Message Contains**:
  ```json
  {
    "eventType": "booking.created",
    "bookingId": "BKG1234",
    "userId": "692cb77e73b6f6b497c2eb3e",
    "type": "flight",
    "totalAmountPaid": 299.99,
    "data": {
      "bookingDetails": { ... }
    }
  }
  ```

### Step 4: Multiple Services Consume Event

#### 4a. User Service (Port 5001)
- **Consumer Group**: `user-service-group`
- **Action**: 
  - Receives `booking.created` event
  - Finds user in MongoDB
  - Adds booking to `user.bookingHistory` array
  - Saves user document
- **Result**: User's booking history updated in MongoDB

#### 4b. Admin Service (Port 5006)
- **Consumer Group**: `admin-service-group`
- **Action**:
  - Receives all booking events
  - Updates analytics (revenue, booking counts)
  - Logs event for reporting
- **Result**: Admin dashboard data updated

#### 4c. Flight/Hotel/Car Services (Ports 5002-5004)
- **Consumer Groups**: `flight-service-group`, `hotel-service-group`, `car-service-group`
- **Action**:
  - Receives `booking.created` event
  - Updates item availability
  - Decrements available seats/rooms/cars
- **Result**: Inventory updated in respective databases

### Step 5: Payment Confirmation (Optional)
- **When**: Payment is successfully processed
- **Action**: Billing Service publishes `booking.confirmed` event
- **Consumers**: 
  - User Service: Updates booking status to "confirmed"
  - Admin Service: Finalizes analytics

### Step 6: Frontend Updates
- **Location**: Frontend (React)
- **Action**: 
  - Fetches updated bookings: `GET /api/users/:id/bookings`
  - Redux store updates
  - UI re-renders with new booking
- **Result**: User sees booking in "My Bookings" page

---

## 🎯 Key Points

### ✅ What Kafka Does:
1. **Decouples Services**: Services don't directly call each other
2. **Event-Driven**: Changes propagate automatically via events
3. **Scalable**: Multiple consumers can process same event
4. **Reliable**: Messages are persisted and can be replayed

### ✅ What Happens in Each Database:

**Billing Service Database:**
- Billing records (payment info, invoices)

**User Service Database:**
- User booking history (synced from Kafka events)

**Admin Service Database:**
- Analytics and statistics (aggregated from events)

**Flight/Hotel/Car Service Databases:**
- Updated availability (seats/rooms/cars decremented)

---

## 🔄 Event Types

### `booking.created`
- **Published By**: Billing Service
- **When**: After billing record is created
- **Consumers**: User Service, Admin Service, Flight/Hotel/Car Services
- **Purpose**: Notify all services about new booking

### `booking.confirmed`
- **Published By**: Billing Service
- **When**: Payment is confirmed
- **Consumers**: User Service, Admin Service
- **Purpose**: Finalize booking status

### `booking.cancelled`
- **Published By**: Billing Service
- **When**: Booking is cancelled
- **Consumers**: User Service, Admin Service, Flight/Hotel/Car Services
- **Purpose**: Update status and restore availability

### `booking.failed`
- **Published By**: Billing Service
- **When**: Payment fails or booking cannot be completed
- **Consumers**: User Service, Admin Service
- **Purpose**: Handle failed bookings

---

## 📝 Important Notes

### Database Updates:
- **Billing Service**: Updates its own database FIRST (before Kafka)
- **Other Services**: Update their databases AFTER consuming Kafka events
- **User Service**: Updates user's bookingHistory from Kafka (not directly)

### Fallback Mechanism:
- If Kafka fails, Billing Service has a fallback:
  - Directly calls User Service API to add booking
  - Ensures booking is still recorded even if Kafka is down

### Order of Operations:
1. ✅ Billing saved to DB
2. ✅ Event published to Kafka
3. ✅ Consumers process event
4. ✅ Services update their databases
5. ✅ Frontend fetches updated data

---

## 🎬 Example Flow

**User books a flight:**

1. User clicks "Book Flight AA601" → Frontend
2. `POST /api/billing` → Billing Service
3. Billing Service saves to MongoDB → `billing` collection
4. Billing Service publishes → Kafka topic `bookings`
5. User Service consumes → Updates `user.bookingHistory`
6. Admin Service consumes → Updates analytics
7. Flight Service consumes → Decrements available seats
8. Frontend fetches → `GET /api/users/:id/bookings`
9. UI shows → Booking in "My Bookings" page

**Total time**: ~1-2 seconds (mostly async)

---

## 🔍 Monitoring

Watch the flow in real-time:
```powershell
cd kafka
.\monitor-bookings.ps1
```

You'll see:
- `booking.created` events when bookings are made
- `booking.confirmed` events when payments complete
- `booking.cancelled` events when bookings are cancelled

---

## ✅ Benefits of This Architecture

1. **Loose Coupling**: Services don't need to know about each other
2. **Scalability**: Can add more consumers without changing producers
3. **Reliability**: Messages are persisted, can replay if service was down
4. **Real-time**: Events propagate immediately
5. **Maintainability**: Easy to add new event handlers

---

**Last Updated**: December 2024

