import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaMapMarkerAlt, FaStar, FaUsers, FaBed, FaWifi, FaSwimmingPool, FaCar, FaUtensils, FaSpa, FaDumbbell, FaParking, FaTv, FaSnowflake, FaShieldAlt, FaComment } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { hotelAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import BookingModal from '../components/BookingModal';
import HotelReviewsModal from '../components/HotelReviewsModal';

const HotelDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  const amenityIcons = {
    'WiFi': FaWifi,
    'Pool': FaSwimmingPool,
    'Gym': FaDumbbell,
    'Spa': FaSpa,
    'Restaurant': FaUtensils,
    'Parking': FaParking,
    'Air Conditioning': FaSnowflake,
    'Room Service': FaUtensils,
    'Bar': FaUtensils,
    'Business Center': FaShieldAlt,
  };

  useEffect(() => {
    fetchHotel();
  }, [id]);

  const fetchHotel = async () => {
    try {
      setLoading(true);
      const response = await hotelAPI.getHotel(id);
      if (response.data.success) {
        setHotel(response.data.data);
      } else {
        toast.error('Hotel not found');
        navigate('/');
      }
    } catch (error) {
      console.error('Error fetching hotel:', error);
      toast.error('Failed to load hotel details');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!hotel) {
    return null;
  }

  const images = hotel.images && hotel.images.length > 0 ? hotel.images : [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
  ];

  const averageRating = hotel.hotelRating?.average || 0;
  const reviewCount = hotel.hotelRating?.count || 0;
  const starRating = hotel.starRating || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <FaArrowLeft />
            <span>Back</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hotel Name and Rating */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{hotel.hotelName}</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <FaStar
                  key={i}
                  className={`text-lg ${i < starRating ? 'text-yellow-400' : 'text-gray-300'}`}
                />
              ))}
              <span className="ml-2 text-gray-600">{starRating} Star Hotel</span>
            </div>
            {averageRating > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold text-gray-900">⭐ {averageRating.toFixed(1)}</span>
                <button
                  onClick={() => setShowReviewsModal(true)}
                  className="text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
                >
                  <FaComment />
                  <span>({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2 text-gray-600 mt-2">
            <FaMapMarkerAlt />
            <span>{hotel.address}, {hotel.city}, {hotel.state} {hotel.zipCode}</span>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 md:row-span-2">
              <img
                src={images[selectedImageIndex] || images[0]}
                alt={hotel.hotelName}
                className="w-full h-full object-cover rounded-lg"
                style={{ minHeight: '400px' }}
              />
            </div>
            {images.slice(0, 4).map((img, index) => (
              <div
                key={index}
                className={`cursor-pointer ${index === selectedImageIndex ? 'ring-4 ring-kayak-blue' : ''}`}
                onClick={() => setSelectedImageIndex(index)}
              >
                <img
                  src={img}
                  alt={`${hotel.hotelName} - Image ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                  style={{ minHeight: '190px' }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Hotel</h2>
              <p className="text-gray-700 leading-relaxed">
                Experience luxury and comfort at {hotel.hotelName}. Located in the heart of {hotel.city}, 
                this {starRating}-star hotel offers exceptional amenities and world-class service.
              </p>
            </div>

            {/* Room Types */}
            {hotel.roomTypes && hotel.roomTypes.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Room Types</h2>
                <div className="space-y-4">
                  {hotel.roomTypes.map((roomType, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{roomType.type}</h3>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center space-x-1">
                              <FaUsers />
                              <span>Up to {roomType.maxGuests || 2} guests</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <FaBed />
                              <span>{roomType.available} available</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-kayak-blue">
                            ${roomType.pricePerNight?.toFixed(2) || '0.00'}
                          </div>
                          <div className="text-sm text-gray-500">per night</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities */}
            {hotel.amenities && hotel.amenities.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {hotel.amenities.map((amenity, index) => {
                    const Icon = amenityIcons[amenity] || FaShieldAlt;
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center space-x-3 bg-white rounded-lg p-4 border border-gray-200"
                      >
                        <Icon className="text-kayak-blue text-xl" />
                        <span className="text-gray-700 font-medium">{amenity}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            {reviewCount > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Guest Reviews</h2>
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-4xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
                      <div className="flex items-center space-x-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <FaStar
                            key={i}
                            className={`text-sm ${i < Math.round(averageRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowReviewsModal(true)}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <FaComment />
                      <span>View All Reviews ({reviewCount})</span>
                    </button>
                  </div>
                  {hotel.guestReviews && hotel.guestReviews.slice(0, 3).map((review, index) => (
                    <div key={index} className="border-t pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">{review.userName}</span>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <FaStar
                              key={i}
                              className={`text-xs ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700 text-sm">{review.comment}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(review.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-24">
              <div className="mb-6">
                <div className="text-3xl font-bold text-kayak-blue mb-2">
                  ${hotel.pricePerNight?.toFixed(2) || '0.00'}
                </div>
                <div className="text-sm text-gray-500">per night</div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Available Rooms</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {hotel.availableRooms || 0} of {hotel.numberOfRooms || 0} rooms
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowBookingModal(true)}
                className="btn-primary w-full text-lg py-3"
              >
                Book Now
              </button>

              <div className="mt-6 pt-6 border-t space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Total Rooms:</span>
                  <span className="font-semibold">{hotel.numberOfRooms || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Available:</span>
                  <span className="font-semibold text-green-600">{hotel.availableRooms || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {hotel && (
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          item={hotel}
          type="hotel"
        />
      )}

      {/* Reviews Modal */}
      <HotelReviewsModal
        isOpen={showReviewsModal}
        onClose={() => setShowReviewsModal(false)}
        hotelId={hotel._id || hotel.id}
      />
    </div>
  );
};

export default HotelDetails;

