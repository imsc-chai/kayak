const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Import validation helpers from User model
const { SSN_REGEX, ZIP_REGEX, isValidUSState, VALID_STATE_ABBREVIATIONS } = require('../models/User');

// Custom error classes for specific exceptions
class DuplicateUserError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DuplicateUserError';
    this.statusCode = 409;
  }
}

class InvalidSSNError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidSSNError';
    this.statusCode = 400;
  }
}

class InvalidStateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidStateError';
    this.statusCode = 400;
  }
}

class InvalidZipError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidZipError';
    this.statusCode = 400;
  }
}

class MissingRequiredFieldError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MissingRequiredFieldError';
    this.statusCode = 400;
  }
}

class SSNModificationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SSNModificationError';
    this.statusCode = 403;
  }
}

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d'
  });
};

// Register new user
exports.register = async (req, res) => {
  try {
    const {
      userId,
      firstName,
      lastName,
      address,
      city,
      state,
      zipCode,
      phoneNumber,
      email,
      password,
      profileImage,
      creditCard
    } = req.body;

    // Validate SSN is provided (never auto-generate)
    if (!userId) {
      throw new MissingRequiredFieldError('SSN (userId) is required. User must provide their SSN.');
    }

    // Validate SSN format: ###-##-####
    if (!SSN_REGEX.test(userId)) {
      throw new InvalidSSNError('Invalid SSN format. Must be ###-##-#### (e.g., 123-45-6789)');
    }

    // Validate required fields
    const requiredFields = { firstName, lastName, address, city, state, zipCode, phoneNumber, email, password };
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    
    if (missingFields.length > 0) {
      throw new MissingRequiredFieldError(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate state (US state abbreviation or full name)
    if (!isValidUSState(state)) {
      throw new InvalidStateError(
        `Invalid state: "${state}". Must be a valid US state abbreviation (e.g., CA, NY, TX) or full name (e.g., California, New York, Texas). Valid abbreviations: ${VALID_STATE_ABBREVIATIONS.join(', ')}`
      );
    }

    // Validate zip code format: ##### or #####-####
    if (!ZIP_REGEX.test(zipCode)) {
      throw new InvalidZipError('Invalid zip code format. Must be ##### or #####-#### (e.g., 12345 or 12345-6789)');
    }

    // Check for duplicate SSN
    const existingUserBySSN = await User.findOne({ userId });
    if (existingUserBySSN) {
      throw new DuplicateUserError('A user with this SSN already exists');
    }

    // Check for duplicate email
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      throw new DuplicateUserError('A user with this email already exists');
    }

    // Create new user with all required fields
    const user = new User({
      userId,
      firstName,
      lastName,
      address,
      city,
      state,
      zipCode,
      phoneNumber,
      email,
      password,
      profileImage: profileImage || 'https://via.placeholder.com/150',
      creditCard: creditCard || {
        cardNumber: '',
        cardHolderName: '',
        expiryDate: '',
        cvv: ''
      }
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    // Handle specific error types
    if (error instanceof DuplicateUserError) {
      return res.status(409).json({
        success: false,
        errorType: 'DUPLICATE_USER',
        message: error.message
      });
    }
    if (error instanceof InvalidSSNError) {
      return res.status(400).json({
        success: false,
        errorType: 'INVALID_SSN',
        message: error.message
      });
    }
    if (error instanceof InvalidStateError) {
      return res.status(400).json({
        success: false,
        errorType: 'INVALID_STATE',
        message: error.message
      });
    }
    if (error instanceof InvalidZipError) {
      return res.status(400).json({
        success: false,
        errorType: 'INVALID_ZIP',
        message: error.message
      });
    }
    if (error instanceof MissingRequiredFieldError) {
      return res.status(400).json({
        success: false,
        errorType: 'MISSING_REQUIRED_FIELD',
        message: error.message
      });
    }
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        errorType: 'DUPLICATE_USER',
        message: `A user with this ${field === 'userId' ? 'SSN' : field} already exists`
      });
    }
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        errorType: 'VALIDATION_ERROR',
        message: messages.join('. ')
      });
    }
    res.status(500).json({
      success: false,
      errorType: 'SERVER_ERROR',
      message: 'Error registering user',
      error: error.message
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userData = user.toJSON();
    
    // Ensure nested objects are always present, even if empty
    if (!userData.emergencyContact) {
      userData.emergencyContact = {
        name: '',
        phone: '',
        relationship: ''
      };
    }
    
    if (!userData.travelPreferences) {
      userData.travelPreferences = {
        passportNumber: '',
        frequentFlyerNumber: '',
        seatPreference: 'No Preference',
        mealPreference: 'No Preference'
      };
    }

    console.log('Returning user data:', JSON.stringify(userData, null, 2));
    console.log('Emergency Contact:', userData.emergencyContact);
    console.log('Travel Preferences:', userData.travelPreferences);

    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// Get user by email
exports.getUserByEmail = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// Get all users (for admin)
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 1000, search } = req.query;
    const query = {};
    
    if (search) {
      query.$or = [
        { email: new RegExp(search, 'i') },
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { userId: new RegExp(search, 'i') }
      ];
    }
    
    const skip = (page - 1) * limit;
    const users = await User.find(query).select('-password').skip(skip).limit(Number(limit));
    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users.map(user => user.toJSON()),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const id = req.params.id;
    const updateData = req.body;

    // Don't allow password update through this endpoint
    delete updateData.password;
    
    // NEVER allow changing User ID (SSN) - throw exception if attempted
    if (updateData.userId !== undefined) {
      throw new SSNModificationError('User ID (SSN) cannot be modified. SSN is immutable once set.');
    }

    // Validate that the user ID is a valid MongoDB ObjectId
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Validate state if being updated
    if (updateData.state !== undefined && updateData.state !== '') {
      if (!isValidUSState(updateData.state)) {
        throw new InvalidStateError(
          `Invalid state: "${updateData.state}". Must be a valid US state abbreviation (e.g., CA, NY, TX) or full name (e.g., California, New York, Texas). Valid abbreviations: ${VALID_STATE_ABBREVIATIONS.join(', ')}`
        );
      }
    }

    // Validate zip code if being updated
    if (updateData.zipCode !== undefined && updateData.zipCode !== '') {
      if (!ZIP_REGEX.test(updateData.zipCode)) {
        throw new InvalidZipError('Invalid zip code format. Must be ##### or #####-#### (e.g., 12345 or 12345-6789)');
      }
    }

    // Optional: Verify that the user making the request owns this account
    // (req.userId is set by auth middleware from JWT token)
    // Allow admins to update any user profile
    // If user is not an admin, they can only update their own profile
    const isAdmin = req.isAdmin === true;
    console.log('Update user - req.isAdmin:', req.isAdmin, 'isAdmin (boolean):', isAdmin);
    console.log('Update user - req.userId:', req.userId);
    console.log('Update user - target id:', id);
    console.log('Update user - Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    
    // If user is admin, allow update regardless of userId match
    if (isAdmin) {
      console.log('✅ Allowing update - user is admin');
    } else if (req.userId && req.userId !== id) {
      // If not admin and trying to update different user, block
      console.log('❌ Blocking update - user is not admin and trying to update different user');
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile'
      });
    } else {
      console.log('✅ Allowing update - user is updating their own profile');
    }

    // Handle nested objects - MongoDB can handle nested objects directly with $set
    // But we need to ensure the structure matches the schema
    const updateQuery = {};
    
    // Handle top-level fields - skip empty strings for enum fields
    Object.keys(updateData).forEach(key => {
      if (key !== 'emergencyContact' && key !== 'travelPreferences' && key !== '_id' && key !== '__v') {
        // For gender, if it's empty string, don't include it (or set to undefined to keep default)
        if (key === 'gender' && updateData[key] === '') {
          // Skip empty gender - let it use default
        } else {
          updateQuery[key] = updateData[key];
        }
      }
    });
    
    // Handle nested emergencyContact object - set the entire object
    if (updateData.emergencyContact) {
      updateQuery['emergencyContact'] = {
        name: updateData.emergencyContact.name || '',
        phone: updateData.emergencyContact.phone || '',
        relationship: updateData.emergencyContact.relationship || '',
      };
    }
    
    // Handle nested travelPreferences object - set the entire object
    if (updateData.travelPreferences) {
      updateQuery['travelPreferences'] = {
        passportNumber: updateData.travelPreferences.passportNumber || '',
        frequentFlyerNumber: updateData.travelPreferences.frequentFlyerNumber || '',
        seatPreference: updateData.travelPreferences.seatPreference || 'No Preference',
        mealPreference: updateData.travelPreferences.mealPreference || 'No Preference',
      };
    }
    
    // Handle nested creditCard object - mask card number (only store last 4 digits)
    if (updateData.creditCard) {
      let maskedCardNumber = '';
      if (updateData.creditCard.cardNumber) {
        const cardNumber = updateData.creditCard.cardNumber.replace(/\s/g, ''); // Remove spaces
        // If it's already masked (contains *), keep it as is
        // Otherwise, mask it to only store last 4 digits
        if (cardNumber.includes('*')) {
          maskedCardNumber = updateData.creditCard.cardNumber;
        } else if (cardNumber.length >= 4) {
          maskedCardNumber = `**** **** **** ${cardNumber.slice(-4)}`;
        } else {
          maskedCardNumber = updateData.creditCard.cardNumber; // Keep as is if less than 4 digits
        }
      }
      
      updateQuery['creditCard'] = {
        cardNumber: maskedCardNumber,
        cardHolderName: updateData.creditCard.cardHolderName || '',
        expiryDate: updateData.creditCard.expiryDate || '',
        cvv: '', // NEVER store CVV
      };
    }

    console.log('Update query:', JSON.stringify(updateQuery, null, 2));
    console.log('Original updateData:', JSON.stringify(updateData, null, 2));

    // Use runValidators: false for now to avoid enum validation issues with empty strings
    // We'll validate manually if needed
    const user = await User.findByIdAndUpdate(
      id,
      { $set: updateQuery },
      { new: true, runValidators: false }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updatedUser = user.toJSON();
    
    // Ensure nested objects are always present, even if empty
    if (!updatedUser.emergencyContact) {
      updatedUser.emergencyContact = {
        name: '',
        phone: '',
        relationship: ''
      };
    }
    
    if (!updatedUser.travelPreferences) {
      updatedUser.travelPreferences = {
        passportNumber: '',
        frequentFlyerNumber: '',
        seatPreference: 'No Preference',
        mealPreference: 'No Preference'
      };
    }
    
    console.log('Updated user from DB:', JSON.stringify(updatedUser, null, 2));
    console.log('Updated user emergencyContact:', updatedUser.emergencyContact);
    console.log('Updated user travelPreferences:', updatedUser.travelPreferences);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    // Handle specific error types
    if (error instanceof SSNModificationError) {
      return res.status(403).json({
        success: false,
        errorType: 'SSN_MODIFICATION_NOT_ALLOWED',
        message: error.message
      });
    }
    if (error instanceof InvalidStateError) {
      return res.status(400).json({
        success: false,
        errorType: 'INVALID_STATE',
        message: error.message
      });
    }
    if (error instanceof InvalidZipError) {
      return res.status(400).json({
        success: false,
        errorType: 'INVALID_ZIP',
        message: error.message
      });
    }
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        errorType: 'VALIDATION_ERROR',
        message: messages.join('. ')
      });
    }
    res.status(500).json({
      success: false,
      errorType: 'SERVER_ERROR',
      message: 'Error updating user',
      error: error.message
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};

// Add booking to history
exports.addBooking = async (req, res) => {
  try {
    const userId = req.params.id;
    const booking = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { bookingHistory: booking } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Booking added to history',
      data: user.bookingHistory[user.bookingHistory.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding booking',
      error: error.message
    });
  }
};

// Get booking history
exports.getBookingHistory = async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let bookings = user.bookingHistory;
    if (status) {
      bookings = bookings.filter(booking => booking.status === status);
    }

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching booking history',
      error: error.message
    });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const userId = req.params.id;
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find booking by bookingId (string) or _id
    const booking = user.bookingHistory.find(
      b => b.bookingId === bookingId || b._id.toString() === bookingId
    );
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Only allow cancellation of upcoming/confirmed bookings
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    if (booking.status === 'past' || booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed booking'
      });
    }

    booking.status = 'cancelled';
    await user.save();

    // Update corresponding billing record
    try {
      const axios = require('axios');
      const billingServiceUrl = process.env.BILLING_SERVICE_URL || 'http://localhost:5005';
      await axios.post(`${billingServiceUrl}/api/billing/cancel-by-booking`, {
        bookingId: booking.bookingId || bookingId,
        reason: 'Booking cancelled by user'
      });
    } catch (billingError) {
      // Log error but don't fail the booking cancellation
      console.error('Error updating billing record:', billingError.message);
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: error.message
    });
  }
};

// Add review
exports.addReview = async (req, res) => {
  try {
    const userId = req.params.id;
    const review = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user already reviewed this item
    const existingReview = user.reviews.find(
      r => r.itemId === review.itemId && r.type === review.type
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this item'
      });
    }

    // Verify user has a booking for this item
    const hasBooking = user.bookingHistory.some(booking => {
      if (booking.type !== review.type) return false;
      if (booking.status === 'cancelled') return false; // Don't allow reviews for cancelled bookings
      
      // Check if booking is for this item
      const bookingItemId = booking.details?._id || booking.details?.id || 
                           (review.type === 'flight' ? booking.details?.flightId : null) ||
                           (review.type === 'hotel' ? booking.details?.hotelId : null) ||
                           (review.type === 'car' ? booking.details?.carId : null);
      
      if (bookingItemId && bookingItemId.toString() === review.itemId) {
        return true;
      }
      
      return false;
    });

    if (!hasBooking) {
      return res.status(403).json({
        success: false,
        message: `You can only review ${review.type}s you have booked. Please book this ${review.type} first to leave a review.`
      });
    }

    // Add review
    user.reviews.push(review);
    await user.save();

    res.json({
      success: true,
      message: 'Review added successfully',
      data: user.reviews[user.reviews.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding review',
      error: error.message
    });
  }
};

// Get user reviews
exports.getReviews = async (req, res) => {
  try {
    const userId = req.params.id;
    const { type } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let reviews = user.reviews;
    if (type) {
      reviews = reviews.filter(review => review.type === type);
    }

    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: error.message
    });
  }
};

// Add favourite
exports.addFavourite = async (req, res) => {
  try {
    const userId = req.params.id;
    const { itemId, type, itemData } = req.body;

    if (!itemId || !type || !itemData) {
      return res.status(400).json({
        success: false,
        message: 'itemId, type, and itemData are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already favourited
    const existingFavourite = user.favourites.find(
      fav => fav.itemId === itemId && fav.type === type
    );

    if (existingFavourite) {
      return res.status(400).json({
        success: false,
        message: 'Item is already in favourites'
      });
    }

    // Add to favourites
    user.favourites.push({
      itemId,
      type,
      itemData,
      addedAt: new Date()
    });

    await user.save();

    res.json({
      success: true,
      message: 'Added to favourites successfully',
      data: user.favourites[user.favourites.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding favourite',
      error: error.message
    });
  }
};

// Remove favourite
exports.removeFavourite = async (req, res) => {
  try {
    const userId = req.params.id;
    // Support both query params and body for flexibility
    const { itemId, type } = req.query.itemId ? req.query : req.body;

    if (!itemId || !type) {
      return res.status(400).json({
        success: false,
        message: 'itemId and type are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove from favourites
    user.favourites = user.favourites.filter(
      fav => !(fav.itemId === itemId && fav.type === type)
    );

    await user.save();

    res.json({
      success: true,
      message: 'Removed from favourites successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing favourite',
      error: error.message
    });
  }
};

// Get user favourites
exports.getFavourites = async (req, res) => {
  try {
    const userId = req.params.id;
    const { type } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let favourites = user.favourites;
    if (type) {
      favourites = favourites.filter(fav => fav.type === type);
    }

    res.json({
      success: true,
      data: favourites
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching favourites',
      error: error.message
    });
  }
};

// Get notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.params.id;
    const { read, type } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let notifications = user.notifications || [];

    // Filter by read status if provided
    if (read !== undefined) {
      const isRead = read === 'true';
      notifications = notifications.filter(n => n.read === isRead);
    }

    // Filter by type if provided
    if (type) {
      notifications = notifications.filter(n => n.type === type);
    }

    // Sort by createdAt (newest first)
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
};

// Mark notification as read
exports.markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.params.id;
    const { notificationId } = req.body;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: 'notificationId is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const notification = user.notifications.find(
      n => n.notificationId === notificationId || n._id.toString() === notificationId
    );
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.read = true;
    await user.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message
    });
  }
};

// Mark all notifications as read
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.notifications.forEach(notification => {
      notification.read = true;
    });

    await user.save();

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read',
      error: error.message
    });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.params.id;
    const { notificationId } = req.query.notificationId ? req.query : req.body;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: 'notificationId is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.notifications = user.notifications.filter(
      n => n.notificationId !== notificationId && n._id.toString() !== notificationId
    );

    await user.save();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message
    });
  }
};

// Find users with specific item in favourites (for price drop notifications)
exports.findUsersWithFavourite = async (req, res) => {
  try {
    const { itemId, type } = req.query;

    if (!itemId || !type) {
      return res.status(400).json({
        success: false,
        message: 'itemId and type are required'
      });
    }

    // Find all users who have this item in their favourites
    // Search for exact match on itemId (could be _id or custom ID like flightId, hotelId, carId)
    const users = await User.find({
      'favourites.itemId': itemId,
      'favourites.type': type
    }).select('_id userId email');

    // If no users found, it might be because favourites were saved with a different ID format
    // This is handled by the calling service trying both _id and custom ID

    res.json({
      success: true,
      data: users.map(user => ({
        userId: user._id.toString(),
        userIdentifier: user.userId,
        email: user.email
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error finding users with favourite',
      error: error.message
    });
  }
};

// Create notification (for system use - can be called when booking is created, etc.)
exports.createNotification = async (req, res) => {
  try {
    const userId = req.params.id;
    const { type, title, message, relatedId, relatedType } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'type, title, and message are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check for duplicate notification
    // For price drop alerts, we check by exact message match within last 30 seconds (to catch rapid duplicates)
    // For other notifications, we check exact match within 5 minutes
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const duplicateNotification = user.notifications.find(
      n => {
        // Must be unread
        if (n.read) {
          return false;
        }
        
        // Check if it's a price drop notification
        if (title === 'Price Drop Alert!' && n.title === 'Price Drop Alert!') {
          // For price drop alerts, check within 30 seconds for exact duplicates
          if (n.createdAt <= thirtySecondsAgo) {
            return false;
          }
          
          // Exact message match (most reliable for duplicates)
          if (n.message === message) {
            return true;
          }
          
          // Extract item ID from both messages (e.g., "SW1902" or "HOT019" from "Great news! ... (ID) has dropped...")
          const existingIdMatch = n.message.match(/\(([A-Z0-9]+)\)/);
          const newIdMatch = message.match(/\(([A-Z0-9]+)\)/);
          
          // If both have IDs, compare them
          if (existingIdMatch && newIdMatch) {
            if (existingIdMatch[1] === newIdMatch[1]) {
              // Same item ID - check if price drop amount is also the same
              const existingPriceMatch = n.message.match(/dropped by \$([0-9.]+)/);
              const newPriceMatch = message.match(/dropped by \$([0-9.]+)/);
              if (existingPriceMatch && newPriceMatch && existingPriceMatch[1] === newPriceMatch[1]) {
                // Same ID and same price drop amount - this is a duplicate
                return true;
              }
            }
          }
          
          // Fallback: if IDs don't match or aren't found, check if messages are very similar
          // (same price drop amount and same location/hotel name)
          const existingPriceMatch = n.message.match(/dropped by \$([0-9.]+)/);
          const newPriceMatch = message.match(/dropped by \$([0-9.]+)/);
          if (existingPriceMatch && newPriceMatch && existingPriceMatch[1] === newPriceMatch[1]) {
            // Same price drop amount - check if it's the same hotel/place
            // Extract hotel/place name (text before "in" or "from")
            const existingNameMatch = n.message.match(/Great news! (.+?) (?:in|from)/);
            const newNameMatch = message.match(/Great news! (.+?) (?:in|from)/);
            if (existingNameMatch && newNameMatch && existingNameMatch[1] === newNameMatch[1]) {
              // Same name and same price drop - likely duplicate
              return true;
            }
          }
        }
        
        // For non-price-drop notifications, check exact match within 5 minutes
        if (n.createdAt <= fiveMinutesAgo) {
          return false;
        }
        return n.title === title && 
               n.message === message && 
               n.relatedId === (relatedId || '');
      }
    );

    if (duplicateNotification) {
      // Duplicate found, return existing notification instead of creating a new one
      console.log(`[Duplicate Prevention] Duplicate notification prevented for user ${userId}: ${title}`);
      console.log(`[Duplicate Prevention] Existing message: "${duplicateNotification.message.substring(0, 50)}..."`);
      console.log(`[Duplicate Prevention] New message: "${message.substring(0, 50)}..."`);
      return res.json({
        success: true,
        message: 'Notification already exists',
        data: duplicateNotification
      });
    }

    const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const notification = {
      notificationId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(),
      relatedId: relatedId || '',
      relatedType: relatedType || ''
    };

    user.notifications.push(notification);
    await user.save();

    res.json({
      success: true,
      message: 'Notification created successfully',
      data: user.notifications[user.notifications.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating notification',
      error: error.message
    });
  }
};

