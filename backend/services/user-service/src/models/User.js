const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PHONE_DIGIT_REGEX = /^\d{10}$/;
const CARD_EXPIRY_REGEX = /^(0[1-9]|1[0-2])\/\d{2}$/;
const SSN_REGEX = /^\d{3}-\d{2}-\d{4}$/;
const ZIP_REGEX = /^\d{5}(-\d{4})?$/;

// Valid US States - both abbreviations and full names
const US_STATES = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
};

const VALID_STATE_ABBREVIATIONS = Object.keys(US_STATES);
const VALID_STATE_NAMES = Object.values(US_STATES).map(s => s.toLowerCase());

const isValidUSState = (value) => {
  if (!value) return false;
  const normalized = value.trim();
  // Check if it's a valid abbreviation (case-insensitive)
  if (VALID_STATE_ABBREVIATIONS.includes(normalized.toUpperCase())) {
    return true;
  }
  // Check if it's a valid full state name (case-insensitive)
  if (VALID_STATE_NAMES.includes(normalized.toLowerCase())) {
    return true;
  }
  return false;
};

const isFutureExpiry = (value) => {
  if (!value || !CARD_EXPIRY_REGEX.test(value)) {
    return false;
  }
  const [month, year] = value.split('/');
  const expiryMonth = parseInt(month, 10);
  const expiryYear = 2000 + parseInt(year, 10);
  const now = new Date();
  const comparisonDate = new Date(expiryYear, expiryMonth, 0, 23, 59, 59, 999);
  return comparisonDate >= now;
};

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, 'SSN is required. User must provide their SSN.'],
    unique: true,
    immutable: true, // Prevent modification after creation
    validate: {
      validator: function(v) {
        // SSN format: ###-##-####
        return SSN_REGEX.test(v);
      },
      message: 'Invalid SSN format. Must be ###-##-#### (e.g., 123-45-6789)'
    }
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    validate: {
      validator: isValidUSState,
      message: 'Invalid state. Must be a valid US state abbreviation (e.g., CA, NY) or full name (e.g., California, New York)'
    }
  },
  zipCode: {
    type: String,
    required: [true, 'Zip code is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return ZIP_REGEX.test(v);
      },
      message: 'Invalid zip code format. Must be ##### or #####-#### (e.g., 12345 or 12345-6789)'
    }
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return PHONE_DIGIT_REGEX.test(v);
      },
      message: 'Phone number must be exactly 10 digits'
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\S+@\S+\.\S+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profileImage: {
    type: String,
    required: [true, 'Profile image is required'],
    default: 'https://via.placeholder.com/150'
  },
  gender: {
    type: String,
    enum: {
      values: ['Male', 'Female', 'Other', 'Prefer not to say', ''],
      message: 'Gender must be one of: Male, Female, Other, Prefer not to say'
    },
    default: ''
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  country: {
    type: String,
    default: 'USA',
    trim: true
  },
  preferredLanguage: {
    type: String,
    default: 'English',
    trim: true
  },
  currency: {
    type: String,
    default: 'USD',
    trim: true
  },
  emergencyContact: {
    name: {
      type: String,
      default: '',
      trim: true
    },
    phone: {
      type: String,
      default: '',
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // optional field
          return PHONE_DIGIT_REGEX.test(v);
        },
        message: 'Emergency contact phone must be exactly 10 digits'
      }
    },
    relationship: {
      type: String,
      default: '',
      trim: true
    }
  },
  travelPreferences: {
    passportNumber: {
      type: String,
      default: '',
      trim: true
    },
    frequentFlyerNumber: {
      type: String,
      default: '',
      trim: true
    },
    seatPreference: {
      type: String,
      enum: ['Window', 'Aisle', 'Middle', 'No Preference'],
      default: 'No Preference'
    },
    mealPreference: {
      type: String,
      enum: ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-Free', 'No Preference'],
      default: 'No Preference'
    }
  },
  creditCard: {
    cardNumber: {
      type: String,
      default: ''
    },
    cardHolderName: {
      type: String,
      default: ''
    },
    expiryDate: {
      type: String,
      default: '',
      validate: {
        validator: function(v) {
          if (!v) return true;
          if (!CARD_EXPIRY_REGEX.test(v)) return false;
          return isFutureExpiry(v);
        },
        message: 'Credit card expiry must be in MM/YY format and not be expired'
      }
    },
    cvv: {
      type: String,
      default: ''
    }
  },
  bookingHistory: [{
    bookingId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['flight', 'hotel', 'car'],
      required: true
    },
    bookingDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['upcoming', 'current', 'past', 'cancelled'],
      default: 'upcoming'
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    }
  }],
  reviews: [{
    reviewId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['flight', 'hotel', 'car'],
      required: true
    },
    itemId: {
      type: String,
      required: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
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
  favourites: [{
    itemId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['flight', 'hotel', 'car'],
      required: true
    },
    itemData: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notifications: [{
    notificationId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['success', 'info', 'warning', 'error'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    relatedId: {
      type: String,
      default: ''
    },
    relatedType: {
      type: String,
      enum: ['booking', 'payment', 'deal', 'reminder', ''],
      default: ''
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Mask credit card number before saving (PCI DSS compliance - only store last 4 digits)
userSchema.pre('save', function(next) {
  // Mask card number - only store last 4 digits
  if (this.creditCard && this.creditCard.cardNumber) {
    const cardNumber = this.creditCard.cardNumber.replace(/\s/g, ''); // Remove spaces
    if (cardNumber.length >= 4) {
      // Only store last 4 digits for security
      this.creditCard.cardNumber = `**** **** **** ${cardNumber.slice(-4)}`;
    }
  }
  
  // NEVER store CVV - always delete it
  if (this.creditCard && this.creditCard.cvv) {
    this.creditCard.cvv = '';
  }
  
  this.updatedAt = Date.now();
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get user without sensitive data
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  
  // Ensure CVV is never returned
  if (user.creditCard) {
    delete user.creditCard.cvv;
    // If card number is not already masked, mask it (for old records)
    if (user.creditCard.cardNumber && !user.creditCard.cardNumber.includes('*')) {
      const cardNumber = user.creditCard.cardNumber.replace(/\s/g, '');
      if (cardNumber.length >= 4) {
        user.creditCard.cardNumber = `**** **** **** ${cardNumber.slice(-4)}`;
      }
    }
  }
  
  // Ensure _id is included in the response (MongoDB _id)
  if (!user._id && this._id) {
    user._id = this._id.toString();
  }
  return user;
};

const User = mongoose.model('User', userSchema);

// Export validation helpers for use in controller
module.exports = User;
module.exports.SSN_REGEX = SSN_REGEX;
module.exports.ZIP_REGEX = ZIP_REGEX;
module.exports.US_STATES = US_STATES;
module.exports.isValidUSState = isValidUSState;
module.exports.VALID_STATE_ABBREVIATIONS = VALID_STATE_ABBREVIATIONS;

