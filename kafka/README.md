# Kafka Integration for Kayak Travel Booking System

This directory contains Kafka utilities for event-driven booking operations.

## Architecture

- **Single Topic**: `bookings` - All booking events go to this topic
- **Event Types**:
  - `booking.created` - When a user initiates a booking
  - `booking.confirmed` - After payment is processed successfully
  - `booking.cancelled` - When a booking is cancelled
  - `booking.failed` - If booking fails (payment, availability, etc.)

## Setup

### 1. Install Kafka

**Windows (using Docker):**
```powershell
docker run -d --name zookeeper -p 2181:2181 confluentinc/cp-zookeeper:latest
docker run -d --name kafka -p 9092:9092 --link zookeeper:zookeeper -e KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181 -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 confluentinc/cp-kafka:latest
```

**Or use the provided docker-compose.yml:**
```powershell
cd kafka
docker-compose up -d
```

### 2. Install Dependencies

```bash
cd kafka
npm install
```

### 3. Environment Variables

Add to your service `.env` files:
```
KAFKA_BROKERS=localhost:9092
```

## Usage

### Producer (Publishing Events)

```javascript
const { publishBookingEvent, connectProducer } = require('./kafka/producers/bookingProducer');

// Connect producer
await connectProducer();

// Publish booking.created event
await publishBookingEvent('booking.created', {
  bookingId: 'BOOK123',
  userId: 'user123',
  type: 'flight',
  itemId: 'FLIGHT456',
  // ... other booking data
});
```

### Consumer (Consuming Events)

```javascript
const { createBookingConsumer, EVENT_TYPES } = require('./kafka/consumers/bookingConsumer');

const consumer = createBookingConsumer('billing-service-group', {
  [EVENT_TYPES.BOOKING_CREATED]: async (eventData) => {
    // Handle booking.created event
    console.log('Processing booking:', eventData.bookingId);
    // Process payment, update billing, etc.
  },
  [EVENT_TYPES.BOOKING_CONFIRMED]: async (eventData) => {
    // Handle booking.confirmed event
  }
});

// Start consuming
await consumer.start();
```

## Services Integration

### Billing Service
- **Consumes**: `booking.created`
- **Publishes**: `booking.confirmed` or `booking.failed`

### User Service
- **Consumes**: `booking.confirmed`
- **Action**: Updates user booking history

### Flight/Hotel/Car Services
- **Consumes**: `booking.created`
- **Action**: Updates availability (seats, rooms, car bookings)

### Admin Service
- **Consumes**: All booking events
- **Action**: Updates analytics and dashboards

## Message Format

```json
{
  "eventType": "booking.created",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "bookingId": "BOOK123",
  "userId": "user123",
  "type": "flight",
  "itemId": "FLIGHT456",
  "data": {
    // Booking-specific data
  }
}
```

## Monitoring

### Monitor Bookings Topic in Real-Time

**PowerShell:**
```powershell
cd kafka
.\monitor-bookings.ps1
```

**Or directly:**
```powershell
docker exec kayak-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic bookings --from-beginning --property print.timestamp=true --property print.key=true --property print.value=true
```

**Linux/Mac:**
```bash
cd kafka
./monitor-bookings.sh
```

This will show all booking events in real-time with:
- Timestamp
- Message key (bookingId)
- Message value (JSON event data)

## Error Handling

- Failed messages are logged but don't stop the consumer
- In production, implement dead letter queue for failed messages
- Producers retry automatically (configured in kafka.config.js)

