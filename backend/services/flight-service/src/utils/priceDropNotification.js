const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5001';

/**
 * Notify users about price drops for a flight
 * @param {String} flightId - The flight ID
 * @param {Number} oldPrice - The old price
 * @param {Number} newPrice - The new price
 * @param {Object} flightData - Flight data for notification message
 */
async function notifyPriceDrop(flightId, oldPrice, newPrice, flightData = {}) {
  try {
    // Try to find users with both _id and flightId (since favourites might use either)
    const flightMongoId = flightData._id ? flightData._id.toString() : null;
    const flightCustomId = flightData.flightId || flightId;
    
    // Find users who have this flight in favourites (try both IDs)
    let users = [];
    
    // Use a Set to track unique user IDs to prevent duplicates
    const uniqueUserIds = new Set();
    
    // Try with MongoDB _id first
    if (flightMongoId) {
      try {
        const response1 = await axios.get(`${USER_SERVICE_URL}/api/users/favourites/find-users`, {
          params: {
            itemId: flightMongoId,
            type: 'flight'
          }
        });
        if (response1.data.success && response1.data.data) {
          response1.data.data.forEach(user => {
            if (!uniqueUserIds.has(user.userId)) {
              uniqueUserIds.add(user.userId);
              users.push(user);
            }
          });
        }
      } catch (err) {
        console.log(`No users found with MongoDB _id ${flightMongoId}`);
      }
    }
    
    // Try with custom flightId
    if (flightCustomId && (!flightMongoId || flightMongoId !== flightCustomId)) {
      try {
        const response2 = await axios.get(`${USER_SERVICE_URL}/api/users/favourites/find-users`, {
          params: {
            itemId: flightCustomId,
            type: 'flight'
          }
        });
        if (response2.data.success && response2.data.data) {
          // Filter out duplicates using the Set
          response2.data.data.forEach(user => {
            if (!uniqueUserIds.has(user.userId)) {
              uniqueUserIds.add(user.userId);
              users.push(user);
            }
          });
        }
      } catch (err) {
        console.log(`No users found with custom ID ${flightCustomId}`);
      }
    }

    if (users.length === 0) {
      console.log(`No users have flight ${flightId} in favourites. Skipping price drop notifications.`);
      return;
    }

    const priceDrop = oldPrice - newPrice;
    const priceDropPercent = ((priceDrop / oldPrice) * 100).toFixed(1);

    // Use consistent relatedId (prefer MongoDB _id if available, otherwise use flightId)
    const consistentRelatedId = flightMongoId || flightCustomId || flightId;
    const flightNumber = flightData.flightId || flightId;
    
    // Create notification for each user (only once per user)
    const notificationPromises = users.map(async (user) => {
      try {
        const origin = flightData.departureAirport?.city || flightData.departureAirport?.code || 'Origin';
        const destination = flightData.arrivalAirport?.city || flightData.arrivalAirport?.code || 'Destination';
        
        // Use plain text instead of emoji to avoid encoding issues
        const title = `Price Drop Alert!`;
        const message = `Great news! The flight from ${origin} to ${destination} (${flightNumber}) has dropped by $${priceDrop.toFixed(2)} (${priceDropPercent}%). New price: $${newPrice.toFixed(2)}`;

        await axios.post(`${USER_SERVICE_URL}/api/users/service/notifications/create/${user.userId}`, {
          type: 'info',
          title,
          message,
          relatedId: consistentRelatedId, // Use consistent ID
          relatedType: 'deal'
        });

        console.log(`✅ Price drop notification sent to user ${user.userId} for flight ${flightNumber}`);
      } catch (error) {
        console.error(`❌ Failed to send notification to user ${user.userId}:`, error.message);
      }
    });

    await Promise.all(notificationPromises);
    console.log(`✅ Price drop notifications sent to ${users.length} user(s) for flight ${flightId}`);
  } catch (error) {
    console.error('❌ Error notifying users about price drop:', error.message);
    // Don't throw - we don't want price drop notification failures to break the update
  }
}

module.exports = { notifyPriceDrop };

