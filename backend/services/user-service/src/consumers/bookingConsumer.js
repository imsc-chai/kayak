const { createBookingConsumer, EVENT_TYPES } = require('../../../../../kafka/consumers/bookingConsumer');

let consumerInstance = null;

/**
 * Safely find a user by either Mongo _id or userId field
 */
async function findUserByEventUserId(userId) {
  const User = require('../models/User');

  // Try MongoDB _id first
  let user = null;
  if (userId) {
    try {
      user = await User.findById(userId);
    } catch {
      // Ignore cast errors and fall back to userId lookup
      user = null;
    }
  }

  // Fallback: custom userId field
  if (!user && userId) {
    user = await User.findOne({ userId });
  }

  return user;
}

/**
 * Initialize and start the booking consumer for User Service
 * Consumes booking events and keeps user.bookingHistory in sync.
 */
async function startBookingConsumer() {
  if (consumerInstance) {
    console.log('⚠️ [User Service] Booking consumer is already running');
    return;
  }

  consumerInstance = createBookingConsumer('user-service-group', {
    // Handle successful bookings
    [EVENT_TYPES.BOOKING_CREATED]: async (eventData) => {
      try {
        console.log(`[User Service] Processing booking.created event:`, eventData.bookingId);

        const user = await findUserByEventUserId(eventData.userId);
        if (!user) {
          console.error(`[User Service] User not found for booking.created: ${eventData.userId}`);
          return;
        }

        // Avoid duplicates if booking already exists (e.g., created via HTTP flow)
        const existingBooking = user.bookingHistory.find(
          (b) => b.bookingId === eventData.bookingId
        );

        if (existingBooking) {
          console.log(`⚠️ [User Service] Booking ${eventData.bookingId} already exists in user history`);
          return;
        }

        const rawDetails = (eventData.data && (eventData.data.bookingDetails || eventData.data)) || {};
        const details = {
          ...rawDetails,
          // Ensure totalAmountPaid is always present on the booking details
          totalAmountPaid: eventData.totalAmountPaid ?? rawDetails.totalAmountPaid,
        };

        user.bookingHistory.push({
          bookingId: eventData.bookingId,
          type: eventData.type,
          bookingDate: new Date(eventData.timestamp || Date.now()),
          status: 'upcoming',
          details
        });

        await user.save();
        console.log(`✅ [User Service] Added booking ${eventData.bookingId} to user ${eventData.userId} history (from Kafka)`);
      } catch (error) {
        console.error(`❌ [User Service] Error processing booking.created:`, error);
      }
    },

    // Handle cancelled bookings
    [EVENT_TYPES.BOOKING_CANCELLED]: async (eventData) => {
      try {
        console.log(`[User Service] Processing booking.cancelled event:`, eventData.bookingId);

        const user = await findUserByEventUserId(eventData.userId);
        if (!user) {
          console.error(`[User Service] User not found for booking.cancelled: ${eventData.userId}`);
          return;
        }

        const booking = user.bookingHistory.find(
          (b) => b.bookingId === eventData.bookingId
        );

        if (!booking) {
          console.warn(`[User Service] Booking ${eventData.bookingId} not found in user history for cancellation`);
          return;
        }

        if (booking.status === 'cancelled') {
          console.log(`[User Service] Booking ${eventData.bookingId} is already cancelled`);
          return;
        }

        booking.status = 'cancelled';
        await user.save();
        console.log(`✅ [User Service] Marked booking ${eventData.bookingId} as cancelled for user ${eventData.userId}`);
      } catch (error) {
        console.error(`❌ [User Service] Error processing booking.cancelled:`, error);
      }
    }
  });

  await consumerInstance.start();
  console.log('✅ [User Service] Booking consumer started');
}

/**
 * Stop the booking consumer
 */
async function stopBookingConsumer() {
  if (consumerInstance) {
    await consumerInstance.stop();
    consumerInstance = null;
    console.log('✅ [User Service] Booking consumer stopped');
  }
}

module.exports = {
  startBookingConsumer,
  stopBookingConsumer
};

