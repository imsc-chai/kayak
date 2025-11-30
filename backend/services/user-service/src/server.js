require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for profile images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27020/kayak_users';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Connected to MongoDB - User Service'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'user-service',
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

// Start server
// Start Kafka consumer for booking events
const { startBookingConsumer, stopBookingConsumer } = require('./consumers/bookingConsumer');

app.listen(PORT, async () => {
  console.log(`🚀 User Service running on port ${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api/users`);
  
  // Start Kafka consumer
  try {
    await startBookingConsumer();
  } catch (error) {
    console.error('❌ Error starting Kafka consumer:', error);
    // Don't exit - service can still work without Kafka
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down User Service...');
  await stopBookingConsumer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down User Service...');
  await stopBookingConsumer();
  process.exit(0);
});

