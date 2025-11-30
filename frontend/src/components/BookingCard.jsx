import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaPlane, FaHotel, FaCar, FaStar, FaClock, FaMapMarkerAlt, FaUsers, FaHeart, FaRegHeart, FaComment } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { userAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import BookingModal from './BookingModal';
import FlightReviewsModal from './FlightReviewsModal';
import HotelReviewsModal from './HotelReviewsModal';
import CarReviewsModal from './CarReviewsModal';
import { trackPropertyClick } from '../utils/clickTracker';

const CARD_BACKGROUND_IMAGES = {
  flight: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80', // Airplane in sky
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80', // Hotel room
  car: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80' // Car on road
};

const DEFAULT_BACKGROUND_IMAGES = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80'
];

const BookingCard = ({ type, data, onFavouriteChange, hideBookButton = false }) => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const toast = useToast();
  const [isFavourite, setIsFavourite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const icons = {
    flight: FaPlane,
    hotel: FaHotel,
    car: FaCar,
  };

  const Icon = icons[type] || FaPlane;

  const uniqueIdentifier = useMemo(() => {
    const fallback =
      data?._id ||
      data?.id ||
      data?.flightId ||
      data?.hotelId ||
      data?.carId ||
      data?.name ||
      data?.hotelName ||
      data?.city ||
      data?.company ||
      `${type}-default`;
    return String(fallback);
  }, [data, type]);

  const backgroundImage = useMemo(() => {
    // For hotels, check multiple possible image sources
    if (type === 'hotel') {
      // Check data.images array first
      if (data?.images && Array.isArray(data.images) && data.images.length > 0) {
        return data.images[0];
      }
      // Check details.images (for bookings)
      if (data?.details?.images && Array.isArray(data.details.images) && data.details.images.length > 0) {
        return data.details.images[0];
      }
      // Check if details has a single image field
      if (data?.details?.image) {
        return data.details.image;
      }
      if (data?.image) {
        return data.image;
      }
    }
    // For cars, check multiple possible image sources
    if (type === 'car') {
      // Check data.images array first
      if (data?.images && Array.isArray(data.images) && data.images.length > 0) {
        return data.images[0];
      }
      // Check details.images (for bookings)
      if (data?.details?.images && Array.isArray(data.details.images) && data.details.images.length > 0) {
        return data.details.images[0];
      }
      // Check if details has a single image field
      if (data?.details?.image) {
        return data.details.image;
      }
      if (data?.image) {
        return data.image;
      }
    }
    // Use single image per type as fallback
    if (CARD_BACKGROUND_IMAGES[type]) {
      return CARD_BACKGROUND_IMAGES[type];
    }
    // Fallback to default if type not found
    return DEFAULT_BACKGROUND_IMAGES[0] || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80';
  }, [type, data]);

  const formatCard = () => {
    switch (type) {
        case 'flight': {
          // Helper function to format date using UTC to avoid timezone conversion issues
          const formatDateUTC = (dateString) => {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            const year = date.getUTCFullYear();
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = monthNames[date.getUTCMonth()];
            const day = date.getUTCDate();
            return `${month} ${day}, ${year}`;
          };
          
        // Handle single flight (one-way only)
        const from = data.departureAirport?.city || data.departureAirport?.code || data.origin || data.from || 'N/A';
        const to = data.arrivalAirport?.city || data.arrivalAirport?.code || data.destination || data.to || 'N/A';
        const departureDate = data.departureDateTime 
          ? formatDateUTC(data.departureDateTime)
          : 'N/A';
        const departureTime = data.departureDateTime 
          ? new Date(data.departureDateTime).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          : data.departureTime || 'N/A';
        const arrivalDate = data.arrivalDateTime 
          ? formatDateUTC(data.arrivalDateTime)
          : 'N/A';
        const arrivalTime = data.arrivalDateTime 
          ? new Date(data.arrivalDateTime).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          : data.arrivalTime || 'N/A';
        
        // Calculate duration
        let durationText = '';
        if (data.duration) {
          const hours = data.duration.hours || 0;
          const minutes = data.duration.minutes || 0;
          if (hours > 0 && minutes > 0) {
            durationText = `${hours}h ${minutes}m`;
          } else if (hours > 0) {
            durationText = `${hours}h`;
          } else if (minutes > 0) {
            durationText = `${minutes}m`;
          }
        }
        
        const flightRating = data.flightRating?.average || data.rating?.average || data.averageRating || data.rating || null;
        const flightRatingCount = data.flightRating?.count || data.rating?.count || 0;
        
        // Build subtitle with airline and flight number (no rating in subtitle for Kayak style)
        const subtitle = `${data.airline || 'Airline'} • ${data.flightNumber || data.flightId || 'N/A'}`;
        
        return {
          title: `${from} → ${to}`,
          subtitle: subtitle,
          details: [
            { icon: FaClock, text: `${departureDate} • Depart: ${departureTime}` },
            { icon: FaClock, text: `${arrivalDate} • Arrive: ${arrivalTime}${durationText ? ` • ${durationText}` : ''}` },
          ],
          price: data.ticketPrice || data.fare || data.price || 0,
          rating: flightRating,
          ratingCount: flightRatingCount,
        };
        }
      case 'hotel': {
        const hotelRating = data.hotelRating?.average || data.rating?.average || data.averageRating || data.rating || null;
        const hotelRatingCount = data.hotelRating?.count || data.rating?.count || 0;
        const starRating = data.starRating || data.stars || null;
        
        // Safely extract location string (handle both string and object)
        const getLocationString = () => {
          if (typeof data.location === 'string') return data.location;
          if (data.location && typeof data.location === 'object') {
            return data.location.city || data.location.name || '';
          }
          return data.city || '';
        };
        
        const locationString = getLocationString() || 'Location';
        
        // Build subtitle with location and rating (always show)
        let subtitle = locationString;
        if (hotelRating !== null && hotelRating !== undefined && hotelRating > 0 && hotelRatingCount > 0) {
          // Show user review rating if available
          subtitle += ` • ⭐ ${hotelRating.toFixed(1)}`;
          subtitle += ` (${hotelRatingCount} ${hotelRatingCount === 1 ? 'review' : 'reviews'})`;
        } else if (starRating !== null && starRating !== undefined) {
          // Show admin-set star rating if no user reviews
          subtitle += ` • ⭐ ${starRating} ${starRating === 1 ? 'star' : 'stars'}`;
        } else {
          subtitle += ` • ⭐ No ratings yet`;
        }
        
        // Safely extract address string
        const getAddressString = () => {
          if (data.address) return data.address;
          if (data.location && typeof data.location === 'object') {
            return data.location.address || data.location.city || '';
          }
          if (typeof data.location === 'string') return data.location;
          return '';
        };
        
        return {
          title: data.hotelName || data.name || 'Hotel',
          subtitle: subtitle,
          details: [
            { icon: FaMapMarkerAlt, text: getAddressString() || 'Address not available' },
            { icon: FaClock, text: `Check-in: ${data.checkInTime || 'Flexible'}` },
            { icon: FaUsers, text: `${data.availableRooms || data.roomsAvailable || data.rooms || 'N/A'} rooms available` },
          ],
          price: data.pricePerNight || data.price || 0,
          rating: hotelRating,
          ratingCount: hotelRatingCount,
        };
        }
      case 'car': {
        // Infer fuel type if not directly available
        const getFuelType = () => {
          if (data.fuelType) return data.fuelType;
          if (data.fuel) return data.fuel;
          // Fallback: infer from car ID
          const identifier = data.carId || data._id || '0';
          const numeric = parseInt(String(identifier).replace(/\D/g, ''), 10) || 0;
          const fuelTypes = ['Gasoline', 'Electric', 'Hybrid', 'Diesel'];
          return fuelTypes[numeric % fuelTypes.length];
        };
        
        const carRating = data.carRating?.average || data.rating?.average || data.averageRating || data.rating || null;
        const carRatingCount = data.carRating?.count || data.rating?.count || 0;
        
        // Build subtitle with car type, transmission, and user review rating (always show)
        let subtitle = `${data.carType || data.type || 'Vehicle'} • ${data.transmissionType || data.transmission || 'Auto'}`;
        if (carRating !== null && carRating !== undefined && carRating > 0) {
          subtitle += ` • ⭐ ${carRating.toFixed(1)}`;
          if (carRatingCount > 0) {
            subtitle += ` (${carRatingCount} ${carRatingCount === 1 ? 'review' : 'reviews'})`;
          }
        } else {
          subtitle += ` • ⭐ No ratings yet`;
        }
        
        // Safely extract location string for cars (handle both string and object)
        const getCarLocationString = () => {
          if (data.pickupLocation) return data.pickupLocation;
          if (data.city) return data.city;
          if (data.location) {
            if (typeof data.location === 'string') return data.location;
            if (typeof data.location === 'object') {
              return data.location.city || data.location.address || '';
            }
          }
          return '';
        };
        
        return {
          title: `${data.company || data.brand || 'Car'} ${data.model || ''}${data.year ? ` (${data.year})` : ''}`,
          subtitle: subtitle,
          details: [
            { icon: FaUsers, text: `${data.numberOfSeats || data.seats || data.capacity || 'N/A'} seats` },
            { icon: FaCar, text: `Fuel: ${getFuelType()}` },
            { icon: FaMapMarkerAlt, text: getCarLocationString() || 'Location not available' },
          ],
          price: data.dailyRentalPrice || data.pricePerDay || data.price || 0,
          rating: carRating,
          ratingCount: carRatingCount,
        };
        }
      default:
        return { title: '', subtitle: '', details: [], price: 0, rating: null };
    }
  };

  const cardInfo = formatCard();
  const priceSuffixMap = {
    flight: '/person',
    hotel: '/night',
    car: '/day'
  };
  const priceSuffix = priceSuffixMap[type] || '';
  const priceDisplay =
    typeof cardInfo.price === 'number'
      ? `$${cardInfo.price.toFixed(2)}`
      : cardInfo.price;
  const cardDetails = Array.isArray(cardInfo.details) ? cardInfo.details : [];

  // Check if item is already in favourites
  useEffect(() => {
    const checkFavourite = async () => {
      if (!user?._id && !user?.id) return;
      
      try {
        const userId = user?._id || user?.id;
        const itemId = data._id || data.id;
        const itemType = type === 'flight' ? 'flight' : type === 'hotel' ? 'hotel' : 'car';
        
        if (!itemId) return;
        
        const response = await userAPI.getFavourites(userId, { type: itemType });
        if (response.data.success) {
          const exists = response.data.data.some(
            fav => fav.itemId === itemId && fav.type === itemType
          );
          setIsFavourite(exists);
        }
      } catch (error) {
        // Silently fail - user might not be logged in
      }
    };
    
    checkFavourite();
  }, [user, data, type]);

  const handleToggleFavourite = async (e) => {
    e.stopPropagation();
    
    if (!user?._id && !user?.id) {
      toast.error('Please log in to add favourites');
      return;
    }

    setIsLoading(true);
    try {
      const userId = user?._id || user?.id;
      const itemId = data._id || data.id;
      const itemType = type === 'flight' ? 'flight' : type === 'hotel' ? 'hotel' : 'car';
      
      if (!itemId) {
        toast.error('Invalid item');
        return;
      }

      if (isFavourite) {
        // Remove from favourites
        const response = await userAPI.removeFavourite(userId, {
          itemId,
          type: itemType
        });
        
        if (response.data.success) {
          setIsFavourite(false);
          toast.success('Removed from favourites');
          if (onFavouriteChange) onFavouriteChange();
        }
      } else {
        // Add to favourites
        const response = await userAPI.addFavourite(userId, {
          itemId,
          type: itemType,
          itemData: data
        });
        
        if (response.data.success) {
          setIsFavourite(true);
          toast.success('Added to favourites');
          if (onFavouriteChange) onFavouriteChange();
        }
      }
    } catch (error) {
      console.error('Error toggling favourite:', error);
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already')) {
        setIsFavourite(true);
        toast.info('Already in favourites');
      } else {
        toast.error(error.response?.data?.message || 'Failed to update favourites');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const typeLabelMap = {
    flight: 'Flight',
    hotel: 'Hotel',
    car: 'Car'
  };
  const typeLabel = typeLabelMap[type] || 'Travel';

  // For flights, use Kayak-style (no images), for hotels/cars keep images
  const showImage = type !== 'flight';

  const handleCardClick = (e) => {
    // Don't navigate if hideBookButton is true (used in bookings page)
    if (hideBookButton) {
      return;
    }
    // Don't navigate if clicking on buttons or interactive elements
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('[role="button"]')) {
      return;
    }
    if (type === 'hotel') {
      const hotelId = data._id || data.id || data.details?._id || data.details?.id;
      if (hotelId) {
        // Track property click
        trackPropertyClick(hotelId.toString(), 'hotel', { source: 'search_results' });
        navigate(`/hotels/${hotelId}`);
      }
    }
  };
  
  const handleBookButtonClick = () => {
    const propertyId = data._id || data.id || data.details?._id || data.details?.id;
    if (propertyId) {
      trackPropertyClick(propertyId.toString(), type, { source: 'book_button' });
    }
    setShowBookingModal(true);
  };
  
  const handleSelectRoomClick = () => {
    const hotelId = data._id || data.id || data.details?._id || data.details?.id;
    if (hotelId) {
      trackPropertyClick(hotelId.toString(), 'hotel', { source: 'select_room_button' });
      navigate(`/hotels/${hotelId}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={type === 'hotel' && !hideBookButton ? handleCardClick : undefined}
      className={`card p-6 h-full flex flex-col hover:shadow-2xl transition-all duration-300 overflow-hidden group ${
        type === 'flight' ? 'bg-white border border-gray-200' : ''
      } ${type === 'hotel' && !hideBookButton ? 'cursor-pointer' : ''}`}
    >
      {showImage ? (
        <div className="relative h-56 w-full rounded-2xl overflow-hidden mb-5">
          <img
            src={backgroundImage}
            alt={`${cardInfo.title} backdrop`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            onError={(e) => {
              // Fallback to default image if image fails to load
              e.target.src = CARD_BACKGROUND_IMAGES[type] || DEFAULT_BACKGROUND_IMAGES[0];
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute top-3 left-3 flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white">
              <Icon className="text-lg" />
            </div>
            <span className="text-white font-semibold text-sm uppercase tracking-wide">
              {typeLabel}
            </span>
          </div>
          {user && (
            <button
              onClick={handleToggleFavourite}
              disabled={isLoading}
              className={`absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white transition-all duration-200 ${
                isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              }`}
              title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
            >
              {isFavourite ? (
                <FaHeart className="text-red-500" />
              ) : (
                <FaRegHeart className="text-gray-500 hover:text-red-500" />
              )}
            </button>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm leading-tight whitespace-normal break-words">
                  {cardInfo.title}
                </h3>
                <p className="text-white/90 text-xs leading-tight mt-1 whitespace-normal break-words">
                  {cardInfo.subtitle}
                </p>
              </div>
              <div className="bg-white/95 backdrop-blur rounded-lg px-2.5 py-1.5 text-right flex-shrink-0 ml-2">
                <div className="text-kayak-blue font-bold text-sm leading-tight whitespace-nowrap">{priceDisplay}</div>
                {priceSuffix && <div className="text-gray-600 text-[10px] leading-tight whitespace-nowrap">{priceSuffix}</div>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Kayak-style flight card (no image)
        <div className="mb-4">
          <div className="flex items-start justify-between mb-3 gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FaPlane className="text-blue-600 text-sm" />
                </div>
                <span className="text-gray-500 text-xs font-semibold uppercase tracking-wide">FLIGHT</span>
                {user && (
                  <button
                    onClick={handleToggleFavourite}
                    disabled={isLoading}
                    className={`ml-auto p-1.5 rounded-full hover:bg-gray-100 transition-all duration-200 flex-shrink-0 ${
                      isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                  >
                    {isFavourite ? (
                      <FaHeart className="text-red-500 text-sm" />
                    ) : (
                      <FaRegHeart className="text-gray-400 hover:text-red-500 text-sm" />
                    )}
                  </button>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1 break-words">{cardInfo.title}</h3>
              <p className="text-gray-600 text-sm break-words">{cardInfo.subtitle}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 mb-4 flex-1 w-full">
        {cardDetails.length > 0 ? (
          cardDetails.map((detail, index) => {
            const DetailIcon = detail.icon || FaMapMarkerAlt;
            return (
              <div key={index} className="flex items-center space-x-2 text-gray-600 text-sm">
                <DetailIcon className="text-kayak-blue" />
                <span>{detail.text}</span>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-500">No additional details available.</p>
        )}
      </div>

      <div className={`flex items-center justify-between ${showImage ? 'pt-4 border-t' : 'pt-2'} gap-3`}>
        {type === 'flight' ? (
          <>
            <div className="flex-1 min-w-0">
              {cardInfo.rating !== null && cardInfo.rating !== undefined && cardInfo.rating > 0 ? (
                <div className="flex items-center space-x-2 mb-2 flex-wrap">
                  <div className="flex items-center flex-shrink-0">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar
                        key={star}
                        className={`text-sm ${
                          star <= Math.round(cardInfo.rating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {cardInfo.rating.toFixed(1)}
                  </span>
                  {cardInfo.ratingCount > 0 && (
                    <span className="text-sm text-gray-600 whitespace-nowrap">
                      ({cardInfo.ratingCount} {cardInfo.ratingCount === 1 ? 'review' : 'reviews'})
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 mb-2">No ratings yet</div>
              )}
              <div className="flex items-center space-x-3 flex-wrap">
                <button
                  onClick={() => setShowReviewsModal(true)}
                  className="flex items-center space-x-1 text-sm text-kayak-blue hover:text-kayak-blue-dark font-semibold transition-colors flex-shrink-0"
                >
                  <FaComment className="text-xs" />
                  <span>Reviews</span>
                </button>
                {!hideBookButton && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click navigation
                      if (!user?._id && !user?.id) {
                        toast.info('Please log in to make a booking');
                        return;
                      }
                      if (type === 'hotel') {
                        // For hotels, navigate to details page instead of opening modal
                        handleSelectRoomClick();
                      } else {
                        handleBookButtonClick();
                      }
                    }}
                    className={`text-sm px-4 py-2 whitespace-nowrap flex-shrink-0 ${
                      type === 'hotel' 
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                        : 'btn-primary'
                    }`}
                  >
                    {type === 'hotel' ? 'Select a Room' : 'Book Now'}
                  </button>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-2xl font-bold text-gray-900 whitespace-nowrap">{priceDisplay}</span>
              {priceSuffix && <span className="text-xs text-gray-500 block whitespace-nowrap">{priceSuffix}</span>}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-gray-900">{priceDisplay}</span>
              {priceSuffix && <span className="text-xs text-gray-500">{priceSuffix}</span>}
            </div>
            {!hideBookButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click navigation
                  if (!user?._id && !user?.id) {
                    toast.info('Please log in to make a booking');
                    return;
                  }
                  if (type === 'hotel') {
                    // For hotels, navigate to details page instead of opening modal
                    handleSelectRoomClick();
                  } else {
                    handleBookButtonClick();
                  }
                }}
                className={`text-sm px-4 py-2 whitespace-nowrap flex-shrink-0 ${
                  type === 'hotel' 
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                    : 'btn-primary'
                }`}
              >
                {type === 'hotel' ? 'Select a Room' : 'Book Now'}
              </button>
            )}
          </>
        )}
      </div>
      
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        item={data}
        type={type}
      />
      
      {type === 'flight' && (
        <FlightReviewsModal
          isOpen={showReviewsModal}
          onClose={() => setShowReviewsModal(false)}
          flightId={data._id || data.id}
        />
      )}
      {type === 'hotel' && (
        <HotelReviewsModal
          isOpen={showReviewsModal}
          onClose={() => setShowReviewsModal(false)}
          hotelId={data._id || data.id}
        />
      )}
    </motion.div>
  );
};

export default BookingCard;

