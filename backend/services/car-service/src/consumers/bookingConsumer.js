const { createBookingConsumer, EVENT_TYPES } = require('../../../../../kafka/consumers/bookingConsumer');

let consumerInstance = null;

/**
 * Initialize and start the booking consumer for Car Service
 * Currently logs events for cars. In the future, this can be extended
 * to manage car booking calendars based on booking events.
 */
async function startBookingConsumer() {
  if (consumerInstance) {
    console.log('⚠️ [Car Service] Booking consumer is already running');
    return;
  }

  consumerInstance = createBookingConsumer('car-service-group', {
    [EVENT_TYPES.BOOKING_CREATED]: async (eventData) => {
      try {
        if (eventData.type !== 'car') return;
        console.log(`[Car Service] Received booking.created for car bookingId=${eventData.bookingId}`, {
          itemType: eventData.type,
          bookingId: eventData.bookingId,
          userId: eventData.userId
        });
        // TODO: In a future iteration, use eventData to add car booking dates
      } catch (error) {
        console.error('[Car Service] Error handling booking.created event:', error);
      }
    },
    [EVENT_TYPES.BOOKING_CANCELLED]: async (eventData) => {
      try {
        if (eventData.type !== 'car') return;
        console.log(`[Car Service] Received booking.cancelled for car bookingId=${eventData.bookingId}`, {
          itemType: eventData.type,
          bookingId: eventData.bookingId,
          userId: eventData.userId
        });
        // TODO: In a future iteration, use eventData to remove car booking dates
      } catch (error) {
        console.error('[Car Service] Error handling booking.cancelled event:', error);
      }
    }
  });

  await consumerInstance.start();
  console.log('✅ [Car Service] Booking consumer started');
}

async function stopBookingConsumer() {
  if (consumerInstance) {
    await consumerInstance.stop();
    consumerInstance = null;
    console.log('✅ [Car Service] Booking consumer stopped');
  }
}

module.exports = {
  startBookingConsumer,
  stopBookingConsumer
};


