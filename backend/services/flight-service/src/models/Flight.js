const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
  flightId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  airline: {
    type: String,
    required: true,
    trim: true
  },
  departureAirport: {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true
    }
  },
  arrivalAirport: {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true
    }
  },
  departureDateTime: {
    type: Date,
    required: true
  },
  arrivalDateTime: {
    type: Date,
    required: true
  },
  duration: {
    hours: {
      type: Number,
      required: true
    },
    minutes: {
      type: Number,
      required: true
    }
  },
  flightClass: {
    type: String,
    enum: ['Economy', 'Business', 'First'],
    default: 'Economy',
    required: true
  },
  ticketPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalAvailableSeats: {
    type: Number,
    required: true,
    min: 0,
    max: 60
  },
  availableSeats: {
    type: Number,
    required: true,
    min: 0,
    max: 60
  },
  // Seat map for individual seat tracking
  seatMap: [{
    seatNumber: {
      type: String,
      required: true
    },
    row: {
      type: Number,
      required: true
    },
    column: {
      type: String,
      required: true
    },
    class: {
      type: String,
      enum: ['Economy', 'Business', 'First'],
      required: true
    },
    status: {
      type: String,
      enum: ['available', 'booked', 'reserved'],
      default: 'available'
    },
    bookedBy: {
      userId: String,
      bookingId: String,
      reservedAt: Date
    }
  }],
  flightRating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  passengerReviews: [{
    userId: {
      type: String,
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  amenities: [{
    type: String
  }],
  // Return flight fields (optional - for round-trip flights only)
  returnFlightId: {
    type: String,
    required: false,
    trim: true,
    uppercase: true
  },
  returnDepartureDateTime: {
    type: Date,
    required: false
  },
  returnArrivalDateTime: {
    type: Date,
    required: false
  },
  returnDuration: {
    hours: {
      type: Number,
      required: false,
      min: 0
    },
    minutes: {
      type: Number,
      required: false,
      min: 0,
      max: 59
    }
  },
  returnTicketPrice: {
    type: Number,
    required: false,
    min: 0
  },
  returnFlightClass: {
    type: String,
    enum: ['Economy', 'Business', 'First'],
    required: false
  },
  returnTotalAvailableSeats: {
    type: Number,
    required: false,
    min: 0,
    max: 60
  },
  returnAvailableSeats: {
    type: Number,
    required: false,
    min: 0,
    max: 60
  },
  // Return flight seat map
  returnSeatMap: [{
    seatNumber: {
      type: String,
      required: true
    },
    row: {
      type: Number,
      required: true
    },
    column: {
      type: String,
      required: true
    },
    class: {
      type: String,
      enum: ['Economy', 'Business', 'First'],
      required: true
    },
    status: {
      type: String,
      enum: ['available', 'booked', 'reserved'],
      default: 'available'
    },
    bookedBy: {
      userId: String,
      bookingId: String,
      reservedAt: Date
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better search performance
flightSchema.index({ 'departureAirport.code': 1, 'arrivalAirport.code': 1 });
flightSchema.index({ departureDateTime: 1 });
flightSchema.index({ ticketPrice: 1 });
flightSchema.index({ flightClass: 1 });

// Initialize seat map if not exists (only for new documents)
flightSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Only initialize seat maps if this is a new document
  if (this.isNew) {
    // Initialize seat map for outbound flight
    if (!this.seatMap || this.seatMap.length === 0) {
      this.seatMap = generateSeatMap(this.totalAvailableSeats, this.flightClass);
    }
    
    // Initialize seat map for return flight (only if return flight exists)
    if (this.returnFlightId && this.returnTotalAvailableSeats && this.returnFlightClass) {
      if (!this.returnSeatMap || this.returnSeatMap.length === 0) {
        this.returnSeatMap = generateSeatMap(this.returnTotalAvailableSeats, this.returnFlightClass);
      }
    }
  }
  
  next();
});

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

module.exports = mongoose.model('Flight', flightSchema);

