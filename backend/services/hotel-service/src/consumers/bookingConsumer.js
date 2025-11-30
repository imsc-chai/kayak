const { createBookingConsumer, EVENT_TYPES } = require('../../../../../kafka/consumers/bookingConsumer');

let consumerInstance = null;

/**
 * Initialize and start the booking consumer for Hotel Service
 * Currently logs events for hotels. In the future, this can be extended
 * to adjust room availability based on booking events.
 */
async function startBookingConsumer() {
  if (consumerInstance) {
    console.log('⚠️ [Hotel Service] Booking consumer is already running');
    return;
  }

  consumerInstance = createBookingConsumer('hotel-service-group', {
    [EVENT_TYPES.BOOKING_CREATED]: async (eventData) => {
      try {
        if (eventData.type !== 'hotel') return;
        console.log(`[Hotel Service] Received booking.created for hotel bookingId=${eventData.bookingId}`, {
          itemType: eventData.type,
          bookingId: eventData.bookingId,
          userId: eventData.userId
        });
        // TODO: In a future iteration, use eventData to adjust hotel room availability
      } catch (error) {
        console.error('[Hotel Service] Error handling booking.created event:', error);
      }
    },
    [EVENT_TYPES.BOOKING_CANCELLED]: async (eventData) => {
      try {
        if (eventData.type !== 'hotel') return;
        console.log(`[Hotel Service] Received booking.cancelled for hotel bookingId=${eventData.bookingId}`, {
          itemType: eventData.type,
          bookingId: eventData.bookingId,
          userId: eventData.userId
        });
        // TODO: In a future iteration, use eventData to restore hotel room availability
      } catch (error) {
        console.error('[Hotel Service] Error handling booking.cancelled event:', error);
      }
    }
  });

  await consumerInstance.start();
  console.log('✅ [Hotel Service] Booking consumer started');
}

async function stopBookingConsumer() {
  if (consumerInstance) {
    await consumerInstance.stop();
    consumerInstance = null;
    console.log('✅ [Hotel Service] Booking consumer stopped');
  }
}

module.exports = {
  startBookingConsumer,
  stopBookingConsumer
};


