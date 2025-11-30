require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27020/kayak_flights';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
  .then(() => {
    console.log('✅ Connected to MongoDB - Flight Service');
    console.log(`   Database: ${MONGODB_URI}`);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.error('   Please ensure MongoDB is running on port 27020');
    console.error('   Error details:', err.message);
    // Don't exit - let the service start and retry connections
  });

// Routes
const flightRoutes = require('./routes/flightRoutes');
app.use('/api/flights', flightRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'flight-service',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Kafka booking consumer
const { startBookingConsumer, stopBookingConsumer } = require('./consumers/bookingConsumer');

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Flight Service running on port ${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api/flights`);

  // Start Kafka consumer for booking events
  try {
    await startBookingConsumer();
  } catch (error) {
    console.error('❌ [Flight Service] Failed to start Kafka booking consumer:', error.message);
  }
});

// Graceful shutdown for Kafka consumer
process.on('SIGINT', async () => {
  console.log('[Flight Service] Shutting down...');
  await stopBookingConsumer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Flight Service] Shutting down...');
  await stopBookingConsumer();
  process.exit(0);
});

