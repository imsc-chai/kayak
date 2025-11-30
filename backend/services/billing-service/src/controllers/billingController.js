const Billing = require('../models/Billing');
const { generateBillingId } = require('../utils/idGenerator');

exports.createBilling = async (req, res) => {
  try {
    // Validate required fields
    const { userId, bookingType, bookingId, totalAmountPaid, paymentMethod } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    if (!bookingType || !['flight', 'hotel', 'car'].includes(bookingType)) {
      return res.status(400).json({ success: false, message: 'Valid booking type (flight, hotel, car) is required' });
    }
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Booking ID is required' });
    }
    if (totalAmountPaid === undefined || totalAmountPaid === null || isNaN(totalAmountPaid) || totalAmountPaid < 0) {
      return res.status(400).json({ success: false, message: 'Valid total amount paid is required' });
    }
    if (!paymentMethod || !['Credit Card', 'Debit Card', 'PayPal', 'Bank Transfer', 'Cash'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Valid payment method is required' });
    }

    // Generate billing ID if not provided or if provided ID already exists
    if (!req.body.billingId) {
      req.body.billingId = await generateBillingId();
    } else {
      // Check if provided billing ID already exists
      const existingBilling = await Billing.findOne({ billingId: req.body.billingId });
      if (existingBilling) {
        // Regenerate if collision
        req.body.billingId = await generateBillingId();
      }
    }

    // Ensure dateOfTransaction is set
    if (!req.body.dateOfTransaction) {
      req.body.dateOfTransaction = new Date();
    }

    // Ensure transactionStatus is valid
    if (!req.body.transactionStatus || !['pending', 'completed', 'failed', 'refunded', 'cancelled'].includes(req.body.transactionStatus)) {
      req.body.transactionStatus = 'pending';
    }

    // Ensure totalAmountPaid is a number
    req.body.totalAmountPaid = Number(req.body.totalAmountPaid);

    // Keep bookingDetails (used only for Kafka events, not persisted)
    const bookingDetails = req.body.bookingDetails;

    // Ensure invoiceDetails is properly initialized if provided
    if (req.body.invoiceDetails && typeof req.body.invoiceDetails === 'object') {
      // Preserve existing invoiceDetails but ensure it's an object
      if (!req.body.invoiceDetails.invoiceNumber) {
        // invoiceNumber will be generated in pre-save hook
        req.body.invoiceDetails = { ...req.body.invoiceDetails };
      }
    } else if (!req.body.invoiceDetails) {
      // Initialize empty invoiceDetails if not provided
      req.body.invoiceDetails = {};
    }

    // Remove any fields not in the schema (like paymentDetails) to avoid issues
    const allowedFields = [
      'billingId', 'userId', 'bookingType', 'bookingId', 'itemId', 'dateOfTransaction',
      'totalAmountPaid', 'paymentMethod', 'transactionStatus', 'invoiceDetails',
      'receiptDetails', 'refundDetails'
    ];
    const cleanedBody = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        cleanedBody[field] = req.body[field];
      }
    });

    const billing = new Billing(cleanedBody);
    
    // Validate before saving
    const validationError = billing.validateSync();
    if (validationError) {
      const errors = Object.keys(validationError.errors).map(key => ({
        field: key,
        message: validationError.errors[key].message
      }));
      return res.status(400).json({ 
        success: false, 
        message: 'Billing validation failed', 
        errors: errors,
        error: validationError.message 
      });
    }

    await billing.save();
    
    // Publish booking.created event to Kafka
    let kafkaSuccess = false;
    try {
      const { publishBookingEvent, connectProducer } = require('../../../../../kafka/producers/bookingProducer');
      await connectProducer();
      await publishBookingEvent('booking.created', {
        bookingId: billing.bookingId,
        billingId: billing.billingId,
        userId: billing.userId,
        type: billing.bookingType,
        itemId: billing.itemId || null,
        totalAmountPaid: billing.totalAmountPaid,
        paymentMethod: billing.paymentMethod,
        transactionStatus: billing.transactionStatus,
        dateOfTransaction: billing.dateOfTransaction,
        data: {
          invoiceNumber: billing.invoiceDetails?.invoiceNumber,
          receiptNumber: billing.receiptDetails?.receiptNumber,
          bookingDetails: bookingDetails || null
        }
      });
      kafkaSuccess = true;
      console.log('✅ Successfully published booking.created event to Kafka');
    } catch (kafkaError) {
      // Log error but don't fail the billing creation
      console.error('❌ Error publishing booking.created event to Kafka:', kafkaError);
      
      // FALLBACK: If Kafka fails, directly add booking to user history via User Service API
      try {
        const axios = require('axios');
        const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:5001';
        const bookingPayload = {
          bookingId: billing.bookingId,
          type: billing.bookingType,
          bookingDate: billing.dateOfTransaction,
          status: 'upcoming',
          details: {
            ...(bookingDetails || {}),
            totalAmountPaid: billing.totalAmountPaid,
            paymentMethod: billing.paymentMethod,
            transactionStatus: billing.transactionStatus,
            billingId: billing.billingId,
            itemId: billing.itemId || null,
            invoiceNumber: billing.invoiceDetails?.invoiceNumber,
            receiptNumber: billing.receiptDetails?.receiptNumber
          }
        };
        
        await axios.post(`${userServiceUrl}/api/users/${billing.userId}/bookings`, bookingPayload, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        
        console.log('✅ Fallback: Successfully added booking to user history via User Service API');
      } catch (fallbackError) {
        console.error('❌ Fallback failed: Error adding booking to user history via API:', fallbackError.message);
        // Don't fail the billing creation even if fallback fails
      }
    }
    
    res.status(201).json({ success: true, message: 'Billing record created successfully', data: billing });
  } catch (error) {
    console.error('Error creating billing:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      errors: error.errors,
      stack: error.stack
    });
    
    // Handle duplicate key error (MongoDB unique constraint)
    if (error.code === 11000) {
      // Regenerate IDs and retry once
      try {
        req.body.billingId = await generateBillingId();
        const billing = new Billing(req.body);
        await billing.save();
        res.status(201).json({ success: true, message: 'Billing record created successfully', data: billing });
      } catch (retryError) {
        console.error('Retry error creating billing:', retryError);
        res.status(500).json({ 
          success: false, 
          message: 'Error creating billing record', 
          error: retryError.message,
          details: retryError.errors ? Object.keys(retryError.errors).map(key => ({
            field: key,
            message: retryError.errors[key].message
          })) : undefined
        });
      }
    } else if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      res.status(400).json({ 
        success: false, 
        message: 'Billing validation failed', 
        errors: errors,
        error: error.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Error creating billing record', 
        error: error.message,
        details: error.errors ? Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        })) : undefined
      });
    }
  }
};

exports.getBillings = async (req, res) => {
  try {
    const { userId, bookingType, status, startDate, endDate, month, year, page = 1, limit = 20 } = req.query;
    const query = {};

    if (userId) query.userId = userId;
    if (bookingType) query.bookingType = bookingType;
    if (status) query.transactionStatus = status;

    if (startDate || endDate) {
      query.dateOfTransaction = {};
      if (startDate) query.dateOfTransaction.$gte = new Date(startDate);
      if (endDate) query.dateOfTransaction.$lte = new Date(endDate);
    }

    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      query.dateOfTransaction = { $gte: start, $lte: end };
    }

    const sort = { dateOfTransaction: -1 };
    const skip = (page - 1) * limit;

    const billings = await Billing.find(query).sort(sort).skip(skip).limit(Number(limit));
    const total = await Billing.countDocuments(query);

    res.json({ success: true, data: billings, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching billing records', error: error.message });
  }
};

exports.getBillingById = async (req, res) => {
  try {
    const billing = await Billing.findById(req.params.id);
    if (!billing) return res.status(404).json({ success: false, message: 'Billing record not found' });
    res.json({ success: true, data: billing });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching billing record', error: error.message });
  }
};

exports.updateBilling = async (req, res) => {
  try {
    // Get old billing to check status change
    const oldBilling = await Billing.findById(req.params.id);
    if (!oldBilling) return res.status(404).json({ success: false, message: 'Billing record not found' });
    
    const billing = await Billing.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!billing) return res.status(404).json({ success: false, message: 'Billing record not found' });
    
    // Publish booking.confirmed event if status changed to 'completed'
    if (oldBilling.transactionStatus !== 'completed' && billing.transactionStatus === 'completed') {
      try {
        const { publishBookingEvent, connectProducer } = require('../../../../../kafka/producers/bookingProducer');
        await connectProducer();
        await publishBookingEvent('booking.confirmed', {
          bookingId: billing.bookingId,
          billingId: billing.billingId,
          userId: billing.userId,
          type: billing.bookingType,
          totalAmountPaid: billing.totalAmountPaid,
          paymentMethod: billing.paymentMethod,
          transactionStatus: billing.transactionStatus,
          dateOfTransaction: billing.dateOfTransaction,
          data: {
            invoiceNumber: billing.invoiceDetails?.invoiceNumber,
            receiptNumber: billing.receiptDetails?.receiptNumber
          }
        });
      } catch (kafkaError) {
        console.error('❌ Error publishing booking.confirmed event to Kafka:', kafkaError);
        // Don't fail the update if Kafka fails
      }
    }
    
    res.json({ success: true, message: 'Billing record updated successfully', data: billing });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating billing record', error: error.message });
  }
};

exports.processRefund = async (req, res) => {
  try {
    const { refundAmount, reason } = req.body;
    const billing = await Billing.findById(req.params.id);
    if (!billing) return res.status(404).json({ success: false, message: 'Billing record not found' });

    billing.refundDetails = {
      refundAmount: refundAmount || billing.totalAmountPaid,
      refundDate: new Date(),
      reason: reason || 'Customer request',
      status: 'pending'
    };
    billing.transactionStatus = 'refunded';
    await billing.save();

    res.json({ success: true, message: 'Refund processed successfully', data: billing });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error processing refund', error: error.message });
  }
};

exports.cancelBillingByBookingId = async (req, res) => {
  try {
    const { bookingId, reason } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Booking ID is required' });
    }

    // Find billing record by bookingId
    const billing = await Billing.findOne({ bookingId: bookingId });
    if (!billing) {
      return res.status(404).json({ success: false, message: 'Billing record not found for this booking' });
    }

    // Only cancel if status is 'completed' or 'pending'
    if (billing.transactionStatus === 'cancelled') {
      return res.json({ success: true, message: 'Billing already cancelled', data: billing });
    }

    if (billing.transactionStatus === 'refunded') {
      return res.json({ success: true, message: 'Billing already refunded', data: billing });
    }

    // Update billing status to cancelled
    billing.transactionStatus = 'cancelled';
    
    // Set refund details if not already set
    if (!billing.refundDetails || !billing.refundDetails.refundAmount) {
      billing.refundDetails = {
        refundAmount: billing.totalAmountPaid,
        refundDate: new Date(),
        reason: reason || 'Booking cancelled',
        status: 'pending'
      };
    }

    await billing.save();

    // Publish booking.cancelled event to Kafka
    try {
      const { publishBookingEvent, connectProducer } = require('../../../../../kafka/producers/bookingProducer');
      await connectProducer();
      await publishBookingEvent('booking.cancelled', {
        bookingId: billing.bookingId,
        billingId: billing.billingId,
        userId: billing.userId,
        type: billing.bookingType,
        itemId: billing.itemId || null,
        totalAmountPaid: billing.totalAmountPaid,
        paymentMethod: billing.paymentMethod,
        transactionStatus: billing.transactionStatus,
        dateOfTransaction: billing.dateOfTransaction,
        reason: reason || 'Booking cancelled',
        refundDetails: billing.refundDetails,
        data: {
          invoiceNumber: billing.invoiceDetails?.invoiceNumber,
          receiptNumber: billing.receiptDetails?.receiptNumber
        }
      });
    } catch (kafkaError) {
      console.error('❌ Error publishing booking.cancelled event to Kafka:', kafkaError);
      // Don't fail the cancellation if Kafka fails
    }

    res.json({ success: true, message: 'Billing cancelled successfully', data: billing });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error cancelling billing', error: error.message });
  }
};

exports.getRevenueStats = async (req, res) => {
  try {
    const { startDate, endDate, bookingType } = req.query;
    const match = { transactionStatus: 'completed' };

    if (startDate || endDate) {
      match.dateOfTransaction = {};
      if (startDate) match.dateOfTransaction.$gte = new Date(startDate);
      if (endDate) match.dateOfTransaction.$lte = new Date(endDate);
    }
    if (bookingType) match.bookingType = bookingType;

    const stats = await Billing.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmountPaid' },
          totalTransactions: { $sum: 1 },
          averageTransaction: { $avg: '$totalAmountPaid' }
        }
      }
    ]);

    res.json({ success: true, data: stats[0] || { totalRevenue: 0, totalTransactions: 0, averageTransaction: 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching revenue stats', error: error.message });
  }
};

