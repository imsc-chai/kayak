# Microservices in Kayak Travel Booking System

## What are Microservices?

**Microservices** are a software architecture pattern where a large application is broken down into **small, independent services** that:
- Each handle a **specific business function**
- Run **independently** (can be developed, deployed, and scaled separately)
- **Communicate** with each other via APIs or messaging
- Have their **own database** (or share databases strategically)

### Traditional Monolithic vs Microservices

**Monolithic (Old Way)**:
```
┌─────────────────────────────┐
│   Single Large Application  │
│  - Users                    │
│  - Flights                  │
│  - Hotels                   │
│  - Cars                     │
│  - Billing                  │
│  - Admin                    │
└─────────────────────────────┘
```
- One big codebase
- If one part breaks, everything breaks
- Hard to scale individual features

**Microservices (Our Way)**:
```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  User    │  │  Flight  │  │  Hotel  │  │   Car   │
│ Service  │  │ Service  │  │ Service │  │ Service │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```
- Separate services
- If one breaks, others keep working
- Can scale each service independently

---

## Microservices in Our Kayak Project

We have **6 microservices** + **1 API Gateway**:

### 1. **User Service** (Port 5001)
**Purpose**: Manages user accounts and authentication

**Responsibilities**:
- User registration and login
- User profile management
- User authentication (JWT tokens)
- User booking history
- User favorites
- User reviews

**Database**: `kayak_users` collection in MongoDB

**Key Features**:
- JWT-based authentication
- Password hashing
- User preferences storage
- Listens to Kafka events for booking updates

**API Endpoints**:
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `GET /api/users/:id/bookings` - Get user bookings

---

### 2. **Flight Service** (Port 5002)
**Purpose**: Manages flight listings and bookings

**Responsibilities**:
- Flight CRUD operations (Create, Read, Update, Delete)
- Flight search and filtering
- Flight availability management
- Seat management
- Flight reviews
- Price drop notifications

**Database**: `kayak_flights` collection in MongoDB

**Key Features**:
- Flight search by origin, destination, date
- Seat map management
- Round-trip and one-way flights
- Listens to Kafka events for booking updates
- Redis caching for performance

**API Endpoints**:
- `GET /api/flights` - Search flights
- `GET /api/flights/:id` - Get flight details
- `POST /api/flights` - Create flight (admin)
- `PUT /api/flights/:id` - Update flight (admin)
- `POST /api/flights/:id/reviews` - Add review

---

### 3. **Hotel Service** (Port 5003)
**Purpose**: Manages hotel listings and bookings

**Responsibilities**:
- Hotel CRUD operations
- Hotel search and filtering
- Room availability management
- Room type management
- Hotel reviews
- Price drop notifications

**Database**: `kayak_hotels` collection in MongoDB

**Key Features**:
- Hotel search by location, dates, guests
- Room type management (SINGLE, DOUBLE, SUITE)
- Check-in/check-out date validation
- Listens to Kafka events for booking updates
- Redis caching for performance

**API Endpoints**:
- `GET /api/hotels` - Search hotels
- `GET /api/hotels/:id` - Get hotel details
- `POST /api/hotels` - Create hotel (admin)
- `PUT /api/hotels/:id/rooms` - Update room availability
- `POST /api/hotels/:id/reviews` - Add review

---

### 4. **Car Service** (Port 5004)
**Purpose**: Manages car rental listings and bookings

**Responsibilities**:
- Car CRUD operations
- Car search and filtering
- Car availability management
- Car booking date management
- Car reviews
- Price drop notifications

**Database**: `kayak_cars` collection in MongoDB

**Key Features**:
- Car search by location, dates, make/model
- Pickup/return date validation
- Car availability tracking
- Listens to Kafka events for booking updates
- Redis caching for performance

**API Endpoints**:
- `GET /api/cars` - Search cars
- `GET /api/cars/:id` - Get car details
- `POST /api/cars` - Create car (admin)
- `POST /api/cars/:id/bookings` - Book car dates
- `POST /api/cars/:id/reviews` - Add review

---

### 5. **Billing Service** (Port 5005)
**Purpose**: Handles payment processing and transactions

**Responsibilities**:
- Create billing records
- Process payments
- Generate invoices
- Handle refunds
- Transaction management
- **Publish Kafka events** when bookings are created/cancelled

**Database**: `kayak_billing` collection in MongoDB

**Key Features**:
- Payment method validation
- Invoice generation
- Transaction status tracking
- **Kafka producer** - publishes `booking.created` and `booking.cancelled` events
- This is the **central booking orchestrator**

**API Endpoints**:
- `POST /api/billing` - Create billing/booking
- `GET /api/billing/:id` - Get billing details
- `POST /api/billing/:id/refund` - Process refund

**Kafka Events Published**:
- `booking.created` - When a booking is made
- `booking.cancelled` - When a booking is cancelled

---

### 6. **Admin Service** (Port 5006)
**Purpose**: Provides administrative functions and analytics

**Responsibilities**:
- Admin user management
- System analytics
- Dashboard data aggregation
- Click tracking
- System statistics

**Database**: `kayak_admin` collection in MongoDB

**Key Features**:
- Admin authentication
- Analytics aggregation
- Dashboard metrics
- Listens to Kafka events for analytics updates
- Redis caching for analytics

**API Endpoints**:
- `GET /api/admin/analytics` - Get system analytics
- `GET /api/admin/admins` - Get all admins
- `POST /api/admin` - Create admin
- `GET /api/admin/stats` - Get statistics

---

### 7. **API Gateway** (Port 5000)
**Purpose**: Single entry point for all client requests

**Responsibilities**:
- Route requests to appropriate microservices
- Handle CORS
- Request/response logging
- Error handling
- Load balancing (future)

**Key Features**:
- **Proxy pattern** - forwards requests to microservices
- Single entry point for frontend
- Centralized error handling
- Request routing based on URL path

**How it works**:
```
Frontend Request: GET /api/flights
         ↓
    API Gateway (Port 5000)
         ↓
    Flight Service (Port 5002)
         ↓
    Response back to Frontend
```

**Routes**:
- `/api/users/*` → User Service (5001)
- `/api/flights/*` → Flight Service (5002)
- `/api/hotels/*` → Hotel Service (5003)
- `/api/cars/*` → Car Service (5004)
- `/api/billing/*` → Billing Service (5005)
- `/api/admin/*` → Admin Service (5006)

---

## How Microservices Communicate

### 1. **Synchronous Communication** (HTTP/REST)
- Frontend → API Gateway → Microservice
- Direct service-to-service calls (when needed)
- Uses HTTP requests/responses

### 2. **Asynchronous Communication** (Kafka)
- **Event-driven architecture**
- Services publish events to Kafka
- Other services consume events
- **Decouples services** - they don't need to know about each other

**Example Flow**:
```
1. User creates booking
   ↓
2. Billing Service processes payment
   ↓
3. Billing Service publishes "booking.created" event to Kafka
   ↓
4. Multiple services consume the event:
   - User Service: Updates user's booking history
   - Flight Service: Updates seat availability
   - Hotel Service: Updates room availability
   - Car Service: Updates car availability
   - Admin Service: Updates analytics
```

---

## Why Use Microservices?

### Advantages:

1. **Independent Development**
   - Teams can work on different services simultaneously
   - No code conflicts

2. **Independent Deployment**
   - Deploy one service without affecting others
   - Faster release cycles

3. **Scalability**
   - Scale only the services that need it
   - Example: Scale Flight Service during peak travel season

4. **Technology Flexibility**
   - Each service can use different technologies
   - Example: AI Agent uses Python/FastAPI, others use Node.js

5. **Fault Isolation**
   - If one service fails, others keep working
   - Better system reliability

6. **Team Organization**
   - Each team owns a service
   - Clear ownership and responsibility

### Challenges:

1. **Complexity**
   - More services to manage
   - Network communication overhead

2. **Data Consistency**
   - Each service has its own database
   - Need to handle distributed transactions

3. **Testing**
   - Need to test service interactions
   - Integration testing is more complex

---

## Architecture Diagram

```
                    Frontend (React)
                         │
                         │ HTTP
                         ↓
                   API Gateway (5000)
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ↓               ↓               ↓
    User (5001)    Flight (5002)   Hotel (5003)
         │               │               │
         └───────────────┼───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ↓               ↓               ↓
      Car (5004)    Billing (5005)   Admin (5006)
         │               │               │
         └───────────────┴───────────────┘
                         │
                         ↓
                    Kafka (Events)
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    All Services consume Kafka events
```

---

## Summary

**Our Kayak project has 6 microservices**:
1. **User Service** - User management & authentication
2. **Flight Service** - Flight listings & bookings
3. **Hotel Service** - Hotel listings & bookings
4. **Car Service** - Car rental listings & bookings
5. **Billing Service** - Payment processing & booking orchestration
6. **Admin Service** - Administrative functions & analytics

**Plus**:
- **API Gateway** - Single entry point for all requests
- **Kafka** - Event-driven communication between services
- **Redis** - Caching layer for performance
- **MongoDB** - Primary database for each service

Each service is **independent**, **scalable**, and **communicates** via REST APIs and Kafka events!

