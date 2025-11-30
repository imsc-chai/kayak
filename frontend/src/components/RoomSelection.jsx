import React, { useState, useEffect } from 'react';
import { FaBed, FaUsers, FaPlus, FaMinus } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';

const RoomSelection = ({ hotel, selectedRooms, onRoomsSelected, checkIn, checkOut }) => {
  const toast = useToast();
  const [localSelectedRooms, setLocalSelectedRooms] = useState(selectedRooms || {});

  const roomTypes = hotel?.roomTypes || [];

  // Sync with parent when selectedRooms prop changes
  useEffect(() => {
    if (selectedRooms && Object.keys(selectedRooms).length > 0) {
      setLocalSelectedRooms(selectedRooms);
    }
  }, [selectedRooms]);

  const handleRoomChange = (roomType, delta) => {
    const currentCount = localSelectedRooms[roomType] || 0;
    const roomTypeData = roomTypes.find(rt => rt.type === roomType);
    
    if (!roomTypeData) return;

    const newCount = Math.max(0, Math.min(roomTypeData.available, currentCount + delta));
    
    setLocalSelectedRooms(prev => ({
      ...prev,
      [roomType]: newCount
    }));
  };

  const calculateTotalPrice = () => {
    if (!checkIn || !checkOut) return 0;
    
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) return 0;

    let total = 0;
    roomTypes.forEach(roomType => {
      const count = localSelectedRooms[roomType.type] || 0;
      if (count > 0) {
        total += roomType.pricePerNight * count * nights;
      }
    });

    return total;
  };

  const getTotalGuests = () => {
    let total = 0;
    roomTypes.forEach(roomType => {
      const count = localSelectedRooms[roomType.type] || 0;
      if (count > 0) {
        total += roomType.maxGuests * count;
      }
    });
    return total;
  };

  const getTotalRooms = () => {
    return Object.values(localSelectedRooms).reduce((sum, count) => sum + count, 0);
  };

  // Notify parent of room selection changes
  useEffect(() => {
    if (onRoomsSelected) {
      onRoomsSelected(localSelectedRooms);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSelectedRooms]);

  // Handle missing dates gracefully
  if (!checkIn || !checkOut) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">Please select check-in and check-out dates first</p>
      </div>
    );
  }

  let checkInDate, checkOutDate, nights;
  try {
    checkInDate = new Date(checkIn);
    checkOutDate = new Date(checkOut);
    
    // Validate dates
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">Invalid date format</p>
        </div>
      );
    }
    
    nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('Error parsing dates:', error);
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">Error processing dates</p>
      </div>
    );
  }

  if (nights <= 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">Check-out date must be after check-in date</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm font-semibold">
          Stay Duration: {nights} {nights === 1 ? 'night' : 'nights'}
        </p>
      </div>

      {roomTypes.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-gray-600 text-sm">No room types available</p>
        </div>
      ) : (
        <>
          {roomTypes.map((roomType, index) => {
            if (!roomType || !roomType.type) return null;
            
            const selectedCount = localSelectedRooms[roomType.type] || 0;
            const pricePerNight = roomType.pricePerNight || 0;
            const roomTotal = pricePerNight * selectedCount * nights;
            const isAvailable = (roomType.available || 0) > 0;

            return (
              <motion.div
                key={roomType.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`border-2 rounded-lg p-4 ${
                  selectedCount > 0
                    ? 'border-kayak-blue bg-blue-50'
                    : 'border-gray-200 bg-white'
                } ${!isAvailable ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <FaBed className="text-kayak-blue" />
                      <h3 className="text-lg font-semibold text-gray-900">{roomType.type}</h3>
                      {!isAvailable && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          Sold Out
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <FaUsers />
                        <span>Up to {roomType.maxGuests} guests</span>
                      </span>
                      <span className="text-green-600 font-semibold">
                        {roomType.available} available
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-bold text-kayak-blue">
                        ${roomType.pricePerNight.toFixed(2)}
                      </span>
                      <span className="text-gray-600 text-sm ml-1">/night</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => handleRoomChange(roomType.type, -1)}
                        disabled={selectedCount === 0 || !isAvailable}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          selectedCount === 0 || !isAvailable
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        <FaMinus className="text-xs" />
                      </button>
                      <span className="text-xl font-bold text-gray-900 w-8 text-center">
                        {selectedCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRoomChange(roomType.type, 1)}
                        disabled={selectedCount >= roomType.available || !isAvailable}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          selectedCount >= roomType.available || !isAvailable
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-kayak-blue text-white hover:bg-kayak-blue-dark'
                        }`}
                      >
                        <FaPlus className="text-xs" />
                      </button>
                    </div>
                    {selectedCount > 0 && (
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {selectedCount} room{selectedCount !== 1 ? 's' : ''} × {nights} night{nights !== 1 ? 's' : ''}
                        </div>
                        <div className="text-lg font-semibold text-kayak-blue">
                          ${roomTotal.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {getTotalRooms() > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-kayak-blue-light border-2 border-kayak-blue rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-semibold">Total Rooms:</span>
                <span className="text-gray-900 font-bold">{getTotalRooms()}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-semibold">Total Guests:</span>
                <span className="text-gray-900 font-bold">{getTotalGuests()}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-kayak-blue">
                <span className="text-lg font-bold text-gray-900">Total Price:</span>
                <span className="text-2xl font-bold text-kayak-blue">
                  ${calculateTotalPrice().toFixed(2)}
                </span>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default RoomSelection;

