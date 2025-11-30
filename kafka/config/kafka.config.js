const { Kafka } = require('kafkajs');

// Kafka broker configuration
const kafkaConfig = {
  clientId: 'kayak-travel-booking',
  brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  },
  connectionTimeout: 3000,
  requestTimeout: 30000
};

// Create Kafka instance
const kafka = new Kafka(kafkaConfig);

// Topic name for bookings
const BOOKINGS_TOPIC = 'bookings';

// Event types
const EVENT_TYPES = {
  BOOKING_CREATED: 'booking.created',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_FAILED: 'booking.failed'
};

module.exports = {
  kafka,
  BOOKINGS_TOPIC,
  EVENT_TYPES,
  kafkaConfig
};
