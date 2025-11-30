// Main entry point for Kafka utilities
module.exports = {
  // Config
  ...require('./config/kafka.config'),
  
  // Producers
  ...require('./producers/bookingProducer'),
  
  // Consumers
  ...require('./consumers/bookingConsumer')
};

