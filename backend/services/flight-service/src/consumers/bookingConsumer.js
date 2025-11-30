const { createBookingConsumer, EVENT_TYPES } = require('../../../../../kafka/consumers/bookingConsumer');
const Flight = require('../models/Flight');

let consumerInstance = null;

/**
 * Restore seats for a cancelled booking by scanning the flight's seat maps
 * and releasing any seats whose bookedBy.bookingId matches the cancelled booking.
 */
async function restoreSeatsForCancelledBooking(event) {
  const { itemId, bookingId } = event;

  if (!bookingId) {
    console.warn('[Flight Service] booking.cancelled event without bookingId, skipping seat restoration');
    return;
  }

  let flight = null;

  // Prefer direct lookup by itemId (MongoDB _id as string)
  if (itemId) {
    try {
      flight = await Flight.findById(itemId);
    } catch (err) {
      console.warn(`[Flight Service] Failed to find flight by itemId=${itemId}:`, err.message);
    }
  }

  // Fallback: search by bookingId in seat maps if itemId not present or not found
  if (!flight) {
    flight = await Flight.findOne({
      $or: [
        { 'seatMap.bookedBy.bookingId': bookingId },
        { 'returnSeatMap.bookedBy.bookingId': bookingId }
      ]
    });
  }

  if (!flight) {
    console.warn(`[Flight Service] No flight found for cancelled booking ${bookingId}`);
    return;
  }

  let outboundReleased = 0;
  let returnReleased = 0;

  if (Array.isArray(flight.seatMap)) {
    flight.seatMap.forEach(seat => {
      if (seat.status === 'booked' && seat.bookedBy?.bookingId === bookingId) {
        seat.status = 'available';
        seat.bookedBy = null;
        outboundReleased++;
      }
    });
  }

  if (Array.isArray(flight.returnSeatMap)) {
    flight.returnSeatMap.forEach(seat => {
      if (seat.status === 'booked' && seat.bookedBy?.bookingId === bookingId) {
        seat.status = 'available';
        seat.bookedBy = null;
        returnReleased++;
      }
    });
  }

  if (outboundReleased === 0 && returnReleased === 0) {
    console.log(`[Flight Service] No booked seats found for booking ${bookingId} on flight ${flight.flightId}`);
    return;
  }

  // Update available seat counters
  if (outboundReleased > 0) {
    flight.availableSeats = Math.min(
      flight.totalAvailableSeats,
      (flight.availableSeats || 0) + outboundReleased
    );
  }
  if (returnReleased > 0) {
    flight.returnAvailableSeats = Math.min(
      flight.returnTotalAvailableSeats,
      (flight.returnAvailableSeats || 0) + returnReleased
    );
  }

  await flight.save();

  console.log(`[Flight Service] Restored seats for cancelled booking ${bookingId} on flight ${flight.flightId}`, {
    outboundReleased,
    returnReleased,
    newAvailableSeats: flight.availableSeats,
    newReturnAvailableSeats: flight.returnAvailableSeats
  });
}

/**
 * Initialize and start the booking consumer for Flight Service.
 * Adjusts seat availability when bookings are cancelled.
 */
async function startBookingConsumer() {
  if (consumerInstance) {
    console.log('⚠️ [Flight Service] Booking consumer is already running');
    return;
  }

  consumerInstance = createBookingConsumer('flight-service-group', {
    [EVENT_TYPES.BOOKING_CREATED]: async (eventData) => {
      try {
        if (eventData.type !== 'flight') return;
        console.log(`[Flight Service] Received booking.created for flight bookingId=${eventData.bookingId}`, {
          itemType: eventData.type,
          bookingId: eventData.bookingId,
          userId: eventData.userId,
          itemId: eventData.itemId || null
        });
        // Seat availability is already reduced during reservation/confirmation,
        // so we only log here for observability.
      } catch (error) {
        console.error('[Flight Service] Error handling booking.created event:', error);
      }
    },
    [EVENT_TYPES.BOOKING_CANCELLED]: async (eventData) => {
      try {
        if (eventData.type !== 'flight') return;
        console.log(`[Flight Service] Received booking.cancelled for flight bookingId=${eventData.bookingId}`, {
          itemType: eventData.type,
          bookingId: eventData.bookingId,
          userId: eventData.userId,
          itemId: eventData.itemId || null
        });
        await restoreSeatsForCancelledBooking(eventData);
      } catch (error) {
        console.error('[Flight Service] Error handling booking.cancelled:', error);
      }
    }
  });

  await consumerInstance.start();
  console.log('✅ [Flight Service] Booking consumer started');
}

async function stopBookingConsumer() {
  if (consumerInstance) {
    await consumerInstance.stop();
    consumerInstance = null;
    console.log('✅ [Flight Service] Booking consumer stopped');
  }
}

module.exports = {
  startBookingConsumer,
  stopBookingConsumer
};

