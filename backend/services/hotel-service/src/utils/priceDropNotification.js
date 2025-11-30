const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5001';

/**
 * Notify users about price drops for a hotel
 * @param {String} hotelId - The hotel ID
 * @param {Number} oldPrice - The old price
 * @param {Number} newPrice - The new price
 * @param {Object} hotelData - Hotel data for notification message
 */
async function notifyPriceDrop(hotelId, oldPrice, newPrice, hotelData = {}) {
  try {
    // Try to find users with both _id and hotelId (since favourites might use either)
    const hotelMongoId = hotelData._id ? hotelData._id.toString() : null;
    const hotelCustomId = hotelData.hotelId || hotelId;
    
    // Find users who have this hotel in favourites (try both IDs)
    let users = [];
    
    // Use a Set to track unique user IDs to prevent duplicates
    const uniqueUserIds = new Set();
    
    // Try with MongoDB _id first
    if (hotelMongoId) {
      try {
        const response1 = await axios.get(`${USER_SERVICE_URL}/api/users/favourites/find-users`, {
          params: {
            itemId: hotelMongoId,
            type: 'hotel'
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
        console.log(`No users found with MongoDB _id ${hotelMongoId}`);
      }
    }
    
    // Try with custom hotelId
    if (hotelCustomId && (!hotelMongoId || hotelMongoId !== hotelCustomId)) {
      try {
        const response2 = await axios.get(`${USER_SERVICE_URL}/api/users/favourites/find-users`, {
          params: {
            itemId: hotelCustomId,
            type: 'hotel'
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
        console.log(`No users found with custom ID ${hotelCustomId}`);
      }
    }

    if (users.length === 0) {
      console.log(`No users have hotel ${hotelId} in favourites. Skipping price drop notifications.`);
      return;
    }

    const priceDrop = oldPrice - newPrice;
    const priceDropPercent = ((priceDrop / oldPrice) * 100).toFixed(1);

    // Use consistent relatedId (prefer MongoDB _id if available, otherwise use hotelId)
    const consistentRelatedId = hotelMongoId || hotelCustomId || hotelId;
    const hotelNumber = hotelData.hotelId || hotelId;
    
    // Create notification for each user (only once per user)
    const notificationPromises = users.map(async (user) => {
      try {
        const hotelName = hotelData.hotelName || hotelData.name || 'Hotel';
        const location = hotelData.location?.city || hotelData.city || 'Location';
        
        // Use plain text instead of emoji to avoid encoding issues
        const title = `Price Drop Alert!`;
        const message = `Great news! ${hotelName} in ${location} (${hotelNumber}) has dropped by $${priceDrop.toFixed(2)} (${priceDropPercent}%). New price: $${newPrice.toFixed(2)} per night`;

        await axios.post(`${USER_SERVICE_URL}/api/users/service/notifications/create/${user.userId}`, {
          type: 'info',
          title,
          message,
          relatedId: consistentRelatedId, // Use consistent ID
          relatedType: 'deal'
        });

        console.log(`✅ Price drop notification sent to user ${user.userId} for hotel ${hotelNumber}`);
      } catch (error) {
        console.error(`❌ Failed to send notification to user ${user.userId}:`, error.message);
      }
    });

    await Promise.all(notificationPromises);
    console.log(`✅ Price drop notifications sent to ${users.length} user(s) for hotel ${hotelId}`);
  } catch (error) {
    console.error('❌ Error notifying users about price drop:', error.message);
    // Don't throw - we don't want price drop notification failures to break the update
  }
}

module.exports = { notifyPriceDrop };

