const { kafka, BOOKINGS_TOPIC } = require('../config/kafka.config');

// Create producer instance
const producer = kafka.producer({
  allowAutoTopicCreation: true,
  transactionTimeout: 30000
});

let isConnected = false;

/**
 * Initialize and connect the producer
 */
async function connectProducer() {
  if (!isConnected) {
    try {
      await producer.connect();
      isConnected = true;
      console.log('✅ Kafka producer connected');
    } catch (error) {
      console.error('❌ Error connecting Kafka producer:', error);
      throw error;
    }
  }
}

/**
 * Disconnect the producer
 */
async function disconnectProducer() {
  if (isConnected) {
    try {
      await producer.disconnect();
      isConnected = false;
      console.log('✅ Kafka producer disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting Kafka producer:', error);
    }
  }
}

/**
 * Publish a booking event to Kafka
 * @param {String} eventType - Type of event (booking.created, booking.confirmed, etc.)
 * @param {Object} eventData - Event data payload
 * @returns {Promise} - Promise that resolves when message is sent
 */
async function publishBookingEvent(eventType, eventData) {
  try {
    // Ensure producer is connected
    if (!isConnected) {
      await connectProducer();
    }

    const message = {
      eventType,
      timestamp: new Date().toISOString(),
      ...eventData
    };

    const result = await producer.send({
      topic: BOOKINGS_TOPIC,
      messages: [
        {
          key: eventData.bookingId || eventData.billingId || `event-${Date.now()}`,
          value: JSON.stringify(message),
          headers: {
            'event-type': eventType,
            'service': 'kayak-booking-system'
          }
        }
      ]
    });

    console.log(`✅ Published ${eventType} event to Kafka:`, {
      topic: BOOKINGS_TOPIC,
      bookingId: eventData.bookingId,
      partition: result[0].partition,
      offset: result[0].offset
    });

    return result;
  } catch (error) {
    console.error(`❌ Error publishing ${eventType} event to Kafka:`, error);
    throw error;
  }
}

/**
 * Graceful shutdown handler
 */
process.on('SIGINT', async () => {
  await disconnectProducer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectProducer();
  process.exit(0);
});

module.exports = {
  connectProducer,
  disconnectProducer,
  publishBookingEvent,
  producer
};

