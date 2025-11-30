import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FaPlane, FaHotel, FaCar, FaCalendarAlt, FaEye, FaTimes, FaStar } from 'react-icons/fa';
import { motion } from 'framer-motion';
import BookingCard from '../components/BookingCard';
import ReviewModal from '../components/ReviewModal';
import { userAPI, flightAPI, hotelAPI, carAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

const formatDateTime = (value, includeTime = true) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    // Already formatted string
    return value;
  }
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(includeTime && { hour: '2-digit', minute: '2-digit' })
  });
};

const formatDateOnly = (value) => formatDateTime(value, false);

const Bookings = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useSelector((state) => state.auth);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, upcoming, past, cancelled
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  const selectedBookingDetails = selectedBooking?.details || {};
  const flightDepartureDateTime =
    selectedBookingDetails?.departureDateTime ||
    selectedBookingDetails?.departureDate ||
    selectedBooking?.date ||
    selectedBooking?.bookingDate;
  const flightArrivalDateTime =
    selectedBookingDetails?.arrivalDateTime || selectedBookingDetails?.arrivalDate || selectedBooking?.arrivalTime;
  const returnDepartureDateTime =
    selectedBookingDetails?.returnDepartureDateTime || selectedBookingDetails?.returnDepartureDate;
  const returnArrivalDateTime =
    selectedBookingDetails?.returnArrivalDateTime || selectedBookingDetails?.returnArrivalDate;
  const hotelCheckInDate = selectedBookingDetails?.checkIn || selectedBooking?.checkIn;
  const hotelCheckOutDate = selectedBookingDetails?.checkOut || selectedBooking?.checkOut;
  const carPickupDateTime = selectedBookingDetails?.pickupDate || selectedBooking?.pickupDate;
  const carReturnDateTime = selectedBookingDetails?.returnDate || selectedBooking?.returnDate;

  useEffect(() => {
    if (user?._id || user?.id) {
      fetchBookings();
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const userId = user?._id || user?.id;
      if (!userId) {
        console.error('No user ID available');
        setLoading(false);
        return;
      }
      const response = await userAPI.getBookings(userId);
      if (response.data.success) {
        // Transform booking data to match component expectations
        const transformedBookings = (response.data.data || []).map((booking) => {
          const details = booking.details || {};
          const bookingDate = new Date(booking.bookingDate || Date.now());
          const status = booking.status || 'upcoming';
          
          // Determine if booking is upcoming, past, or cancelled.
          // Only override the stored status if we have a real travel date.
          let calculatedStatus = status;
          if (status !== 'cancelled') {
            let travelDateValue = null;
            if (booking.type === 'flight') {
              travelDateValue = details.departureDateTime || details.departureDate;
            } else if (booking.type === 'hotel') {
              travelDateValue = details.checkIn;
            } else if (booking.type === 'car') {
              travelDateValue = details.pickupDate;
            }

            if (travelDateValue) {
              const travelDate = new Date(travelDateValue);
              if (!isNaN(travelDate.getTime())) {
                calculatedStatus = travelDate < new Date() ? 'completed' : 'upcoming';
              }
            }
          }

          if (booking.type === 'flight') {
            const departureAirport =
              details.departureAirport ||
              (details.from ? { city: details.from } : null);
            const arrivalAirport =
              details.arrivalAirport ||
              (details.to ? { city: details.to } : null);

            return {
              ...booking,
              details: details, // Preserve original details for review submission
              _id: booking._id || booking.bookingId,
              id: booking._id || booking.bookingId,
              bookingId: booking.bookingId || booking._id,
              from:
                departureAirport?.city ||
                departureAirport?.code ||
                details.from ||
                'N/A',
              to:
                arrivalAirport?.city ||
                arrivalAirport?.code ||
                details.to ||
                'N/A',
              departureAirport,
              arrivalAirport,
              airline: details.airline || 'Airline',
              flightNumber: details.flightNumber || details.flightId || 'N/A',
              departureTime: details.departureDateTime 
                ? new Date(details.departureDateTime).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })
                : details.departureTime || 'N/A',
              arrivalTime: details.arrivalDateTime
                ? new Date(details.arrivalDateTime).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })
                : details.arrivalTime || 'N/A',
              date: details.departureDateTime || details.departureDate || bookingDate,
              // Use totalAmountPaid if available (includes upgrades, round trip, etc.), otherwise fallback to base price
              price: details.totalAmountPaid || details.ticketPrice || details.price || 0,
              status: calculatedStatus,
              bookingDate: bookingDate,
            };
          } else if (booking.type === 'hotel') {
            // Safely extract location string
            const getHotelLocationString = () => {
              if (details.city) return details.city;
              if (details.location) {
                if (typeof details.location === 'string') return details.location;
                if (typeof details.location === 'object') {
                  return details.location.city || details.location.name || '';
                }
              }
              return '';
            };
            
            const locationString = getHotelLocationString() || 'N/A';
            
            return {
              ...booking,
              details: details, // Preserve original details for review submission
              _id: booking._id || booking.bookingId,
              id: booking._id || booking.bookingId,
              bookingId: booking.bookingId || booking._id,
              name: details.hotelName || details.name || 'Hotel',
              location: locationString,
              city: locationString,
              starRating: details.starRating || details.stars || details.rating,
              address: details.address || 'N/A',
              checkIn: details.checkIn || bookingDate,
              checkOut: details.checkOut || 'N/A',
              // Preserve images from details for display
              images: details.images || details.image ? [details.image].filter(Boolean) : [],
              // Use totalAmountPaid if available (includes nights, etc.), otherwise fallback to base price
              price: details.totalAmountPaid || details.pricePerNight || details.price || 0,
              status: calculatedStatus,
              bookingDate: bookingDate,
            };
          } else if (booking.type === 'car') {
            // Safely extract location strings for cars
            const getCarLocationString = (locationValue) => {
              if (!locationValue) return '';
              if (typeof locationValue === 'string') return locationValue;
              if (typeof locationValue === 'object') {
                return locationValue.city || locationValue.address || '';
              }
              return '';
            };
            
            const pickupLocationString = getCarLocationString(details.pickupLocation) || 
                                        getCarLocationString(details.location) || 
                                        'N/A';
            const returnLocationString = getCarLocationString(details.returnLocation) || 
                                        pickupLocationString;
            
            return {
              ...booking,
              details: details, // Preserve original details for review submission
              _id: booking._id || booking.bookingId,
              id: booking._id || booking.bookingId,
              bookingId: booking.bookingId || booking._id,
              brand: details.brand || details.company || 'Car',
              model: details.model || 'N/A',
              pickupLocation: pickupLocationString,
              returnLocation: returnLocationString,
              pickupDate: details.pickupDate || bookingDate,
              returnDate: details.returnDate || 'N/A',
              // Preserve images from details for display
              images: details.images || details.image ? [details.image].filter(Boolean) : [],
              // Use totalAmountPaid if available (includes rental days, etc.), otherwise fallback to base price
              price: details.totalAmountPaid || details.dailyRentalPrice || details.pricePerDay || details.price || 0,
              status: calculatedStatus,
              bookingDate: bookingDate,
            };
          }
          return { 
            ...booking,
            details: details, // Preserve original details for review submission
            status: calculatedStatus, 
            bookingDate: bookingDate,
            bookingId: booking.bookingId || booking._id,
          };
        });
        setBookings(transformedBookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return booking.status === 'upcoming';
    if (filter === 'past') return booking.status === 'completed';
    if (filter === 'cancelled') return booking.status === 'cancelled';
    return true;
  });

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleCancel = async (booking) => {
    if (!window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }

    try {
      const userId = user?._id || user?.id;
      // Use bookingId from the booking object, or _id as fallback
      const bookingId = booking.bookingId || booking._id || booking.id;
      
      const response = await userAPI.cancelBooking(userId, { bookingId });
      
      if (response.data.success) {
        toast.success('Booking cancelled successfully');
        // Optimistically update local state so the UI reflects the cancellation immediately
        setBookings((prevBookings) =>
          prevBookings.map((b) =>
            (b.bookingId === bookingId || b.id === bookingId || b._id === bookingId)
              ? { ...b, status: 'cancelled' }
              : b
          )
        );
        // Also refetch from the server to stay in sync with backend state
        fetchBookings();
      } else {
        toast.error(response.data.message || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const handleWriteReview = (booking) => {
    setReviewBooking(booking);
    setShowReviewModal(true);
  };

  const handleSubmitReview = async ({ rating, comment }) => {
    if (!reviewBooking || !user) {
      toast.error('Unable to submit review. Please try again.');
      return;
    }

    try {
      setSubmittingReview(true);
      const userId = user._id || user.id;
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User';
      
      // Get the item ID from booking details - the item object is stored in details
      const details = reviewBooking.details || {};
      const itemId = details._id || details.id || 
                     (reviewBooking.type === 'flight' ? (details.flightId || details.id) : null) ||
                     (reviewBooking.type === 'hotel' ? (details.hotelId || details.id) : null) ||
                     (reviewBooking.type === 'car' ? (details.carId || details.id) : null);
      
      if (!itemId) {
        toast.error('Unable to find item ID. Please contact support.');
        setSubmittingReview(false);
        return;
      }
      
      // Generate review ID
      const reviewId = `REV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Prepare review data for user service
      const userReviewData = {
        reviewId: reviewId,
        type: reviewBooking.type,
        itemId: String(itemId),
        rating: rating,
        comment: comment || ''
      };

      // Prepare review data for service-specific API
      const serviceReviewData = {
        userId: String(userId),
        userName: userName,
        rating: rating,
        comment: comment || ''
      };

      // Submit to both services in parallel
      const [userReviewResponse, serviceReviewResponse] = await Promise.allSettled([
        // Submit to user service (stores in user's review history)
        userAPI.addReview(userId, userReviewData),
        // Submit to the specific service (updates item rating)
        reviewBooking.type === 'flight' 
          ? flightAPI.addReview(itemId, serviceReviewData)
          : reviewBooking.type === 'hotel'
          ? hotelAPI.addReview(itemId, serviceReviewData)
          : carAPI.addReview(itemId, serviceReviewData)
      ]);

      // Check if at least user review was successful
      if (userReviewResponse.status === 'fulfilled' && userReviewResponse.value?.data?.success) {
        toast.success('✅ Review submitted successfully! Thank you for your feedback.');
        setShowReviewModal(false);
        setReviewBooking(null);
      } else {
        // If user review failed, show error
        const errorMsg = userReviewResponse.reason?.response?.data?.message || 
                        userReviewResponse.reason?.message || 
                        'Failed to submit review';
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error.response?.data?.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };


  const filters = [
    { id: 'all', label: 'All Bookings' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'past', label: 'Past' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  // Early return if no user (should redirect to login)
  if (!user?._id && !user?.id) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Bookings</h1>
          <p className="text-gray-600">Manage and view all your travel bookings</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-6 py-3 rounded-lg transition-all duration-300 ${
                filter === f.id
                  ? 'bg-kayak-blue text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-kayak-blue-light'
              }`}
            >
              <span className="font-semibold">{f.label}</span>
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {filteredBookings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredBookings.map((booking, index) => (
              <motion.div
                key={booking.id || booking._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col h-full"
              >
                {/* Booking Card Component */}
                <div className="mb-4 flex-1 flex flex-col">
                  {booking && booking.type ? (
                    <BookingCard type={booking.type} data={booking} hideBookButton={true} />
                  ) : (
                    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <p className="text-gray-600 text-sm">Invalid booking data</p>
                    </div>
                  )}
                </div>
                
                {/* Status Badge and Action Buttons */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm flex-shrink-0">
                  {/* Status Badge */}
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        booking.status === 'upcoming'
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : booking.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {booking.status === 'upcoming' ? 'Upcoming' : 
                       booking.status === 'completed' ? 'Completed' :
                       booking.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}
                    </span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => handleViewDetails(booking)}
                      className="btn-primary text-sm px-3 py-2 flex-1 min-w-0 flex items-center justify-center space-x-1"
                    >
                      <FaEye className="flex-shrink-0" />
                      <span className="truncate">View Details</span>
                    </button>
                    {booking.status !== 'cancelled' && (
                      <button 
                        onClick={() => handleWriteReview(booking)}
                        className="btn-primary text-sm px-3 py-2 flex-1 min-w-0 flex items-center justify-center space-x-1 bg-yellow-500 hover:bg-yellow-600"
                      >
                        <FaStar className="flex-shrink-0" />
                        <span className="truncate">Write Review</span>
                      </button>
                    )}
                    {(booking.status === 'upcoming' || booking.status === 'confirmed') && (
                      <button 
                        onClick={() => handleCancel(booking)}
                        className="btn-primary text-sm px-3 py-2 flex-1 min-w-0 flex items-center justify-center space-x-1 bg-red-500 hover:bg-red-600"
                      >
                        <FaTimes className="flex-shrink-0" />
                        <span className="truncate">Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FaCalendarAlt className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? "You haven't made any bookings yet. Start planning your next trip!"
                : `No ${filter} bookings found.`}
            </p>
            <button onClick={() => navigate('/')} className="btn-primary">Start Booking</button>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FaTimes className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Booking Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Booking Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Booking ID</label>
                    <p className="text-gray-900 font-medium mt-1">{selectedBooking.bookingId || selectedBooking.id || selectedBooking._id}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</label>
                    <p className="text-gray-900 font-medium mt-1 capitalize">{selectedBooking.status || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Booking Date</label>
                    <p className="text-gray-900 font-medium mt-1">
                      {formatDateTime(selectedBooking.bookingDate)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Amount Paid</label>
                    <p className="text-gray-900 font-bold text-lg mt-1">
                      ${typeof selectedBooking.price === 'number' ? selectedBooking.price.toFixed(2) : selectedBooking.price || '0.00'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Flight Details */}
              {selectedBooking.type === 'flight' && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4 text-lg">Flight Information</h3>
                  <div className="space-y-4">
                    {/* Basic Flight Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Airline</label>
                        <p className="text-gray-900 mt-1">{selectedBookingDetails?.airline || selectedBooking.airline || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Flight Number</label>
                        <p className="text-gray-900 mt-1">{selectedBookingDetails?.flightNumber || selectedBookingDetails?.flightId || selectedBooking.flightNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Passengers</label>
                        <p className="text-gray-900 mt-1">{selectedBookingDetails?.passengers || 1} {selectedBookingDetails?.passengers === 1 ? 'Passenger' : 'Passengers'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Flight Class</label>
                        <p className="text-gray-900 mt-1">{selectedBookingDetails?.flightClass || 'Economy'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Trip Type</label>
                        <p className="text-gray-900 mt-1 capitalize">{selectedBookingDetails?.tripType === 'round-trip' ? 'Round Trip' : 'One Way'}</p>
                      </div>
                      {selectedBookingDetails?.basePrice && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Base Price</label>
                          <p className="text-gray-900 mt-1">${Number(selectedBookingDetails.basePrice).toFixed(2)}</p>
                        </div>
                      )}
                    </div>

                    {/* Departure Information */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Departure</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">From</label>
                        <p className="text-gray-900 font-medium mt-1">
                          {selectedBookingDetails?.departureAirport?.code ||
                            selectedBookingDetails?.departureAirport?.city ||
                            selectedBooking.from ||
                            'N/A'}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {selectedBookingDetails?.departureAirport?.name ||
                            selectedBookingDetails?.departureAirport?.city ||
                            'N/A'}
                        </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">To</label>
                          <p className="text-gray-900 font-medium mt-1">
                          {selectedBookingDetails?.arrivalAirport?.code ||
                            selectedBookingDetails?.arrivalAirport?.city ||
                            selectedBooking.to ||
                            'N/A'}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                          {selectedBookingDetails?.arrivalAirport?.name ||
                            selectedBookingDetails?.arrivalAirport?.city ||
                            'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Departure Date & Time</label>
                        <p className="text-gray-900 mt-1">{formatDateTime(selectedBookingDetails?.departureDateTime || selectedBookingDetails?.departureDate || selectedBooking.date || selectedBooking.bookingDate)}</p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Arrival Date & Time</label>
                        <p className="text-gray-900 mt-1">{formatDateTime(selectedBookingDetails?.arrivalDateTime || selectedBookingDetails?.arrivalDate || selectedBooking.arrivalTime)}</p>
                        </div>
                        {selectedBookingDetails?.duration && (
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Duration</label>
                            <p className="text-gray-900 mt-1">
                              {selectedBookingDetails.duration.hours || 0}h {selectedBookingDetails.duration.minutes || 0}m
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Return Flight Information (if round trip) */}
                    {selectedBookingDetails?.tripType === 'round-trip' && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Return Flight</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">From</label>
                            <p className="text-gray-900 font-medium mt-1">
                              {selectedBookingDetails?.arrivalAirport?.code ||
                                selectedBookingDetails?.arrivalAirport?.city ||
                                selectedBooking.to ||
                                'N/A'}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">To</label>
                            <p className="text-gray-900 font-medium mt-1">
                              {selectedBookingDetails?.departureAirport?.code ||
                                selectedBookingDetails?.departureAirport?.city ||
                                selectedBooking.from ||
                                'N/A'}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Return Departure</label>
                            <p className="text-gray-900 mt-1">{formatDateTime(selectedBookingDetails?.returnDepartureDateTime || selectedBookingDetails?.returnDepartureDate)}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Return Arrival</label>
                            <p className="text-gray-900 mt-1">{formatDateTime(selectedBookingDetails?.returnArrivalDateTime || selectedBookingDetails?.returnArrivalDate)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hotel Details */}
              {selectedBooking.type === 'hotel' && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4 text-lg">Hotel Information</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Hotel Name</label>
                        <p className="text-gray-900 font-medium mt-1">{selectedBookingDetails?.hotelName || selectedBookingDetails?.name || selectedBooking.name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Star Rating</label>
                        <p className="text-gray-900 mt-1">{selectedBookingDetails?.starRating || selectedBookingDetails?.stars || 'N/A'} stars</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">City</label>
                        <p className="text-gray-900 mt-1">
                          {(() => {
                            const city = selectedBookingDetails?.city;
                            const location = selectedBooking.location;
                            if (city) return city;
                            if (location) {
                              if (typeof location === 'string') return location;
                              if (typeof location === 'object') return location.city || location.name || 'N/A';
                            }
                            return 'N/A';
                          })()}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">State</label>
                        <p className="text-gray-900 mt-1">{selectedBookingDetails?.state || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Address</label>
                        <p className="text-gray-900 mt-1">{selectedBookingDetails?.address || selectedBooking.address || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Guests</label>
                        <p className="text-gray-900 mt-1">{selectedBookingDetails?.guests || selectedBookingDetails?.passengers || 1} {selectedBookingDetails?.guests === 1 ? 'Guest' : 'Guests'}</p>
                      </div>
                      {selectedBookingDetails?.basePrice && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Price Per Night</label>
                          <p className="text-gray-900 mt-1">${Number(selectedBookingDetails.basePrice).toFixed(2)}</p>
                        </div>
                      )}
                    </div>

                    {/* Check-in/Check-out */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Stay Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Check-in Date</label>
                          <p className="text-gray-900 font-medium mt-1">{formatDateOnly(hotelCheckInDate)}</p>
                          {selectedBookingDetails?.checkInTime && (
                            <p className="text-xs text-gray-600 mt-1">Time: {selectedBookingDetails.checkInTime}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Check-out Date</label>
                          <p className="text-gray-900 font-medium mt-1">{formatDateOnly(hotelCheckOutDate)}</p>
                          {selectedBookingDetails?.checkOutTime && (
                            <p className="text-xs text-gray-600 mt-1">Time: {selectedBookingDetails.checkOutTime}</p>
                          )}
                        </div>
                        {(hotelCheckInDate && hotelCheckOutDate) && (
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Number of Nights</label>
                            <p className="text-gray-900 mt-1">
                              {(() => {
                                const nights = Math.ceil((new Date(hotelCheckOutDate) - new Date(hotelCheckInDate)) / (1000 * 60 * 60 * 24));
                                return `${nights} ${nights === 1 ? 'Night' : 'Nights'}`;
                              })()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amenities */}
                    {selectedBookingDetails?.amenities && selectedBookingDetails.amenities.length > 0 && (
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Amenities</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedBookingDetails.amenities.map((amenity, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Car Details */}
              {selectedBooking.type === 'car' && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4 text-lg">Car Rental Information</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Company/Brand</label>
                        <p className="text-gray-900 font-medium mt-1">{selectedBookingDetails?.company || selectedBookingDetails?.brand || selectedBooking.brand || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Model</label>
                        <p className="text-gray-900 mt-1">{selectedBookingDetails?.model || selectedBooking.model || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Car Type</label>
                        <p className="text-gray-900 mt-1">{selectedBookingDetails?.carType || selectedBookingDetails?.type || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Year</label>
                        <p className="text-gray-900 mt-1">{selectedBookingDetails?.year || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Transmission</label>
                        <p className="text-gray-900 mt-1">{selectedBookingDetails?.transmissionType || selectedBookingDetails?.transmission || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Fuel Type</label>
                        <p className="text-gray-900 mt-1">{selectedBookingDetails?.fuelType || selectedBookingDetails?.fuel || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Number of Seats</label>
                        <p className="text-gray-900 mt-1">{selectedBookingDetails?.numberOfSeats || selectedBookingDetails?.seats || selectedBookingDetails?.capacity || 'N/A'}</p>
                      </div>
                      {selectedBookingDetails?.basePrice && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Daily Rate</label>
                          <p className="text-gray-900 mt-1">${Number(selectedBookingDetails.basePrice).toFixed(2)}</p>
                        </div>
                      )}
                    </div>

                    {/* Rental Period */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Rental Period</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pickup Location</label>
                          <p className="text-gray-900 font-medium mt-1">
                            {(() => {
                              const pickup = selectedBookingDetails?.pickupLocation || selectedBooking.pickupLocation;
                              if (!pickup) return 'N/A';
                              if (typeof pickup === 'string') return pickup;
                              if (typeof pickup === 'object') return pickup.city || pickup.address || 'N/A';
                              return 'N/A';
                            })()}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Return Location</label>
                          <p className="text-gray-900 font-medium mt-1">
                            {(() => {
                              const returnLoc = selectedBookingDetails?.returnLocation || 
                                               selectedBookingDetails?.pickupLocation || 
                                               selectedBooking.pickupLocation;
                              if (!returnLoc) return 'N/A';
                              if (typeof returnLoc === 'string') return returnLoc;
                              if (typeof returnLoc === 'object') return returnLoc.city || returnLoc.address || 'N/A';
                              return 'N/A';
                            })()}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pickup Date & Time</label>
                          <p className="text-gray-900 mt-1">{formatDateTime(carPickupDateTime)}</p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Return Date & Time</label>
                          <p className="text-gray-900 mt-1">{formatDateTime(carReturnDateTime)}</p>
                        </div>
                        {(carPickupDateTime && carReturnDateTime) && (
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Rental Days</label>
                            <p className="text-gray-900 mt-1">
                              {(() => {
                                const days = Math.ceil((new Date(carReturnDateTime) - new Date(carPickupDateTime)) / (1000 * 60 * 60 * 24));
                                return `${days} ${days === 1 ? 'Day' : 'Days'}`;
                              })()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setReviewBooking(null);
        }}
        booking={reviewBooking}
        onSubmit={handleSubmitReview}
        loading={submittingReview}
      />
    </div>
  );
};

export default Bookings;
