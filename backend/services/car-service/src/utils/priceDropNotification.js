const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5001';

/**
 * Notify users about price drops for a car
 * @param {String} carId - The car ID
 * @param {Number} oldPrice - The old price
 * @param {Number} newPrice - The new price
 * @param {Object} carData - Car data for notification message
 */
async function notifyPriceDrop(carId, oldPrice, newPrice, carData = {}) {
  try {
    // Try to find users with both _id and carId (since favourites might use either)
    const carMongoId = carData._id ? carData._id.toString() : null;
    const carCustomId = carData.carId || carId;
    
    // Find users who have this car in favourites (try both IDs)
    let users = [];
    
    // Use a Set to track unique user IDs to prevent duplicates
    const uniqueUserIds = new Set();
    
    // Try with MongoDB _id first
    if (carMongoId) {
      try {
        const response1 = await axios.get(`${USER_SERVICE_URL}/api/users/favourites/find-users`, {
          params: {
            itemId: carMongoId,
            type: 'car'
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
        console.log(`No users found with MongoDB _id ${carMongoId}`);
      }
    }
    
    // Try with custom carId
    if (carCustomId && (!carMongoId || carMongoId !== carCustomId)) {
      try {
        const response2 = await axios.get(`${USER_SERVICE_URL}/api/users/favourites/find-users`, {
          params: {
            itemId: carCustomId,
            type: 'car'
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
        console.log(`No users found with custom ID ${carCustomId}`);
      }
    }

    if (users.length === 0) {
      console.log(`No users have car ${carId} in favourites. Skipping price drop notifications.`);
      return;
    }

    const priceDrop = oldPrice - newPrice;
    const priceDropPercent = ((priceDrop / oldPrice) * 100).toFixed(1);

    // Use consistent relatedId (prefer MongoDB _id if available, otherwise use carId)
    const consistentRelatedId = carMongoId || carCustomId || carId;
    const carNumber = carData.carId || carId;
    
    // Create notification for each user (only once per user)
    const notificationPromises = users.map(async (user) => {
      try {
        const carName = carData.carName || carData.name || `${carData.make || ''} ${carData.model || ''}`.trim() || 'Car';
        const location = carData.location?.city || carData.city || 'Location';
        
        // Use plain text instead of emoji to avoid encoding issues
        const title = `Price Drop Alert!`;
        const message = `Great news! ${carName} in ${location} (${carNumber}) has dropped by $${priceDrop.toFixed(2)} (${priceDropPercent}%). New price: $${newPrice.toFixed(2)} per day`;

        await axios.post(`${USER_SERVICE_URL}/api/users/service/notifications/create/${user.userId}`, {
          type: 'info',
          title,
          message,
          relatedId: consistentRelatedId, // Use consistent ID
          relatedType: 'deal'
        });

        console.log(`✅ Price drop notification sent to user ${user.userId} for car ${carNumber}`);
      } catch (error) {
        console.error(`❌ Failed to send notification to user ${user.userId}:`, error.message);
      }
    });

    await Promise.all(notificationPromises);
    console.log(`✅ Price drop notifications sent to ${users.length} user(s) for car ${carId}`);
  } catch (error) {
    console.error('❌ Error notifying users about price drop:', error.message);
    // Don't throw - we don't want price drop notification failures to break the update
  }
}

module.exports = { notifyPriceDrop };

