import React, { useState, useEffect } from 'react';
import { FaPlane, FaCheck, FaTimes } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { flightAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from './LoadingSpinner';

const SeatSelection = ({ flightId, returnFlightId, passengers, onSeatsSelected, returnFlight = false }) => {
  const toast = useToast();
  const [seatMap, setSeatMap] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetchSeatMap();
  }, [flightId, returnFlight]);

  const fetchSeatMap = async () => {
    try {
      setLoading(true);
      const id = returnFlight ? returnFlightId : flightId;
      if (!id) return;

      const response = await flightAPI.getSeatMap(id, returnFlight);
      if (response.data.success) {
        const seats = response.data.data.seatMap || [];
        setSeatMap(seats);
        
        // Group seats by row
        const seatsByRow = {};
        seats.forEach(seat => {
          if (!seatsByRow[seat.row]) {
            seatsByRow[seat.row] = [];
          }
          seatsByRow[seat.row].push(seat);
        });
        
        // Convert to array and sort
        const rowsArray = Object.keys(seatsByRow)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map(row => ({
            row: parseInt(row),
            seats: seatsByRow[row].sort((a, b) => a.column.localeCompare(b.column))
          }));
        
        setRows(rowsArray);
      }
    } catch (error) {
      console.error('Error fetching seat map:', error);
      toast.error('Failed to load seat map');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seat) => {
    if (seat.status !== 'available') {
      toast.error('This seat is not available');
      return;
    }

    const isSelected = selectedSeats.some(s => s.seatNumber === seat.seatNumber);
    
    if (isSelected) {
      // Deselect seat
      setSelectedSeats(selectedSeats.filter(s => s.seatNumber !== seat.seatNumber));
    } else {
      // Check if we've reached the passenger limit
      if (selectedSeats.length >= passengers) {
        toast.error(`You can only select ${passengers} seat${passengers > 1 ? 's' : ''}`);
        return;
      }
      // Select seat
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const getSeatStatus = (seat) => {
    const isSelected = selectedSeats.some(s => s.seatNumber === seat.seatNumber);
    if (isSelected) return 'selected';
    if (seat.status === 'booked') return 'booked';
    if (seat.status === 'reserved') return 'reserved';
    return 'available';
  };

  const getSeatClass = (seat) => {
    const status = getSeatStatus(seat);
    const baseClasses = 'w-12 h-12 rounded-lg flex items-center justify-center text-sm font-semibold transition-all cursor-pointer border-2';
    
    switch (status) {
      case 'selected':
        return `${baseClasses} bg-kayak-blue text-white border-kayak-blue hover:bg-kayak-blue-dark`;
      case 'booked':
        return `${baseClasses} bg-red-500 text-white border-red-600 cursor-not-allowed opacity-60`;
      case 'reserved':
        return `${baseClasses} bg-yellow-400 text-gray-800 border-yellow-500 cursor-not-allowed opacity-60`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 hover:border-kayak-blue`;
    }
  };

  useEffect(() => {
    if (onSeatsSelected) {
      onSeatsSelected(selectedSeats.map(s => s.seatNumber));
    }
  }, [selectedSeats, onSeatsSelected]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="seat-selection">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {returnFlight ? 'Return Flight' : 'Outbound Flight'} - Select Seats
        </h3>
        <p className="text-sm text-gray-600">
          Select {passengers} seat{passengers > 1 ? 's' : ''} ({selectedSeats.length} selected)
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gray-100 border-2 border-gray-300 rounded"></div>
          <span className="text-sm text-gray-700">Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-kayak-blue border-2 border-kayak-blue rounded"></div>
          <span className="text-sm text-gray-700">Selected</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-yellow-400 border-2 border-yellow-500 rounded"></div>
          <span className="text-sm text-gray-700">Reserved</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-red-500 border-2 border-red-600 rounded"></div>
          <span className="text-sm text-gray-700">Booked</span>
        </div>
      </div>

      {/* Aircraft Layout */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        {/* Cockpit indicator */}
        <div className="text-center mb-4">
          <FaPlane className="mx-auto text-2xl text-gray-400 mb-2" />
          <div className="text-xs text-gray-500">Front of Aircraft</div>
        </div>

        {/* Aisle indicator */}
        <div className="flex items-center mb-2">
          <div className="flex-1 text-center text-xs text-gray-500">A</div>
          <div className="flex-1 text-center text-xs text-gray-500">B</div>
          <div className="flex-1 text-center text-xs text-gray-500">C</div>
          <div className="w-8"></div>
          <div className="flex-1 text-center text-xs text-gray-500">D</div>
          <div className="flex-1 text-center text-xs text-gray-500">E</div>
          <div className="flex-1 text-center text-xs text-gray-500">F</div>
        </div>

        {/* Seat Map */}
        <div className="space-y-2">
          {rows.map(({ row, seats }) => (
            <div key={row} className="flex items-center space-x-2">
              <div className="w-8 text-sm font-semibold text-gray-700">{row}</div>
              <div className="flex-1 flex space-x-1">
                {seats.slice(0, 3).map(seat => (
                  <motion.button
                    key={seat.seatNumber}
                    onClick={() => handleSeatClick(seat)}
                    disabled={seat.status === 'booked' || seat.status === 'reserved'}
                    className={getSeatClass(seat)}
                    whileHover={{ scale: seat.status === 'available' ? 1.1 : 1 }}
                    whileTap={{ scale: seat.status === 'available' ? 0.95 : 1 }}
                  >
                    {getSeatStatus(seat) === 'selected' ? (
                      <FaCheck className="text-sm" />
                    ) : seat.status === 'booked' ? (
                      <FaTimes className="text-sm" />
                    ) : (
                      seat.column
                    )}
                  </motion.button>
                ))}
              </div>
              <div className="w-8 text-xs text-gray-400 text-center">Aisle</div>
              <div className="flex-1 flex space-x-1">
                {seats.slice(3, 6).map(seat => (
                  <motion.button
                    key={seat.seatNumber}
                    onClick={() => handleSeatClick(seat)}
                    disabled={seat.status === 'booked' || seat.status === 'reserved'}
                    className={getSeatClass(seat)}
                    whileHover={{ scale: seat.status === 'available' ? 1.1 : 1 }}
                    whileTap={{ scale: seat.status === 'available' ? 0.95 : 1 }}
                  >
                    {getSeatStatus(seat) === 'selected' ? (
                      <FaCheck className="text-sm" />
                    ) : seat.status === 'booked' ? (
                      <FaTimes className="text-sm" />
                    ) : (
                      seat.column
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Seats Summary */}
      {selectedSeats.length > 0 && (
        <div className="mt-4 p-3 bg-kayak-blue-light rounded-lg">
          <p className="text-sm font-semibold text-gray-900 mb-1">Selected Seats:</p>
          <div className="flex flex-wrap gap-2">
            {selectedSeats.map(seat => (
              <span
                key={seat.seatNumber}
                className="px-3 py-1 bg-kayak-blue text-white rounded-full text-sm font-semibold"
              >
                {seat.seatNumber}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatSelection;


