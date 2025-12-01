const Flight = require('../models/Flight');
const mongoose = require('mongoose');
const { getCache, setCache, deleteCache, deleteCacheByPattern, recordCacheMiss, calculateSpeedup } = require('@kayak/shared/redis');

// Reservation expiration time in milliseconds (15 minutes)
const RESERVATION_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes

/**
 * Clean up expired reservations (seats reserved for more than 15 minutes)
 * @param {Array} seatMap - The seat map array to clean
 * @returns {Number} - Number of seats released
 */
function cleanupExpiredReservations(seatMap) {
  if (!seatMap || !Array.isArray(seatMap)) return 0;
  
  const now = new Date();
  let releasedCount = 0;
  
  seatMap.forEach(seat => {
    if (seat.status === 'reserved' && seat.bookedBy?.reservedAt) {
      const reservedAt = new Date(seat.bookedBy.reservedAt);
      const timeSinceReservation = now.getTime() - reservedAt.getTime();
      
      // If reservation is older than expiry time, release it
      if (timeSinceReservation > RESERVATION_EXPIRY_TIME) {
        seat.status = 'available';
        seat.bookedBy = null;
        releasedCount++;
      }
    }
  });
  
  return releasedCount;
}

// Helper function to process flight data for saving/updating
const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

const calculateDurationHours = (start, end) => {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate) return null;
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) return null;
  return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
};

const processFlightData = (data) => {
  const processedData = { ...data };

  // Normalize date fields (accept both ISO strings and Date objects)
  processedData.departureDateTime = parseDate(processedData.departureDateTime) || processedData.departureDateTime;
  processedData.arrivalDateTime = parseDate(processedData.arrivalDateTime) || processedData.arrivalDateTime;
  processedData.returnDepartureDateTime = parseDate(processedData.returnDepartureDateTime) || processedData.returnDepartureDateTime;
  processedData.returnArrivalDateTime = parseDate(processedData.returnArrivalDateTime) || processedData.returnArrivalDateTime;

  // Ensure duration object exists and minutes always 0
  if (!processedData.duration) {
    processedData.duration = { hours: 0, minutes: 0 };
  } else {
    processedData.duration = {
      hours: Number(processedData.duration.hours) || 0,
      minutes: 0
    };
  }

  // Automatically calculate outbound duration if missing/invalid
  if ((!processedData.duration.hours || processedData.duration.hours <= 0) &&
      processedData.departureDateTime && processedData.arrivalDateTime) {
    const computedHours = calculateDurationHours(processedData.departureDateTime, processedData.arrivalDateTime);
    if (computedHours) {
      processedData.duration.hours = computedHours;
    }
  }

  // Only process returnDuration if return flight fields are provided
  if (processedData.returnDepartureDateTime && processedData.returnArrivalDateTime) {
    // Ensure returnDuration object exists and minutes always 0
    if (!processedData.returnDuration) {
      processedData.returnDuration = { hours: 0, minutes: 0 };
    } else {
      processedData.returnDuration = {
        hours: Number(processedData.returnDuration.hours) || 0,
        minutes: 0
      };
    }

    // Automatically calculate return duration if missing/invalid
    if ((!processedData.returnDuration.hours || processedData.returnDuration.hours <= 0) &&
        processedData.returnDepartureDateTime && processedData.returnArrivalDateTime) {
      const computedReturnHours = calculateDurationHours(
        processedData.returnDepartureDateTime,
        processedData.returnArrivalDateTime
      );
      if (computedReturnHours) {
        processedData.returnDuration.hours = computedReturnHours;
      }
    }
  }

  // Remove undefined values, including return fields (they are optional)
  // Also remove return fields if they are empty objects or have zero values
  const keysToDelete = [];
  Object.keys(processedData).forEach(key => {
    if (key.startsWith('return')) {
      // For return fields, be more aggressive in removing them if not provided
      const value = processedData[key];
      if (value === undefined || value === null || value === '' || 
          (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0) ||
          (key === 'returnDuration' && value && typeof value === 'object' && value.hours === 0 && value.minutes === 0 && !processedData.returnDepartureDateTime)) {
        keysToDelete.push(key);
      }
    } else {
      if (processedData[key] === undefined || processedData[key] === null || processedData[key] === '') {
        keysToDelete.push(key);
      }
    }
  });
  
  // Delete keys after iteration to avoid modifying object during iteration
  keysToDelete.forEach(key => delete processedData[key]);

  return processedData;
};

const validateChronology = (data) => {
  const departure = parseDate(data.departureDateTime);
  const arrival = parseDate(data.arrivalDateTime);
  
  // Only validate return fields if they are provided
  const returnDeparture = data.returnDepartureDateTime ? parseDate(data.returnDepartureDateTime) : null;
  const returnArrival = data.returnArrivalDateTime ? parseDate(data.returnArrivalDateTime) : null;

  if (departure && arrival && arrival <= departure) {
    return {
      valid: false,
      field: 'arrivalDateTime',
      message: 'Arrival date/time must be after the departure date/time.'
    };
  }

  // Only validate return flight chronology if return fields are provided
  if (returnDeparture && returnArrival) {
    if (arrival && returnDeparture <= arrival) {
      return {
        valid: false,
        field: 'returnDepartureDateTime',
        message: 'Return departure must be after the outbound arrival.'
      };
    }

    if (returnArrival <= returnDeparture) {
      return {
        valid: false,
        field: 'returnArrivalDateTime',
        message: 'Return arrival must be after the return departure.'
      };
    }
  }

  return { valid: true };
};

// Create new flight
exports.createFlight = async (req, res) => {
  try {
    // Debug: Log incoming data
    console.log('Create flight request body:', JSON.stringify(req.body, null, 2));
    
    // Process the request body
    const flightData = processFlightData(req.body);

    const chronologyValidation = validateChronology(flightData);
    if (!chronologyValidation.valid) {
      return res.status(400).json({
        success: false,
        message: chronologyValidation.message,
        field: chronologyValidation.field
      });
    }

    const totalSeats = Number(flightData.totalAvailableSeats);
    const availableSeats = Number(flightData.availableSeats);
    if (!Number.isNaN(totalSeats)) {
      if (totalSeats > 60) {
        return res.status(400).json({
          success: false,
          message: 'Total available seats cannot exceed 60 for the outbound flight.',
          field: 'totalAvailableSeats'
        });
      }
    }

    if (!Number.isNaN(availableSeats) && availableSeats > totalSeats) {
      return res.status(400).json({
        success: false,
        message: 'Available seats cannot exceed total seats for the outbound flight.',
        field: 'availableSeats'
      });
    }

    const returnTotalSeats = Number(flightData.returnTotalAvailableSeats);
    const returnAvailableSeats = Number(flightData.returnAvailableSeats);
    if (!Number.isNaN(returnTotalSeats)) {
      if (returnTotalSeats > 60) {
        return res.status(400).json({
          success: false,
          message: 'Return total available seats cannot exceed 60.',
          field: 'returnTotalAvailableSeats'
        });
      }
    }

    if (!Number.isNaN(returnAvailableSeats) && returnAvailableSeats > returnTotalSeats) {
      return res.status(400).json({
        success: false,
        message: 'Return available seats cannot exceed total seats for the return flight.',
        field: 'returnAvailableSeats'
      });
    }
    
    // Debug: Log processed data
    console.log('Processed flight data:', JSON.stringify(flightData, null, 2));
    console.log('Return flight fields in processed data:', {
      returnFlightId: flightData.returnFlightId,
      returnDepartureDateTime: flightData.returnDepartureDateTime,
      returnArrivalDateTime: flightData.returnArrivalDateTime,
      returnDuration: flightData.returnDuration,
      returnTicketPrice: flightData.returnTicketPrice,
      returnFlightClass: flightData.returnFlightClass
    });
    
    // Validate the flight data before saving
    console.log('Creating Flight document with data keys:', Object.keys(flightData));
    console.log('Return fields in flightData before creating Flight:', {
      returnFlightId: flightData.returnFlightId,
      returnDepartureDateTime: flightData.returnDepartureDateTime,
      returnArrivalDateTime: flightData.returnArrivalDateTime,
      returnDuration: flightData.returnDuration,
      returnTicketPrice: flightData.returnTicketPrice
    });
    
    const flight = new Flight(flightData);
    
    // Log the flight document before validation
    console.log('Flight document created. Return fields in flight object:', {
      returnFlightId: flight.returnFlightId,
      returnDepartureDateTime: flight.returnDepartureDateTime,
      returnArrivalDateTime: flight.returnArrivalDateTime,
      returnDuration: flight.returnDuration,
      returnTicketPrice: flight.returnTicketPrice
    });
    
    // Explicitly validate before saving to catch any missing required fields
    try {
      await flight.validate();
      console.log('✅ Mongoose validation passed');
    } catch (validationError) {
      console.error('❌ Mongoose validation error:', validationError);
      console.error('Validation error details:', validationError.errors);
      return res.status(400).json({
        success: false,
        message: 'Flight validation failed',
        error: validationError.message,
        details: validationError.errors ? Object.keys(validationError.errors).map(key => ({
          field: key,
          message: validationError.errors[key].message
        })) : undefined
      });
    }
    
    await flight.save();
    console.log('✅ Flight saved to database');
    
    // Invalidate all flight search caches (new flight added)
    await deleteCacheByPattern('flight:search:*');
    
    // Debug: Log saved flight
    console.log('Flight created successfully. Return flight fields:', {
      returnFlightId: flight.returnFlightId,
      returnDepartureDateTime: flight.returnDepartureDateTime,
      returnArrivalDateTime: flight.returnArrivalDateTime,
      returnTicketPrice: flight.returnTicketPrice,
      returnDuration: flight.returnDuration
    });

    res.status(201).json({
      success: true,
      message: 'Flight created successfully',
      data: flight
    });
  } catch (error) {
    console.error('❌ Error creating flight:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error.errors || error.message);
    
    // Check if it's a MongoDB connection error
    if (error.message && error.message.includes('MongoServerSelectionError')) {
      return res.status(503).json({
        success: false,
        message: 'Database connection error. Please try again.',
        error: 'MongoDB connection failed'
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Flight ID already exists. Please use a unique flight ID.',
        field: 'flightId'
      });
    }
    
    const statusCode = error.name === 'ValidationError' ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: 'Error creating flight',
      error: error.message || 'Unknown error occurred',
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : undefined
    });
  }
};

// Get all flights with filters
exports.getFlights = async (req, res) => {
  try {
    const {
      from,
      to,
      departureDate,
      returnDate,
      flightClass,
      minPrice,
      maxPrice,
      sortBy = 'departureDateTime',
      sortOrder = 'asc',
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = {};

    // Only filter by from/to if they are provided and not empty
    if (from && from.trim()) {
      const fromTrimmed = from.trim();
      // Support both airport code and city name search
      const fromUpper = fromTrimmed.toUpperCase();
      // Check if it's a 3-letter code (likely airport code)
      if (fromTrimmed.length === 3 && /^[A-Z]{3}$/.test(fromUpper)) {
        query['departureAirport.code'] = fromUpper;
      } else {
        // Search by city name
        query['departureAirport.city'] = new RegExp(fromTrimmed, 'i');
      }
    }

    if (to && to.trim()) {
      const toTrimmed = to.trim();
      // Support both airport code and city name search
      const toUpper = toTrimmed.toUpperCase();
      // Check if it's a 3-letter code (likely airport code)
      if (toTrimmed.length === 3 && /^[A-Z]{3}$/.test(toUpper)) {
        query['arrivalAirport.code'] = toUpper;
      } else {
        // Search by city name
        query['arrivalAirport.city'] = new RegExp(toTrimmed, 'i');
      }
    }

    if (departureDate) {
      // Parse the date string (format: YYYY-MM-DD)
      // Create date range for the entire day in UTC to avoid timezone issues
      const dateParts = departureDate.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(dateParts[2], 10);
        
        // Start of day in UTC (00:00:00.000)
        const startDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        // End of day in UTC (23:59:59.999)
        const endDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
        
        query.departureDateTime = { $gte: startDate, $lte: endDate };
      } else {
        // Fallback for other date formats
        const searchDate = new Date(departureDate);
        const startDate = new Date(searchDate);
        startDate.setUTCHours(0, 0, 0, 0);
        const endDate = new Date(searchDate);
        endDate.setUTCHours(23, 59, 59, 999);
        query.departureDateTime = { $gte: startDate, $lte: endDate };
      }
    }

    if (flightClass) {
      query.flightClass = flightClass;
    }

    if (minPrice || maxPrice) {
      query.ticketPrice = {};
      if (minPrice) query.ticketPrice.$gte = Number(minPrice);
      if (maxPrice) query.ticketPrice.$lte = Number(maxPrice);
    }

    // Only show flights with available seats
    query.availableSeats = { $gt: 0 };

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (page - 1) * limit;

    const requestStartTime = Date.now();
    
    // Create cache key from query parameters
    const cacheKey = `flight:search:${JSON.stringify({ from, to, departureDate, returnDate, flightClass, minPrice, maxPrice, sortBy, sortOrder, page, limit })}`;
    
    // Try to get from cache first
    const cacheResult = await getCache(cacheKey);
    if (cacheResult && cacheResult.value) {
      const totalTime = Date.now() - requestStartTime;
      const speedup = calculateSpeedup(cacheKey, totalTime);
      const speedupText = speedup ? ` | ${speedup}` : '';
      console.log(`✅ [Cache HIT] Flight search: ${from || 'all'} → ${to || 'all'} | Redis: ${cacheResult.time}ms | Total: ${totalTime}ms${speedupText}`);
      return res.json({
        ...cacheResult.value,
        cached: true
      });
    }
    
    const dbStartTime = Date.now();
    console.log(`❌ [Cache MISS] Flight search: ${from || 'all'} → ${to || 'all'}`);

    const flights = await Flight.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await Flight.countDocuments(query);

    const dbTime = Date.now() - dbStartTime;
    
    const result = {
      success: true,
      data: flights,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    // Cache for 2 minutes (120 seconds) - search results change frequently
    const cacheStartTime = Date.now();
    await setCache(cacheKey, result, 120);
    const cacheTime = Date.now() - cacheStartTime;
    
    const totalTime = Date.now() - requestStartTime;
    console.log(`   DB: ${dbTime}ms | Cache Write: ${cacheTime}ms | Total: ${totalTime}ms`);
    
    // Record cache miss for performance tracking
    recordCacheMiss(cacheKey, totalTime);

    res.json({
      ...result,
      cached: false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching flights',
      error: error.message
    });
  }
};

// Get flight by ID
exports.getFlightById = async (req, res) => {
  const requestStartTime = Date.now();
  try {
    const flightId = req.params.id;
    const cacheKey = `flight:${flightId}`;
    
    // Try to get from cache first
    const cacheResult = await getCache(cacheKey);
    if (cacheResult && cacheResult.value) {
      const totalTime = Date.now() - requestStartTime;
      const speedup = calculateSpeedup(cacheKey, totalTime);
      const speedupText = speedup ? ` | ${speedup}` : '';
      console.log(`✅ [Cache HIT] Flight ${flightId} | Redis: ${cacheResult.time}ms | Total: ${totalTime}ms${speedupText}`);
      return res.json({
        success: true,
        data: cacheResult.value,
        cached: true
      });
    }
    
    const dbStartTime = Date.now();
    console.log(`❌ [Cache MISS] Flight ${flightId} - fetching from DB`);
    
    const flight = await Flight.findById(flightId);
    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    const dbTime = Date.now() - dbStartTime;
    
    // Cache for 5 minutes (300 seconds)
    const cacheStartTime = Date.now();
    await setCache(cacheKey, flight, 300);
    const cacheTime = Date.now() - cacheStartTime;
    
    const totalTime = Date.now() - requestStartTime;
    console.log(`   DB: ${dbTime}ms | Cache Write: ${cacheTime}ms | Total: ${totalTime}ms`);
    
    // Record cache miss for performance tracking
    recordCacheMiss(cacheKey, totalTime);

    res.json({
      success: true,
      data: flight,
      cached: false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching flight',
      error: error.message
    });
  }
};

// Get flight by flight ID
exports.getFlightByFlightId = async (req, res) => {
  try {
    const flight = await Flight.findOne({ flightId: req.params.flightId.toUpperCase() });
    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    res.json({
      success: true,
      data: flight
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching flight',
      error: error.message
    });
  }
};

// Update flight
exports.updateFlight = async (req, res) => {
  try {
    // Debug: Log incoming data
    console.log('Update flight request body:', JSON.stringify(req.body, null, 2));
    
    // Process the request body
    const updateData = processFlightData(req.body);
    
    // Debug: Log processed data
    console.log('Processed update data:', JSON.stringify(updateData, null, 2));
    console.log('Return flight fields in update data:', {
      returnFlightId: updateData.returnFlightId,
      returnDepartureDateTime: updateData.returnDepartureDateTime,
      returnArrivalDateTime: updateData.returnArrivalDateTime,
      returnDuration: updateData.returnDuration,
      returnTicketPrice: updateData.returnTicketPrice,
      returnFlightClass: updateData.returnFlightClass
    });
    
    // First, get the existing flight to merge with update data
    const existingFlight = await Flight.findById(req.params.id);
    if (!existingFlight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    // Store old price for price drop notification
    const oldPrice = existingFlight.ticketPrice;
    const oldReturnPrice = existingFlight.returnTicketPrice;
    
    // Merge update data with existing flight data to ensure all required fields are present
    // This is necessary because runValidators validates the entire document
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && updateData[key] !== null && updateData[key] !== '') {
        // Handle nested objects (like duration, returnDuration, airports)
        if (typeof updateData[key] === 'object' && !Array.isArray(updateData[key]) && !(updateData[key] instanceof Date) && updateData[key] !== null) {
          existingFlight[key] = { ...(existingFlight[key] || {}), ...updateData[key] };
        } else {
          existingFlight[key] = updateData[key];
        }
      }
    });
    
    // Debug: Log the merged data before validation
    console.log('Merged flight data before save:', {
      returnFlightId: existingFlight.returnFlightId,
      returnDepartureDateTime: existingFlight.returnDepartureDateTime,
      returnArrivalDateTime: existingFlight.returnArrivalDateTime,
      returnDuration: existingFlight.returnDuration,
      returnTicketPrice: existingFlight.returnTicketPrice,
      returnFlightClass: existingFlight.returnFlightClass,
      returnTotalAvailableSeats: existingFlight.returnTotalAvailableSeats,
      returnAvailableSeats: existingFlight.returnAvailableSeats
    });
    
    const chronologyValidation = validateChronology(existingFlight);
    if (!chronologyValidation.valid) {
      return res.status(400).json({
        success: false,
        message: chronologyValidation.message,
        field: chronologyValidation.field
      });
    }

    const totalSeats = Number(existingFlight.totalAvailableSeats);
    const availableSeats = Number(existingFlight.availableSeats);
    if (!Number.isNaN(totalSeats)) {
      if (totalSeats > 60) {
        return res.status(400).json({
          success: false,
          message: 'Total available seats cannot exceed 60 for the outbound flight.',
          field: 'totalAvailableSeats'
        });
      }
    }
    if (!Number.isNaN(availableSeats) && availableSeats > totalSeats) {
      return res.status(400).json({
        success: false,
        message: 'Available seats cannot exceed total seats for the outbound flight.',
        field: 'availableSeats'
      });
    }

    const returnTotalSeats = Number(existingFlight.returnTotalAvailableSeats);
    const returnAvailableSeats = Number(existingFlight.returnAvailableSeats);
    if (!Number.isNaN(returnTotalSeats)) {
      if (returnTotalSeats > 60) {
        return res.status(400).json({
          success: false,
          message: 'Return total available seats cannot exceed 60.',
          field: 'returnTotalAvailableSeats'
        });
      }
    }
    if (!Number.isNaN(returnAvailableSeats) && returnAvailableSeats > returnTotalSeats) {
      return res.status(400).json({
        success: false,
        message: 'Return available seats cannot exceed total seats for the return flight.',
        field: 'returnAvailableSeats'
      });
    }

    // Validate and save the document
    // This ensures all required fields (including return fields) are validated
    try {
      await existingFlight.validate();
    } catch (validationError) {
      console.error('Validation error:', validationError);
      console.error('Validation error details:', validationError.errors);
      throw validationError;
    }
    await existingFlight.save();
    
    // Fetch the updated flight to return it
    const flight = await Flight.findById(req.params.id);
    
    // Debug: Log saved flight
    console.log('Flight updated successfully. Return flight fields:', {
      returnFlightId: flight.returnFlightId,
      returnDepartureDateTime: flight.returnDepartureDateTime,
      returnArrivalDateTime: flight.returnArrivalDateTime,
      returnTicketPrice: flight.returnTicketPrice,
      returnDuration: flight.returnDuration
    });
    
    // Verify the update was successful by checking the database
    const verifyFlight = await Flight.findById(req.params.id).lean();
    console.log('Verification - Flight return fields in DB:', {
      returnFlightId: verifyFlight?.returnFlightId,
      returnDepartureDateTime: verifyFlight?.returnDepartureDateTime,
      returnArrivalDateTime: verifyFlight?.returnArrivalDateTime,
      returnTicketPrice: verifyFlight?.returnTicketPrice,
      returnDuration: verifyFlight?.returnDuration
    });

    // Check for price drops and notify users
    const { notifyPriceDrop } = require('../utils/priceDropNotification');
    const newPrice = flight.ticketPrice;
    const newReturnPrice = flight.returnTicketPrice;
    
    // Check if returnTicketPrice was actually changed in this update
    const returnPriceWasChanged = req.body.returnTicketPrice !== undefined && 
                                   req.body.returnTicketPrice !== null &&
                                   req.body.returnTicketPrice !== oldReturnPrice;
    
    // Notify about outbound flight price drop (only once, with both IDs handled internally)
    // Only notify if price actually dropped
    if (oldPrice && newPrice && newPrice < oldPrice) {
      const flightObj = flight.toObject();
      // Pass both IDs in the flightData, notifyPriceDrop will handle deduplication
      await notifyPriceDrop(flight._id.toString(), oldPrice, newPrice, flightObj);
    }
    
    // Notify about return flight price drop ONLY if return price was actually changed in this update
    if (returnPriceWasChanged && oldReturnPrice && newReturnPrice && newReturnPrice < oldReturnPrice && flight.returnFlightId) {
      const returnFlightObj = {
        ...flight.toObject(),
        flightId: flight.returnFlightId,
        ticketPrice: newReturnPrice
      };
      // Only notify once for return flight
      await notifyPriceDrop(flight.returnFlightId, oldReturnPrice, newReturnPrice, returnFlightObj);
    }

    // Invalidate cache for this flight and all search results
    await deleteCache(`flight:${req.params.id}`);
    await deleteCacheByPattern('flight:search:*');

    res.json({
      success: true,
      message: 'Flight updated successfully',
      data: flight
    });
  } catch (error) {
    console.error('Error updating flight:', error);
    // Return more detailed error information
    const statusCode = error.name === 'ValidationError' ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: 'Error updating flight',
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : undefined
    });
  }
};

// Delete flight
exports.deleteFlight = async (req, res) => {
  try {
    const flightId = req.params.id;
    const flight = await Flight.findByIdAndDelete(flightId);
    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    // Invalidate cache for this flight and all search results
    await deleteCache(`flight:${flightId}`);
    await deleteCacheByPattern('flight:search:*');

    res.json({
      success: true,
      message: 'Flight deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting flight',
      error: error.message
    });
  }
};

// Add review
exports.addReview = async (req, res) => {
  try {
    const { userId, userName, rating, comment } = req.body;
    const flight = await Flight.findById(req.params.id);

    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    // Check if user already reviewed this flight
    const existingReview = flight.passengerReviews.find(
      review => review.userId === userId
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this flight'
      });
    }

    // Verify user has a booking for this flight
    try {
      const axios = require('axios');
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:5001';
      const flightId = flight._id.toString();
      
      const userResponse = await axios.get(`${userServiceUrl}/api/users/${userId}/bookings`, {
        timeout: 5000
      });

      if (userResponse.data.success) {
        const bookings = userResponse.data.data || [];
        
        // Check if user has a booking for this flight
        const hasBooking = bookings.some(booking => {
          if (booking.type !== 'flight') return false;
          if (booking.status === 'cancelled') return false; // Don't allow reviews for cancelled bookings
          
          // Check if booking is for this flight
          const bookingItemId = booking.details?._id || booking.details?.id || booking.details?.flightId;
          if (bookingItemId && bookingItemId.toString() === flightId) {
            return true;
          }
          
          // Also check by flightId if available
          if (booking.details?.flightId === flight.flightId) {
            return true;
          }
          
          return false;
        });

        if (!hasBooking) {
          return res.status(403).json({
            success: false,
            message: 'You can only review flights you have booked. Please book this flight first to leave a review.'
          });
        }
      }
    } catch (userServiceError) {
      // If user service is unavailable, log but allow review (fail open for better UX)
      console.warn('Could not verify booking status with User Service:', userServiceError.message);
      // Continue with review creation
    }

    // Add review
    flight.passengerReviews.push({
      userId,
      userName,
      rating,
      comment
    });

    // Update average rating
    const totalRating = flight.passengerReviews.reduce((sum, review) => sum + review.rating, 0);
    flight.flightRating.average = totalRating / flight.passengerReviews.length;
    flight.flightRating.count = flight.passengerReviews.length;

    await flight.save();

    res.json({
      success: true,
      message: 'Review added successfully',
      data: flight.passengerReviews[flight.passengerReviews.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding review',
      error: error.message
    });
  }
};

// Helper function to generate seat map
function generateSeatMap(totalSeats, flightClass) {
  const seatMap = [];
  const rows = Math.ceil(totalSeats / 6); // 6 seats per row (A, B, C, D, E, F)
  const columns = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  let seatCount = 0;
  for (let row = 1; row <= rows && seatCount < totalSeats; row++) {
    for (const col of columns) {
      if (seatCount >= totalSeats) break;
      const seatNumber = `${row}${col}`;
      seatMap.push({
        seatNumber,
        row,
        column: col,
        class: flightClass,
        status: 'available',
        bookedBy: null
      });
      seatCount++;
    }
  }
  
  return seatMap;
}

// Get seat map
exports.getSeatMap = async (req, res) => {
  try {
    const { returnFlight } = req.query; // Check if requesting return flight seat map
    // Handle both string 'true' and boolean true
    const isReturnFlight = returnFlight === 'true' || returnFlight === true;
    let flight;
    
    // Try to find by MongoDB ID first, then by flightId
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      flight = await Flight.findById(req.params.id);
    }
    
    // If not found by ID, try by flightId
    if (!flight) {
      flight = await Flight.findOne({ flightId: req.params.id });
    }

    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    // Initialize seat map if it doesn't exist
    let seatMap = isReturnFlight ? flight.returnSeatMap : flight.seatMap;
    let needsUpdate = false;
    
    if (!seatMap || seatMap.length === 0) {
      if (isReturnFlight) {
        seatMap = generateSeatMap(flight.returnTotalAvailableSeats, flight.returnFlightClass);
        flight.returnSeatMap = seatMap;
      } else {
        seatMap = generateSeatMap(flight.totalAvailableSeats, flight.flightClass);
        flight.seatMap = seatMap;
      }
      needsUpdate = true;
    }

    // Clean up expired reservations before returning seat map
    const releasedCount = cleanupExpiredReservations(seatMap);
    if (releasedCount > 0) {
      // Update available seats count
      if (isReturnFlight) {
        flight.returnAvailableSeats += releasedCount;
      } else {
        flight.availableSeats += releasedCount;
      }
      needsUpdate = true;
      console.log(`Cleaned up ${releasedCount} expired reservation(s) for flight ${flight.flightId}`);
    }

    // Save the flight if we initialized seat maps or cleaned up reservations
    if (needsUpdate) {
      await flight.save();
    }

    res.json({
      success: true,
      data: {
        seatMap: seatMap || [],
        totalSeats: isReturnFlight ? flight.returnTotalAvailableSeats : flight.totalAvailableSeats,
        availableSeats: isReturnFlight ? flight.returnAvailableSeats : flight.availableSeats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching seat map',
      error: error.message
    });
  }
};

// Reserve specific seats
const normalizeReturnFlag = (value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return Boolean(normalized);
  }
  return Boolean(value);
};

exports.reserveSeats = async (req, res) => {
  try {
    const { seatNumbers, bookingId, userId, returnFlight } = req.body;
    const rawReturnFlight = returnFlight !== undefined ? returnFlight : req.query.returnFlight;
    // Handle both string and boolean representations, falling back to query param if needed
    const isReturnFlight = normalizeReturnFlag(rawReturnFlight);
    const flight = await Flight.findById(req.params.id);

    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    if (!seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Seat numbers are required'
      });
    }

    const seatMap = isReturnFlight ? flight.returnSeatMap : flight.seatMap;
    
    // Clean up expired reservations before processing new reservations
    const releasedCount = cleanupExpiredReservations(seatMap);
    if (releasedCount > 0) {
      if (isReturnFlight) {
        flight.returnAvailableSeats += releasedCount;
      } else {
        flight.availableSeats += releasedCount;
      }
      await flight.save();
      console.log(`Cleaned up ${releasedCount} expired reservation(s) before new reservation`);
    }
    
    const unavailableSeats = [];
    const reservedSeats = [];

    // Check and reserve each seat
    for (const seatNumber of seatNumbers) {
      const seat = seatMap.find(s => s.seatNumber === seatNumber);
      
      if (!seat) {
        unavailableSeats.push(seatNumber);
        continue;
      }

      // Check if seat is available
      if (seat.status === 'booked') {
        unavailableSeats.push(seatNumber);
        continue;
      }

      // Check if seat is already reserved by someone else (race condition)
      if (seat.status === 'reserved') {
        // Check if reservation has expired
        if (seat.bookedBy?.reservedAt) {
          const reservedAt = new Date(seat.bookedBy.reservedAt);
          const timeSinceReservation = new Date().getTime() - reservedAt.getTime();
          if (timeSinceReservation > RESERVATION_EXPIRY_TIME) {
            // Reservation expired, make it available
            seat.status = 'available';
            seat.bookedBy = null;
            if (isReturnFlight) {
              flight.returnAvailableSeats += 1;
            } else {
              flight.availableSeats += 1;
            }
          }
        }
        
        // If still reserved by different user/booking, it's unavailable
        if (seat.status === 'reserved' && seat.bookedBy && 
            (seat.bookedBy.userId !== userId || seat.bookedBy.bookingId !== bookingId)) {
          unavailableSeats.push(seatNumber);
          continue;
        }
        // If already reserved by same user/booking, skip (idempotent)
        if (seat.status === 'reserved') {
          reservedSeats.push(seatNumber);
          continue;
        }
      }

      // Reserve the seat (status is 'available')
      seat.status = 'reserved';
      seat.bookedBy = {
        userId: userId || null,
        bookingId: bookingId || null,
        reservedAt: new Date()
      };
      reservedSeats.push(seatNumber);
    }

    if (unavailableSeats.length > 0) {
      // Release any seats we successfully reserved before the error
      for (const seatNumber of reservedSeats) {
        const seat = seatMap.find(s => s.seatNumber === seatNumber);
        if (seat && seat.status === 'reserved' && seat.bookedBy?.bookingId === bookingId) {
          seat.status = 'available';
          seat.bookedBy = null;
        }
      }
      
      // Restore available seats count
      if (reservedSeats.length > 0) {
        if (isReturnFlight) {
          flight.returnAvailableSeats += reservedSeats.length;
        } else {
          flight.availableSeats += reservedSeats.length;
        }
        await flight.save();
      }
      
      return res.status(400).json({
        success: false,
        message: 'Some seats are not available',
        unavailableSeats,
        reservedSeats: [] // Empty since we released them
      });
    }

    // Update available seats count
    if (isReturnFlight) {
      flight.returnAvailableSeats -= reservedSeats.length;
    } else {
      flight.availableSeats -= reservedSeats.length;
    }

    await flight.save();

    res.json({
      success: true,
      message: 'Seats reserved successfully',
      data: {
        reservedSeats,
        availableSeats: isReturnFlight ? flight.returnAvailableSeats : flight.availableSeats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reserving seats',
      error: error.message
    });
  }
};

// Release reserved seats (change from reserved back to available)
exports.releaseSeats = async (req, res) => {
  try {
    const { seatNumbers, bookingId, userId, returnFlight } = req.body;
    const rawReturnFlight = returnFlight !== undefined ? returnFlight : req.query.returnFlight;
    const isReturnFlight = normalizeReturnFlag(rawReturnFlight);
    const flight = await Flight.findById(req.params.id);

    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    if (!seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Seat numbers are required'
      });
    }

    const seatMap = isReturnFlight ? flight.returnSeatMap : flight.seatMap;
    const releasedSeats = [];

    for (const seatNumber of seatNumbers) {
      const seat = seatMap.find(s => s.seatNumber === seatNumber);
      if (seat && seat.status === 'reserved') {
        // Only release if it matches the bookingId or userId (for safety)
        if (!bookingId && !userId) {
          // If no bookingId/userId provided, release anyway (cleanup case)
          seat.status = 'available';
          seat.bookedBy = null;
          releasedSeats.push(seatNumber);
        } else if (
          (bookingId && seat.bookedBy?.bookingId === bookingId) ||
          (userId && seat.bookedBy?.userId === userId)
        ) {
          seat.status = 'available';
          seat.bookedBy = null;
          releasedSeats.push(seatNumber);
        }
      }
    }

    if (releasedSeats.length > 0) {
      // Restore available seats count
      if (isReturnFlight) {
        flight.returnAvailableSeats += releasedSeats.length;
      } else {
        flight.availableSeats += releasedSeats.length;
      }
      await flight.save();
    }

    res.json({
      success: true,
      message: 'Seats released successfully',
      data: {
        releasedSeats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error releasing seats',
      error: error.message
    });
  }
};

// Clean up expired reservations for a specific flight
exports.cleanupExpiredReservations = async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.id);
    
    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    let totalReleased = 0;
    
    // Clean up outbound flight reservations
    const outboundReleased = cleanupExpiredReservations(flight.seatMap);
    if (outboundReleased > 0) {
      flight.availableSeats += outboundReleased;
      totalReleased += outboundReleased;
    }
    
    // Clean up return flight reservations
    const returnReleased = cleanupExpiredReservations(flight.returnSeatMap);
    if (returnReleased > 0) {
      flight.returnAvailableSeats += returnReleased;
      totalReleased += returnReleased;
    }
    
    if (totalReleased > 0) {
      await flight.save();
    }

    res.json({
      success: true,
      message: `Cleaned up ${totalReleased} expired reservation(s)`,
      data: {
        outboundReleased,
        returnReleased,
        totalReleased
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cleaning up expired reservations',
      error: error.message
    });
  }
};

// Confirm seat booking (change from reserved to booked)
exports.confirmSeats = async (req, res) => {
  try {
    const { seatNumbers, bookingId, returnFlight } = req.body;
    const rawReturnFlight = returnFlight !== undefined ? returnFlight : req.query.returnFlight;
    // Handle both string and boolean representations, falling back to query param if needed
    const isReturnFlight = normalizeReturnFlag(rawReturnFlight);
    const flight = await Flight.findById(req.params.id);

    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    const seatMap = isReturnFlight ? flight.returnSeatMap : flight.seatMap;
    
    // Clean up expired reservations before confirming
    const releasedCount = cleanupExpiredReservations(seatMap);
    if (releasedCount > 0) {
      if (isReturnFlight) {
        flight.returnAvailableSeats += releasedCount;
      } else {
        flight.availableSeats += releasedCount;
      }
      console.log(`Cleaned up ${releasedCount} expired reservation(s) before confirming seats`);
    }
    
    const confirmedSeats = [];

    for (const seatNumber of seatNumbers) {
      const seat = seatMap.find(s => s.seatNumber === seatNumber);
      if (seat && seat.status === 'reserved') {
        seat.status = 'booked';
        if (seat.bookedBy) {
          seat.bookedBy.bookingId = bookingId;
        }
        confirmedSeats.push(seatNumber);
      }
    }

    await flight.save();

    res.json({
      success: true,
      message: 'Seats confirmed successfully',
      data: {
        confirmedSeats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error confirming seats',
      error: error.message
    });
  }
};

// Update available seats (for booking) - Legacy method, kept for backward compatibility
exports.updateSeats = async (req, res) => {
  try {
    const { seats } = req.body;
    const flight = await Flight.findById(req.params.id);

    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    if (flight.availableSeats < seats) {
      return res.status(400).json({
        success: false,
        message: 'Not enough seats available'
      });
    }

    flight.availableSeats -= seats;
    await flight.save();

    res.json({
      success: true,
      message: 'Seats updated successfully',
      data: {
        availableSeats: flight.availableSeats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating seats',
      error: error.message
    });
  }
};

