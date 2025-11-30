import React, { useState, useEffect } from 'react';
import { FaTimes, FaStar, FaUser } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { carAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from './LoadingSpinner';

const CarReviewsModal = ({ isOpen, onClose, carId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (isOpen && carId) {
      fetchReviews();
    }
  }, [isOpen, carId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await carAPI.getCar(carId);
      if (response.data.success) {
        const car = response.data.data;
        setReviews(car.customerReviews || []);
      } else {
        setError('Failed to load reviews');
      }
    } catch (err) {
      console.error('Error fetching car reviews:', err);
      setError('Failed to load reviews');
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[61] flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-kayak-blue text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
                <h2 className="text-xl font-bold">Car Reviews</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <FaTimes className="text-lg" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="text-red-600">{error}</p>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No reviews yet. Be the first to review!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <FaUser className="text-gray-400" />
                            <span className="font-semibold text-gray-900">{review.userName || 'Anonymous'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <FaStar
                                key={i}
                                className={`text-sm ${
                                  i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm text-gray-600">{review.rating}.0</span>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-gray-700 mt-2">{review.comment}</p>
                        )}
                        {review.createdAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(review.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CarReviewsModal;

