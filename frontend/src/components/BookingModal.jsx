import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaPlane, FaHotel, FaCar, FaCalendarAlt, FaUsers, FaCreditCard } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { createBooking } from '../store/slices/bookingSlice';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from './LoadingSpinner';
import SeatSelection from './SeatSelection';
import RoomSelection from './RoomSelection';
import { hotelAPI, flightAPI, carAPI, userAPI } from '../services/api';
import { generateBillingId, generateBookingId } from '../utils/idGenerator';

const BookingModal = ({ isOpen, onClose, item, type }) => {
  const dispatch = useDispatch();
  const toast = useToast();
  const { user } = useSelector((state) => state.auth);
  const { loading } = useSelector((state) => state.bookings);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [passengers, setPassengers] = useState(1);
  const [flightClass, setFlightClass] = useState('Economy');
  // Determine default trip type based on whether flight has return data (with null safety)
  const hasReturnData = type === 'flight' && item && (
    (item.isRoundTrip && item.outbound && item.return) ||
    ((item.hasReturnFlight || item.returnDepartureDateTime) && item.returnDepartureDateTime)
  );
  const [tripType, setTripType] = useState(hasReturnData ? 'round-trip' : 'one-way');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [selectedOutboundSeats, setSelectedOutboundSeats] = useState([]);
  const [selectedReturnSeats, setSelectedReturnSeats] = useState([]);
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState({}); // { 'SINGLE': 1, 'DOUBLE': 2, etc. }
  const [useSavedCard, setUseSavedCard] = useState(false);
  const [savedCardDetails, setSavedCardDetails] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const modalContainerRef = useRef(null);
  
  // Update trip type when item changes
  useEffect(() => {
    if (type === 'flight' && item) {
      const hasReturn = (
        (item.isRoundTrip && item.outbound && item.return) ||
        ((item.hasReturnFlight || item.returnDepartureDateTime) && item.returnDepartureDateTime)
      );
      // If user selected round-trip but flight has no return data, switch to one-way
      if (!hasReturn && tripType === 'round-trip') {
        setTripType('one-way');
      }
    }
  }, [item, type, tripType]);

  // Fetch user data to get saved card details when modal opens
  useEffect(() => {
    const fetchUserData = async () => {
      if (isOpen && user?._id || user?.id) {
        try {
          setLoadingUserData(true);
          const userId = user._id || user.id;
          const response = await userAPI.getUser(userId);
          if (response.data.success && response.data.data) {
            const userData = response.data.data;
            if (userData.creditCard && userData.creditCard.cardNumber) {
              setSavedCardDetails(userData.creditCard);
            } else {
              setSavedCardDetails(null);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setSavedCardDetails(null);
        } finally {
          setLoadingUserData(false);
        }
      }
    };

    if (isOpen) {
      fetchUserData();
    } else {
      // Reset when modal closes
      setUseSavedCard(false);
      setSavedCardDetails(null);
      setCardNumber('');
      setExpiryDate('');
      setCvv('');
      setCardholderName('');
    }
  }, [isOpen, user]);

  // Populate card fields when "use saved card" is checked
  useEffect(() => {
    if (useSavedCard && savedCardDetails) {
      // Check if card number is masked (contains asterisks)
      const cardNum = savedCardDetails.cardNumber || '';
      const isMasked = cardNum.includes('*') || cardNum.includes('****');
      
      if (!isMasked) {
        // Card number is not masked, use it
        let formattedCardNumber = cardNum.replace(/\D/g, '');
        if (formattedCardNumber.length > 16) formattedCardNumber = formattedCardNumber.slice(0, 16);
        formattedCardNumber = formattedCardNumber.replace(/(.{4})/g, '$1 ').trim();
        setCardNumber(formattedCardNumber);
      } else {
        // Card number is masked, don't populate it - user needs to enter full number
        setCardNumber('');
      }
      
      // Always populate other fields if available
      setCardholderName(savedCardDetails.cardHolderName || '');
      setExpiryDate(savedCardDetails.expiryDate || '');
      // Note: CVV is not stored in user profile for security, so user will need to enter it
      setCvv('');
    }
    // Note: We don't clear fields when unchecked here to avoid clearing user's manual input
    // Fields will only be cleared when modal closes or user explicitly wants to start fresh
  }, [useSavedCard, savedCardDetails]);

  const icons = {
    flight: FaPlane,
    hotel: FaHotel,
    car: FaCar,
  };

  const Icon = icons[type] || FaPlane;

  const getHotelNights = () => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end - start;
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const getCarRentalDays = () => {
    if (!pickupDate || !returnDate) return 0;
    const start = new Date(pickupDate);
    const end = new Date(returnDate);
    const diffMs = end - start;
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const getItemPrice = () => {
    if (type === 'flight') {
      // Get base outbound price
      let outboundPrice = 0;
      let returnPrice = 0;
      
      // Handle round-trip flights (combined from two separate flights)
      if (item.isRoundTrip && item.outbound && item.return) {
        outboundPrice = item.outbound.ticketPrice || 0;
        returnPrice = item.return.ticketPrice || 0;
      }
      // Handle flight with embedded return flight information
      else if ((item.hasReturnFlight || item.returnDepartureDateTime) && item.returnDepartureDateTime) {
        outboundPrice = item.ticketPrice || 0;
        returnPrice = item.returnTicketPrice || 0;
      }
      // Single flight (one-way)
      else {
        outboundPrice = item.ticketPrice || item.price || 0;
        returnPrice = 0;
      }
      
      // Return price based on trip type selection
      if (tripType === 'one-way') {
        return outboundPrice;
      } else {
        // Round trip: outbound + return
        return outboundPrice + returnPrice;
      }
    } else if (type === 'hotel') {
      return item.pricePerNight || item.price || 0;
    } else if (type === 'car') {
      return item.dailyRentalPrice || item.pricePerDay || item.price || 0;
    }
    return item.price || 0;
  };

  const getClassUpgradePrice = () => {
    if (type !== 'flight') return 0;
    const classPrices = {
      'Economy': 0,
      'Premium Economy': 250,
      'Business': 500,
      'First Class': 750
    };
    return classPrices[flightClass] || 0;
  };

  const calculateTotal = () => {
    const basePrice = getItemPrice();
    const classUpgrade = getClassUpgradePrice();
    if (type === 'flight') {
      return (basePrice + classUpgrade) * passengers;
    } else if (type === 'hotel') {
      // Calculate based on selected rooms
      const nights = getHotelNights();
      if (nights === 0) return 0;
      
      // If rooms are selected, calculate from room types
      if (item.roomTypes && item.roomTypes.length > 0 && Object.keys(selectedRooms).length > 0) {
        let total = 0;
        item.roomTypes.forEach(roomType => {
          const count = selectedRooms[roomType.type] || 0;
          if (count > 0) {
            total += roomType.pricePerNight * count * nights;
          }
        });
        return total;
      }
      
      // Fallback to base price if no rooms selected
      return basePrice * nights;
    } else if (type === 'car') {
      const days = getCarRentalDays();
      if (days === 0) return basePrice;
      return basePrice * days;
    }
    return basePrice;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user?._id && !user?.id) {
      toast.error('Please log in to make a booking');
      onClose();
      return;
    }

    // Validate dates
    if (type === 'hotel' && (!checkIn || !checkOut)) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    // Validate max guests for hotels (check room type if selected, otherwise use hotel maxGuests)
    if (type === 'hotel') {
      // If room types exist, validate against selected room type
      // Otherwise, use hotel's maxGuests (but allow up to reasonable limit like 10)
      const maxAllowed = item.roomTypes && item.roomTypes.length > 0 
        ? Math.max(...item.roomTypes.map(rt => rt.maxGuests || 2))
        : (item.maxGuests || 10);
      
      if (passengers > maxAllowed) {
        toast.error(`Maximum ${maxAllowed} guest${maxAllowed !== 1 ? 's' : ''} allowed for this hotel`);
        return;
      }
    }
    if (type === 'car' && (!pickupDate || !returnDate)) {
      toast.error('Please select pickup and return dates');
      return;
    }

    // Validate payment details for card payments
    if (paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card') {
      if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
        toast.error('Please enter a valid 16-digit card number');
        return;
      }
      if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
        toast.error('Please enter a valid expiry date (MM/YY)');
        return;
      }
      
      // Validate expiry date is not in the past
      const [month, year] = expiryDate.split('/');
      const expiryMonth = parseInt(month, 10);
      const expiryYear = 2000 + parseInt(year, 10); // Convert YY to YYYY
      const expiry = new Date(expiryYear, expiryMonth - 1); // Month is 0-indexed
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const currentDate = new Date(currentYear, currentMonth);
      
      if (expiry < currentDate) {
        toast.error('Card expiry date cannot be in the past');
        return;
      }
      
      if (!cvv || (cvv.length !== 3 && cvv.length !== 4)) {
        toast.error('Please enter a valid CVV (3-4 digits)');
        return;
      }
      if (!cardholderName || cardholderName.trim().length < 2) {
        toast.error('Please enter the cardholder name');
        return;
      }
    }

    const userId = String(user._id || user.id || user.userId);
    if (!userId || userId === 'undefined' || userId === 'null') {
      toast.error('User ID not found. Please log in again.');
      return;
    }
    const totalAmount = calculateTotal();

    // Generate IDs
    const billingId = generateBillingId();
    const bookingId = generateBookingId();

    // Prepare booking data
    const bookingData = {
      bookingId: bookingId,
      type: type,
      bookingDate: new Date().toISOString(),
      status: 'upcoming',
      details: {
        ...item,
        passengers: type === 'flight' ? passengers : undefined,
        flightClass: type === 'flight' ? flightClass : undefined,
        tripType: type === 'flight' ? tripType : undefined,
        guests: type === 'hotel' ? (() => {
          // Calculate total guests from selected rooms
          if (item.roomTypes && Object.keys(selectedRooms).length > 0) {
            let totalGuests = 0;
            item.roomTypes.forEach(rt => {
              const count = selectedRooms[rt.type] || 0;
              totalGuests += rt.maxGuests * count;
            });
            return totalGuests;
          }
          return passengers;
        })() : undefined,
        selectedRooms: type === 'hotel' ? selectedRooms : undefined,
        checkIn: type === 'hotel' ? checkIn : undefined,
        checkOut: type === 'hotel' ? checkOut : undefined,
        pickupDate: type === 'car' ? pickupDate : undefined,
        returnDate: type === 'car' ? returnDate : undefined,
        // Store the actual total amount paid (includes upgrades, round trip, etc.)
        totalAmountPaid: Number(totalAmount.toFixed(2)),
        // Also store base price for reference
        basePrice: getItemPrice(),
      },
    };

    // Validate total amount
    if (!totalAmount || isNaN(totalAmount) || totalAmount <= 0) {
      toast.error('Invalid total amount. Please try again.');
      return;
    }

    // Prepare billing data
    const billingData = {
      billingId: billingId,
      userId: String(userId), // Ensure it's a string
      bookingType: type,
      // Store the booked item ID so downstream services (Kafka consumers)
      // can easily look up the specific flight/hotel/car document
      itemId: String(item._id || item.id || item.flightId || item.hotelId || item.carId || ''),
      bookingId: bookingId,
      totalAmountPaid: Number(totalAmount.toFixed(2)), // Ensure it's a number with 2 decimals
      paymentMethod: paymentMethod,
      transactionStatus: 'completed',
      // Send full booking details along so the User Service can reconstruct
      // a rich bookingHistory entry from the Kafka event.
      bookingDetails: bookingData.details,
      paymentDetails: (paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card') ? {
        cardLast4: cardNumber.replace(/\s/g, '').slice(-4),
        cardType: cardNumber.replace(/\s/g, '').startsWith('4') ? 'Visa' : 
                  cardNumber.replace(/\s/g, '').startsWith('5') ? 'Mastercard' :
                  cardNumber.replace(/\s/g, '').startsWith('3') ? 'Amex' : 'Other',
        expiryDate: expiryDate,
        cardholderName: cardholderName,
      } : undefined,
      invoiceDetails: {
        items: (() => {
          if (type === 'hotel' && item.roomTypes && Object.keys(selectedRooms).length > 0) {
            const nights = getHotelNights();
            const items = [];
            item.roomTypes.forEach(roomType => {
              const count = selectedRooms[roomType.type] || 0;
              if (count > 0) {
                items.push({
                  description: `${roomType.type} Room - ${item.hotelName || item.name || 'Hotel'}`,
                  quantity: count,
                  nights: nights,
                  price: roomType.pricePerNight,
                  total: roomType.pricePerNight * count * nights,
                });
              }
            });
            return items;
          }
          return [
            {
              description: type === 'flight' 
                ? `${item.airline || 'Flight'} - ${item.departureAirport?.city || ''} to ${item.arrivalAirport?.city || ''}`
                : type === 'hotel'
                ? `${item.name || item.hotelName || 'Hotel'} - ${item.city || ''}`
                : `${item.brand || ''} ${item.model || ''} - ${item.pickupLocation || ''}`,
              quantity: type === 'hotel' 
                ? getHotelNights() || 1
                : type === 'car'
                ? getCarRentalDays() || 1
                : passengers,
              price: getItemPrice(),
              total: totalAmount,
            },
          ];
        })(),
        subtotal: totalAmount,
        tax: 0, // Tax included in price
        discount: 0,
        total: totalAmount,
      },
    };

    // Track seat reservation state for cleanup on error
    let seatsReserved = false;
    let tempBookingId = null;

    try {
      // Update availability before creating booking
      if (type === 'hotel') {
        try {
          // Calculate total rooms to book
          const totalRoomsToBook = Object.values(selectedRooms).reduce((sum, count) => sum + count, 0);
          if (totalRoomsToBook > 0) {
            // Send roomTypes breakdown to backend for per-room-type availability update
            await hotelAPI.updateRooms(item._id || item.id, { 
              rooms: totalRoomsToBook,
              roomTypes: selectedRooms 
            });
          } else {
            // Fallback: book 1 room if no room selection
            await hotelAPI.updateRooms(item._id || item.id, { rooms: 1 });
          }
        } catch (roomError) {
          console.error('Error updating hotel rooms:', roomError);
          const errorMsg = roomError.response?.data?.message || 'Failed to update room availability';
          toast.error(errorMsg);
          return;
        }
      } else if (type === 'flight') {
        try {
          // Validate seat selection
          if (selectedOutboundSeats.length !== passengers) {
            toast.error(`Please select exactly ${passengers} seat${passengers > 1 ? 's' : ''} for outbound flight`);
            return;
          }

          if (tripType === 'round-trip' && selectedReturnSeats.length !== passengers) {
            toast.error(`Please select exactly ${passengers} seat${passengers > 1 ? 's' : ''} for return flight`);
            return;
          }

          // Reserve outbound seats
          tempBookingId = `TEMP-${Date.now()}`;
          await flightAPI.reserveSeats(item._id || item.id, {
            seatNumbers: selectedOutboundSeats,
            bookingId: tempBookingId,
            userId: userId,
            returnFlight: false
          });
          seatsReserved = true;

          // Reserve return seats if round trip
          if (tripType === 'round-trip' && selectedReturnSeats.length > 0) {
            // For round trip, return flight data is in the same document
            await flightAPI.reserveSeats(item._id || item.id, {
              seatNumbers: selectedReturnSeats,
              bookingId: tempBookingId,
              userId: userId,
              returnFlight: true
            });
          }
        } catch (seatError) {
          console.error('Error reserving seats:', seatError);
          const errorMsg = seatError.response?.data?.message || 'Failed to reserve seats';
          toast.error(errorMsg);
          return; // Stop booking if seat reservation fails
        }
      } else if (type === 'car') {
        try {
          // For cars, add booking dates to block the car for those dates
          if (pickupDate && returnDate) {
            const billingId = billingData.billingId || `BILL-${Date.now()}`;
            await carAPI.addBooking(item._id || item.id, {
              pickupDate: pickupDate,
              returnDate: returnDate,
              bookingId: billingId,
              userId: userId
            });
          }
        } catch (carError) {
          console.error('Error adding car booking:', carError);
          // If car is already booked, show error and stop booking
          if (carError.response?.status === 400) {
            toast.error(carError.response?.data?.message || 'Car is not available for the selected dates');
            return;
          }
          // Continue with booking for other errors
        }
      }

      const result = await dispatch(createBooking({ userId, bookingData, billingData })).unwrap();
      
      // Confirm seat bookings after successful booking
      if (type === 'flight') {
        const confirmedBookingId = result?.booking?.bookingId || bookingData.bookingId;
        if (confirmedBookingId) {
          try {
            // Confirm outbound seats
            await flightAPI.confirmSeats(item._id || item.id, {
              seatNumbers: selectedOutboundSeats,
              bookingId: confirmedBookingId,
              returnFlight: false
            });

            // Confirm return seats if round trip
            if (tripType === 'round-trip' && selectedReturnSeats.length > 0) {
              // For round trip, return flight data is in the same document
              await flightAPI.confirmSeats(item._id || item.id, {
                seatNumbers: selectedReturnSeats,
                bookingId: confirmedBookingId,
                returnFlight: true
              });
            }
          } catch (confirmError) {
            console.error('Error confirming seats:', confirmError);
            // Don't fail the booking if seat confirmation fails, but log it
          }
        } else {
          console.warn('Booking ID missing, unable to confirm seats');
        }
      }
      
      // Show success message immediately
      toast.success('✅ Booking confirmed successfully!');
      
      // Close modal after a delay to let user see the success message
      setTimeout(() => {
        onClose();
        
        // Trigger a page refresh to update search results after modal closes
        // This will cause SearchResults to refetch data
        if (window.location.pathname.includes('/search')) {
          setTimeout(() => {
            window.location.reload();
          }, 300); // Small delay to ensure modal closes first
        }
      }, 2000); // 2 second delay to ensure user sees the success message
    } catch (error) {
      console.error('Booking error:', error);
      
      // Release reserved seats if booking failed
      if (type === 'flight' && seatsReserved && tempBookingId) {
        try {
          // Release outbound seats
          await flightAPI.releaseSeats(item._id || item.id, {
            seatNumbers: selectedOutboundSeats,
            bookingId: tempBookingId,
            userId: userId,
            returnFlight: false
          });

          // Release return seats if round trip
          if (tripType === 'round-trip' && selectedReturnSeats.length > 0) {
            await flightAPI.releaseSeats(item._id || item.id, {
              seatNumbers: selectedReturnSeats,
              bookingId: tempBookingId,
              userId: userId,
              returnFlight: true
            });
          }
          console.log('Released reserved seats after booking failure');
        } catch (releaseError) {
          console.error('Error releasing seats after booking failure:', releaseError);
          // Log but don't show error to user - seats will expire or be cleaned up
        }
      }
      
      // Handle different error formats
      let errorMessage = 'Failed to create booking. Please try again.';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.payload) {
        errorMessage = error.payload;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      // Show detailed error if available
      if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorDetails = error.response.data.errors.map(e => `${e.field}: ${e.message}`).join(', ');
        errorMessage = `${errorMessage} (${errorDetails})`;
      }
      
      console.error('Full error object:', error);
      toast.error(`❌ ${errorMessage}`);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Scroll to top when modal opens
  useEffect(() => {
    if (isOpen) {
      // Scroll window to top first
      window.scrollTo({ top: 0, behavior: 'instant' });
      
      // Small delay to ensure DOM is ready, then scroll modal container
      const scrollToTop = () => {
        if (modalContainerRef.current) {
          modalContainerRef.current.scrollTop = 0;
          modalContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
        }
        // Also try to find by class as fallback
        const modalContainer = document.querySelector('.fixed.inset-0.z-50.overflow-y-auto');
        if (modalContainer) {
          modalContainer.scrollTop = 0;
          modalContainer.scrollTo({ top: 0, behavior: 'instant' });
        }
      };
      
      // Try immediately and after a short delay
      scrollToTop();
      setTimeout(scrollToTop, 50);
      setTimeout(scrollToTop, 200);
    }
  }, [isOpen]);

  // Check for missing item AFTER all hooks (React Rules of Hooks)
  if (!item && isOpen) {
    console.error('BookingModal: item is missing', { item, type, isOpen });
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black bg-opacity-50 z-[54]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[55] flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <h2 className="text-lg font-bold text-red-600 mb-2">Error</h2>
                <p className="text-gray-700 mb-4">Hotel data is missing. Please try again.</p>
                <button
                  onClick={onClose}
                  className="btn-primary w-full"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && item && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-[54]"
          />
          
          {/* Modal */}
          <motion.div
            ref={modalContainerRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[55] flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ scrollBehavior: 'auto' }}
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full my-auto flex flex-col max-h-[75vh] overflow-hidden relative z-[60]">
              {/* Header - Always visible at top */}
              <div className="bg-white border-b px-3 py-2 flex items-center justify-between flex-shrink-0 rounded-t-xl sticky top-0 z-[70]">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-kayak-blue to-blue-600 rounded-md flex items-center justify-center flex-shrink-0">
                    <Icon className="text-white text-xs" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Complete Your Booking</h2>
                    <p className="text-xs text-gray-500 truncate">
                      {type === 'flight' 
                        ? `${item?.departureAirport?.city || item?.origin || ''} → ${item?.arrivalAirport?.city || item?.destination || ''}`
                        : type === 'hotel'
                        ? `${item?.name || item?.hotelName || 'Hotel'} - ${item?.city || ''}`
                        : `${item?.brand || ''} ${item?.model || ''} - ${item?.pickupLocation || item?.city || ''}`
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FaTimes className="text-gray-500 text-sm" />
                </button>
              </div>

              {/* Form - Scrollable content */}
              <div className="overflow-y-auto flex-1">
                <form onSubmit={handleSubmit} className="p-3 space-y-2.5">
                {/* Passengers/Guests */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    <FaUsers className="inline mr-2" />
                    {type === 'flight' ? 'Passengers' : type === 'hotel' ? 'Guests' : 'Rental Period'}
                  </label>
                  {type === 'car' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Pickup Date</label>
                        <input
                          type="date"
                          min={today}
                          value={pickupDate}
                          onChange={(e) => setPickupDate(e.target.value)}
                          required
                          className="input-field w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Return Date</label>
                        <input
                          type="date"
                          min={pickupDate || today}
                          value={returnDate}
                          onChange={(e) => setReturnDate(e.target.value)}
                          required
                          className="input-field w-full"
                        />
                      </div>
                    </div>
                  ) : type === 'hotel' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Check-in</label>
                        <input
                          type="date"
                          min={today}
                          value={checkIn}
                          onChange={(e) => setCheckIn(e.target.value)}
                          required
                          className="input-field w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Check-out</label>
                        <input
                          type="date"
                          min={checkIn || tomorrow}
                          value={checkOut}
                          onChange={(e) => setCheckOut(e.target.value)}
                          required
                          className="input-field w-full"
                        />
                      </div>
                    </div>
                  ) : null}
                  
                  {type === 'flight' && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Passengers</label>
                        <input
                          type="number"
                          min="1"
                          max={9}
                          value={passengers}
                          onChange={(e) => setPassengers(parseInt(e.target.value) || 1)}
                          required
                          className="input-field w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Class</label>
                        <select
                          value={flightClass}
                          onChange={(e) => setFlightClass(e.target.value)}
                          required
                          className="input-field w-full"
                        >
                          <option value="Economy">Economy</option>
                          <option value="Premium Economy">Premium Economy</option>
                          <option value="Business">Business</option>
                          <option value="First Class">First Class</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Room Selection for Hotels */}
                {type === 'hotel' && item && item.roomTypes && Array.isArray(item.roomTypes) && item.roomTypes.length > 0 && (
                  <div className="mt-4">
                    <RoomSelection
                      hotel={item}
                      selectedRooms={selectedRooms}
                      onRoomsSelected={setSelectedRooms}
                      checkIn={checkIn}
                      checkOut={checkOut}
                    />
                  </div>
                )}
                {type === 'hotel' && item && (!item.roomTypes || !Array.isArray(item.roomTypes) || item.roomTypes.length === 0) && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">No room types available for this hotel</p>
                  </div>
                )}

                {/* Seat Selection for Flights */}
                {type === 'flight' && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setShowSeatSelection(!showSeatSelection)}
                      className="w-full px-4 py-2 bg-kayak-blue-light text-kayak-blue rounded-lg font-semibold hover:bg-kayak-blue hover:text-white transition-colors"
                    >
                      {showSeatSelection ? 'Hide' : 'Select'} Seats
                    </button>
                    {showSeatSelection && (
                      <div className="mt-4 space-y-4">
                        <SeatSelection
                          flightId={item._id || item.id}
                          returnFlightId={item.returnFlightId || item._id || item.id}
                          passengers={passengers}
                          onSeatsSelected={(seats) => setSelectedOutboundSeats(seats)}
                          returnFlight={false}
                        />
                        {tripType === 'round-trip' && (
                          <SeatSelection
                            flightId={item._id || item.id}
                            returnFlightId={item._id || item.id}
                            passengers={passengers}
                            onSeatsSelected={(seats) => setSelectedReturnSeats(seats)}
                            returnFlight={true}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Trip Type (for flights) and Payment Method */}
                {type === 'flight' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        <FaPlane className="inline mr-2" />
                        Trip Type
                      </label>
                      <select
                        value={tripType}
                        onChange={(e) => setTripType(e.target.value)}
                        required
                        className="input-field w-full"
                      >
                        <option value="round-trip" disabled={!hasReturnData}>
                          Round Trip{!hasReturnData ? ' (Not Available)' : ''}
                        </option>
                        <option value="one-way">One Way</option>
                      </select>
                      {!hasReturnData && tripType === 'round-trip' && (
                        <p className="text-xs text-orange-600 mt-1">⚠️ Round trip not available for this flight. Switching to one-way.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        <FaCreditCard className="inline mr-2" />
                        Payment Method
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        required
                        className="input-field w-full"
                      >
                        <option value="Credit Card">Credit Card</option>
                        <option value="Debit Card">Debit Card</option>
                        <option value="PayPal">PayPal</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      <FaCreditCard className="inline mr-2" />
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      required
                      className="input-field w-full"
                    >
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="PayPal">PayPal</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                )}

                {/* Payment Details - Only show for Credit/Debit Card */}
                {(paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card') && (
                  <div className="space-y-2.5 bg-gray-50 p-2.5 rounded-md border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-gray-700">Payment Information</h3>
                      {savedCardDetails && (
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useSavedCard}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setUseSavedCard(checked);
                              // If unchecking, clear fields so user can enter new details
                              if (!checked) {
                                setCardNumber('');
                                setExpiryDate('');
                                setCvv('');
                                setCardholderName('');
                              }
                            }}
                            className="w-4 h-4 text-kayak-blue border-gray-300 rounded focus:ring-kayak-blue focus:ring-2"
                          />
                          <span className="text-xs text-gray-600">Use saved card details</span>
                        </label>
                      )}
                    </div>
                    
                    {useSavedCard && savedCardDetails && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-2">
                        <p className="text-xs text-blue-700">
                          <strong>Using saved card:</strong> {(() => {
                            const cardNum = savedCardDetails.cardNumber || '';
                            // Check if already masked
                            if (cardNum.includes('*')) {
                              return cardNum;
                            }
                            // Otherwise, mask it for display
                            const digits = cardNum.replace(/\D/g, '');
                            const last4 = digits.length >= 4 ? digits.slice(-4) : 'N/A';
                            return `**** **** **** ${last4}`;
                          })()} - {savedCardDetails.cardHolderName || 'N/A'}
                        </p>
                        <p className="text-xs text-amber-700 mt-1 font-semibold">
                          {(() => {
                            const cardNum = savedCardDetails.cardNumber || '';
                            const isMasked = cardNum.includes('*') || cardNum.includes('****');
                            return isMasked 
                              ? '⚠️ For security, please enter your full 16-digit card number below.'
                              : 'Please enter your CVV to complete the payment.';
                          })()}
                        </p>
                      </div>
                    )}
                    
                    {/* Cardholder Name */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Cardholder Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={cardholderName}
                        onChange={(e) => {
                          setCardholderName(e.target.value.toUpperCase());
                          // Don't uncheck if card is masked (user needs to enter card number anyway)
                          const cardNum = savedCardDetails?.cardNumber || '';
                          const isMasked = cardNum.includes('*') || cardNum.includes('****');
                          if (useSavedCard && !isMasked) {
                            setUseSavedCard(false); // Only uncheck if card wasn't masked
                          }
                        }}
                        placeholder="JOHN DOE"
                        required
                        disabled={useSavedCard && savedCardDetails && !(() => {
                          const cardNum = savedCardDetails?.cardNumber || '';
                          return cardNum.includes('*') || cardNum.includes('****');
                        })()}
                        className={`input-field w-full ${useSavedCard && savedCardDetails && !(() => {
                          const cardNum = savedCardDetails?.cardNumber || '';
                          return cardNum.includes('*') || cardNum.includes('****');
                        })() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        maxLength={50}
                      />
                    </div>

                    {/* Card Number */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Card Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => {
                          // Remove all non-digits
                          let value = e.target.value.replace(/\D/g, '');
                          // Limit to 16 digits
                          if (value.length > 16) value = value.slice(0, 16);
                          // Add spaces every 4 digits
                          value = value.replace(/(.{4})/g, '$1 ').trim();
                          setCardNumber(value);
                          // Don't uncheck "use saved card" if user is entering card number for masked card
                          const cardNum = savedCardDetails?.cardNumber || '';
                          const isMasked = cardNum.includes('*') || cardNum.includes('****');
                          if (useSavedCard && !isMasked) {
                            setUseSavedCard(false); // Only uncheck if card wasn't masked
                          }
                        }}
                        placeholder="1234 5678 9012 3456"
                        required
                        className="input-field w-full"
                        maxLength={19} // 16 digits + 3 spaces
                      />
                      {useSavedCard && savedCardDetails && (() => {
                        const cardNum = savedCardDetails.cardNumber || '';
                        const isMasked = cardNum.includes('*') || cardNum.includes('****');
                        return isMasked ? (
                          <p className="text-xs text-amber-600 mt-1">
                            Enter your full 16-digit card number
                          </p>
                        ) : null;
                      })()}
                    </div>

                    {/* Expiry and CVV */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Expiry Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={expiryDate}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, '');
                            // Limit to 4 digits
                            if (value.length > 4) value = value.slice(0, 4);
                            // Add slash after 2 digits
                            if (value.length >= 2) {
                              value = value.slice(0, 2) + '/' + value.slice(2);
                            }
                            setExpiryDate(value);
                            // Don't uncheck if card is masked (user needs to enter card number anyway)
                            const cardNum = savedCardDetails?.cardNumber || '';
                            const isMasked = cardNum.includes('*') || cardNum.includes('****');
                            if (useSavedCard && !isMasked) {
                              setUseSavedCard(false); // Only uncheck if card wasn't masked
                            }
                          }}
                          placeholder="MM/YY"
                          required
                          disabled={useSavedCard && savedCardDetails && !(() => {
                            const cardNum = savedCardDetails?.cardNumber || '';
                            return cardNum.includes('*') || cardNum.includes('****');
                          })()}
                          className={`input-field w-full ${useSavedCard && savedCardDetails && !(() => {
                            const cardNum = savedCardDetails?.cardNumber || '';
                            return cardNum.includes('*') || cardNum.includes('****');
                          })() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          CVV <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={cvv}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, '');
                            // Limit to 4 digits (for Amex)
                            if (value.length > 4) value = value.slice(0, 4);
                            setCvv(value);
                          }}
                          placeholder="123"
                          required
                          className="input-field w-full"
                          maxLength={4}
                        />
                      </div>
                    </div>

                    {/* Security Note */}
                    <div className="flex items-start space-x-2 text-xs text-gray-500">
                      <FaCreditCard className="mt-0.5" />
                      <p>Your payment information is secure and encrypted. We never store your full card details.</p>
                    </div>
                  </div>
                )}

                {/* Price Summary */}
                <div className="bg-gray-50 rounded-md p-2.5 space-y-1.5">
                  {type === 'flight' && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">
                          {passengers} {passengers === 1 ? 'Passenger' : 'Passengers'} ({tripType === 'round-trip' ? 'Round Trip' : 'One Way'})
                        </span>
                        <span className="text-gray-900">${getItemPrice().toFixed(2)}</span>
                      </div>
                      {getClassUpgradePrice() > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Class Upgrade ({flightClass})</span>
                          <span className="text-gray-900">+${(getClassUpgradePrice() * passengers).toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                  {type === 'hotel' && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">
                        {checkIn && checkOut 
                          ? Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))
                          : 0} {checkIn && checkOut && Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)) === 1 ? 'Night' : 'Nights'}
                      </span>
                      <span className="text-gray-900">${getItemPrice().toFixed(2)}</span>
                    </div>
                  )}
                  {type === 'car' && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">
                        {pickupDate && returnDate 
                          ? Math.ceil((new Date(returnDate) - new Date(pickupDate)) / (1000 * 60 * 60 * 24))
                          : 0} {pickupDate && returnDate && Math.ceil((new Date(returnDate) - new Date(pickupDate)) / (1000 * 60 * 60 * 24)) === 1 ? 'Day' : 'Days'}
                      </span>
                      <span className="text-gray-900">${getItemPrice().toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-1.5 flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-kayak-blue">${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 btn-secondary text-sm py-2"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary text-sm py-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <LoadingSpinner size="sm" className="mr-2" />
                        Processing...
                      </span>
                    ) : (
                      'Confirm Booking'
                    )}
                  </button>
                </div>
              </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BookingModal;

