const { kafka, BOOKINGS_TOPIC, EVENT_TYPES } = require('../config/kafka.config');

/**
 * Create a consumer for booking events
 * @param {String} groupId - Consumer group ID (should be unique per service)
 * @param {Object} handlers - Event handlers for different event types
 * @returns {Object} - Consumer instance with start/stop methods
 */
function createBookingConsumer(groupId, handlers = {}) {
  const consumer = kafka.consumer({ 
    groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    maxBytesPerPartition: 1048576, // 1MB
    minBytes: 1,
    maxBytes: 10485760, // 10MB
    maxWaitTimeInMs: 5000
  });

  let isRunning = false;

  /**
   * Start consuming messages
   */
  async function start() {
    if (isRunning) {
      console.log(`⚠️ Consumer ${groupId} is already running`);
      return;
    }

    try {
      await consumer.connect();
      await consumer.subscribe({ 
        topic: BOOKINGS_TOPIC,
        fromBeginning: false // Only consume new messages
      });

      console.log(`✅ Kafka consumer ${groupId} connected and subscribed to ${BOOKINGS_TOPIC}`);

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const eventData = JSON.parse(message.value.toString());
            const eventType = eventData.eventType;

            console.log(`📨 Received event: ${eventType}`, {
              topic,
              partition,
              offset: message.offset,
              bookingId: eventData.bookingId
            });

            // Route to appropriate handler
            if (handlers[eventType]) {
              await handlers[eventType](eventData, { topic, partition, offset: message.offset });
            } else {
              console.warn(`⚠️ No handler found for event type: ${eventType}`);
            }
          } catch (error) {
            console.error('❌ Error processing message:', error);
            // In production, you might want to send to a dead letter queue
          }
        }
      });

      isRunning = true;
    } catch (error) {
      console.error(`❌ Error starting consumer ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Stop consuming messages
   */
  async function stop() {
    if (!isRunning) {
      return;
    }

    try {
      await consumer.disconnect();
      isRunning = false;
      console.log(`✅ Kafka consumer ${groupId} disconnected`);
    } catch (error) {
      console.error(`❌ Error stopping consumer ${groupId}:`, error);
      throw error;
    }
  }

  return {
    start,
    stop,
    consumer
  };
}

module.exports = {
  createBookingConsumer,
  EVENT_TYPES
};

