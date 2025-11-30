const Hotel = require('../models/Hotel');

exports.createHotel = async (req, res) => {
  try {
    console.log('Create hotel request body:', JSON.stringify(req.body, null, 2));
    console.log('Max guests in create request:', req.body.maxGuests);
    
    // Ensure maxGuests is set if not provided
    let maxGuestsValue = 1;
    if (req.body.maxGuests !== undefined && req.body.maxGuests !== null && req.body.maxGuests !== '') {
      maxGuestsValue = parseInt(req.body.maxGuests);
      if (isNaN(maxGuestsValue) || maxGuestsValue < 1) {
        maxGuestsValue = 1;
      }
    }
    
    // Explicitly set maxGuests to ensure it's saved
    req.body.maxGuests = maxGuestsValue;
    
    const hotel = new Hotel(req.body);
    // Explicitly set maxGuests on the hotel object to ensure Mongoose saves it
    hotel.maxGuests = maxGuestsValue;
    await hotel.save();
    
    console.log('Created hotel maxGuests:', hotel.maxGuests);
    console.log('Created hotel full data:', JSON.stringify(hotel.toObject(), null, 2));
    
    res.status(201).json({ success: true, message: 'Hotel created successfully', data: hotel });
  } catch (error) {
    console.error('Error creating hotel:', error);
    res.status(500).json({ success: false, message: 'Error creating hotel', error: error.message });
  }
};

exports.getHotels = async (req, res) => {
  try {
    const { city, state, starRating, minPrice, maxPrice, sortBy = 'hotelRating.average', sortOrder = 'desc', page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (city) {
      // Match city name (case-insensitive) - allow partial matches for multi-word cities
      // Escape special regex characters but allow spaces
      const cityTrimmed = city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Use word boundary or start of string to match "new york" in "New York" or "New York City"
      query.city = new RegExp(`^${cityTrimmed}`, 'i');
    }
    if (state) query.state = new RegExp(state, 'i');
    if (starRating) query.starRating = Number(starRating);
    if (minPrice || maxPrice) {
      query.pricePerNight = {};
      if (minPrice) query.pricePerNight.$gte = Number(minPrice);
      if (maxPrice) query.pricePerNight.$lte = Number(maxPrice);
    }
    query.availableRooms = { $gt: 0 };

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const skip = (page - 1) * limit;

    const hotels = await Hotel.find(query).sort(sort).skip(skip).limit(Number(limit));
    const total = await Hotel.countDocuments(query);

    res.json({ success: true, data: hotels, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching hotels', error: error.message });
  }
};

exports.getHotelById = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
    
    console.log('Get hotel by ID - maxGuests:', hotel.maxGuests);
    
    res.json({ success: true, data: hotel });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching hotel', error: error.message });
  }
};

exports.updateHotel = async (req, res) => {
  try {
    console.log('Update hotel request body:', JSON.stringify(req.body, null, 2));
    console.log('Max guests in request:', req.body.maxGuests);
    console.log('Max guests type:', typeof req.body.maxGuests);
    
    // Get existing hotel to check for price drop
    const existingHotel = await Hotel.findById(req.params.id);
    if (!existingHotel) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }
    
    // Store old price for price drop notification
    const oldPrice = existingHotel.pricePerNight;
    
    // Ensure maxGuests is a number if provided
    if (req.body.maxGuests !== undefined && req.body.maxGuests !== null && req.body.maxGuests !== '') {
      req.body.maxGuests = parseInt(req.body.maxGuests);
      if (isNaN(req.body.maxGuests) || req.body.maxGuests < 1) {
        req.body.maxGuests = 1;
      }
    } else {
      // If maxGuests is not provided, keep existing value or set to 1
      if (existingHotel && existingHotel.maxGuests) {
        req.body.maxGuests = existingHotel.maxGuests;
      } else {
        req.body.maxGuests = 1;
      }
    }
    
    console.log('Max guests after processing:', req.body.maxGuests);
    
    // Use updateOne with $set to ensure all fields including maxGuests are saved
    const updateResult = await Hotel.updateOne(
      { _id: req.params.id },
      { $set: req.body },
      { runValidators: true }
    );
    
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }
    
    console.log('Update result:', updateResult);
    console.log('Modified count:', updateResult.modifiedCount);
    
    // Fetch the updated hotel to return
    const hotel = await Hotel.findById(req.params.id);
    
    console.log('Updated hotel maxGuests:', hotel?.maxGuests);
    console.log('Updated hotel full data:', JSON.stringify(hotel.toObject(), null, 2));
    
    // Check for price drop and notify users (only once, with both IDs handled internally)
    // Only notify if pricePerNight was actually changed in this update
    const priceWasChanged = req.body.pricePerNight !== undefined && 
                            req.body.pricePerNight !== null &&
                            req.body.pricePerNight !== oldPrice;
    
    const { notifyPriceDrop } = require('../utils/priceDropNotification');
    const newPrice = hotel.pricePerNight;
    
    // Only notify if price was actually changed AND it dropped
    if (priceWasChanged && oldPrice && newPrice && newPrice < oldPrice) {
      const hotelObj = hotel.toObject();
      // Pass both IDs in the hotelData, notifyPriceDrop will handle deduplication
      console.log(`[Hotel Price Drop] Notifying users: ${hotel.hotelId || hotel._id}, old: ${oldPrice}, new: ${newPrice}`);
      await notifyPriceDrop(hotel._id.toString(), oldPrice, newPrice, hotelObj);
    } else {
      console.log(`[Hotel Price Drop] Skipping notification - priceWasChanged: ${priceWasChanged}, oldPrice: ${oldPrice}, newPrice: ${newPrice}`);
    }
    
    res.json({ success: true, message: 'Hotel updated successfully', data: hotel });
  } catch (error) {
    console.error('Error updating hotel:', error);
    res.status(500).json({ success: false, message: 'Error updating hotel', error: error.message });
  }
};

exports.deleteHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndDelete(req.params.id);
    if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
    res.json({ success: true, message: 'Hotel deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting hotel', error: error.message });
  }
};

exports.addReview = async (req, res) => {
  try {
    const { userId, userName, rating, comment } = req.body;
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
    
    // Check if user already reviewed this hotel
    const existingReview = hotel.guestReviews.find(
      review => review.userId === userId
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this hotel'
      });
    }

    // Verify user has a booking for this hotel
    try {
      const axios = require('axios');
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:5001';
      const hotelId = hotel._id.toString();
      
      const userResponse = await axios.get(`${userServiceUrl}/api/users/${userId}/bookings`, {
        timeout: 5000
      });

      if (userResponse.data.success) {
        const bookings = userResponse.data.data || [];
        
        // Check if user has a booking for this hotel
        const hasBooking = bookings.some(booking => {
          if (booking.type !== 'hotel') return false;
          if (booking.status === 'cancelled') return false; // Don't allow reviews for cancelled bookings
          
          // Check if booking is for this hotel
          const bookingItemId = booking.details?._id || booking.details?.id || booking.details?.hotelId;
          if (bookingItemId && bookingItemId.toString() === hotelId) {
            return true;
          }
          
          return false;
        });

        if (!hasBooking) {
          return res.status(403).json({
            success: false,
            message: 'You can only review hotels you have booked. Please book this hotel first to leave a review.'
          });
        }
      }
    } catch (userServiceError) {
      // If user service is unavailable, log but allow review (fail open for better UX)
      console.warn('Could not verify booking status with User Service:', userServiceError.message);
      // Continue with review creation
    }
    
    hotel.guestReviews.push({ userId, userName, rating, comment });
    const totalRating = hotel.guestReviews.reduce((sum, review) => sum + review.rating, 0);
    hotel.hotelRating.average = totalRating / hotel.guestReviews.length;
    hotel.hotelRating.count = hotel.guestReviews.length;
    await hotel.save();

    res.json({ success: true, message: 'Review added successfully', data: hotel.guestReviews[hotel.guestReviews.length - 1] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding review', error: error.message });
  }
};

// Update available rooms (for booking)
exports.updateRooms = async (req, res) => {
  try {
    const { rooms, roomTypes } = req.body; // roomTypes: { 'SINGLE': 1, 'DOUBLE': 2, etc. }
    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    let totalRoomsToBook = rooms || 0;

    // If roomTypes is provided, update individual room type availability
    if (roomTypes && typeof roomTypes === 'object' && hotel.roomTypes && hotel.roomTypes.length > 0) {
      // Validate and update each room type
      for (const [roomTypeName, count] of Object.entries(roomTypes)) {
        if (count > 0) {
          const roomType = hotel.roomTypes.find(rt => rt.type === roomTypeName);
          if (!roomType) {
            return res.status(400).json({
              success: false,
              message: `Room type ${roomTypeName} not found`
            });
          }
          if (roomType.available < count) {
            return res.status(400).json({
              success: false,
              message: `Not enough ${roomTypeName} rooms available. Only ${roomType.available} available.`
            });
          }
          roomType.available -= count;
          totalRoomsToBook += count;
        }
      }
    } else if (rooms) {
      // Fallback: update total availableRooms if no roomTypes specified
      if (hotel.availableRooms < rooms) {
        return res.status(400).json({
          success: false,
          message: 'Not enough rooms available'
        });
      }
      hotel.availableRooms -= rooms;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please specify rooms or roomTypes to book'
      });
    }

    // Also update total availableRooms if roomTypes were specified
    if (roomTypes && totalRoomsToBook > 0) {
      if (hotel.availableRooms < totalRoomsToBook) {
        // Rollback room type changes if total is insufficient
        for (const [roomTypeName, count] of Object.entries(roomTypes)) {
          if (count > 0) {
            const roomType = hotel.roomTypes.find(rt => rt.type === roomTypeName);
            if (roomType) {
              roomType.available += count;
            }
          }
        }
        return res.status(400).json({
          success: false,
          message: 'Not enough total rooms available'
        });
      }
      hotel.availableRooms -= totalRoomsToBook;
    }

    await hotel.save();

    res.json({
      success: true,
      message: 'Rooms updated successfully',
      data: {
        availableRooms: hotel.availableRooms,
        roomTypes: hotel.roomTypes.map(rt => ({
          type: rt.type,
          available: rt.available
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating rooms',
      error: error.message
    });
  }
};

