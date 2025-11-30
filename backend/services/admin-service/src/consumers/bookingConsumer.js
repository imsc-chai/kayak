const { createBookingConsumer, EVENT_TYPES } = require('../../../../../kafka/consumers/bookingConsumer');

let consumerInstance = null;

/**
 * Initialize and start the booking consumer for Admin Service
 * Currently logs all booking events. In the future, this can be extended
 * to update pre-computed analytics (revenue, cancellations, etc.).
 */
async function startBookingConsumer() {
  if (consumerInstance) {
    console.log('⚠️ [Admin Service] Booking consumer is already running');
    return;
  }

  consumerInstance = createBookingConsumer('admin-service-group', {
    [EVENT_TYPES.BOOKING_CREATED]: async (eventData) => {
      try {
        console.log(`[Admin Service] booking.created`, {
          bookingId: eventData.bookingId,
          userId: eventData.userId,
          type: eventData.type,
          totalAmountPaid: eventData.totalAmountPaid
        });
        // TODO: In a future iteration, update admin analytics collections here
      } catch (error) {
        console.error('[Admin Service] Error handling booking.created event:', error);
      }
    },
    [EVENT_TYPES.BOOKING_CANCELLED]: async (eventData) => {
      try {
        console.log(`[Admin Service] booking.cancelled`, {
          bookingId: eventData.bookingId,
          userId: eventData.userId,
          type: eventData.type,
          refundAmount: eventData.refundDetails?.refundAmount
        });
        // TODO: In a future iteration, update admin analytics collections here
      } catch (error) {
        console.error('[Admin Service] Error handling booking.cancelled event:', error);
      }
    }
  });

  await consumerInstance.start();
  console.log('✅ [Admin Service] Booking consumer started');
}

async function stopBookingConsumer() {
  if (consumerInstance) {
    await consumerInstance.stop();
    consumerInstance = null;
    console.log('✅ [Admin Service] Booking consumer stopped');
  }
}

module.exports = {
  startBookingConsumer,
  stopBookingConsumer
};


