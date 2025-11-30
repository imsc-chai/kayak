// Validation middleware
// SSN format: ###-##-####
const SSN_REGEX = /^\d{3}-\d{2}-\d{4}$/;
// Zip code format: ##### or #####-####
const ZIP_REGEX = /^\d{5}(-\d{4})?$/;
// Valid US States
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
const US_STATE_NAMES = ['alabama','alaska','arizona','arkansas','california','colorado','connecticut','delaware','florida','georgia','hawaii','idaho','illinois','indiana','iowa','kansas','kentucky','louisiana','maine','maryland','massachusetts','michigan','minnesota','mississippi','missouri','montana','nebraska','nevada','new hampshire','new jersey','new mexico','new york','north carolina','north dakota','ohio','oklahoma','oregon','pennsylvania','rhode island','south carolina','south dakota','tennessee','texas','utah','vermont','virginia','washington','west virginia','wisconsin','wyoming','district of columbia'];

exports.validateRegister = (req, res, next) => {
  const {
    userId,
    firstName,
    lastName,
    email,
    password,
    address,
    city,
    state,
    zipCode,
    phoneNumber
  } = req.body;

  const errors = [];

  // SSN validation - format: ###-##-####
  if (!userId) {
    errors.push('SSN (User ID) is required');
  } else if (!SSN_REGEX.test(userId)) {
    errors.push('SSN must be in format ###-##-#### (e.g., 123-45-6789)');
  }

  if (!firstName || firstName.trim().length < 2) {
    errors.push('First name is required and must be at least 2 characters');
  }

  if (!lastName || lastName.trim().length < 2) {
    errors.push('Last name is required and must be at least 2 characters');
  }

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    errors.push('Valid email is required');
  }

  if (!password || password.length < 6) {
    errors.push('Password is required and must be at least 6 characters');
  }

  if (!address || address.trim().length < 5) {
    errors.push('Address is required');
  }

  if (!city || city.trim().length < 2) {
    errors.push('City is required');
  }

  // State validation - must be valid US state
  if (!state) {
    errors.push('State is required');
  } else {
    const normalizedState = state.trim().toUpperCase();
    const normalizedStateName = state.trim().toLowerCase();
    if (!US_STATES.includes(normalizedState) && !US_STATE_NAMES.includes(normalizedStateName)) {
      errors.push('State must be a valid US state (e.g., CA, NY, or California, New York)');
    }
  }

  // Zip code validation - format: ##### or #####-####
  if (!zipCode) {
    errors.push('Zip code is required');
  } else if (!ZIP_REGEX.test(zipCode.trim())) {
    errors.push('Zip code must be in format ##### or #####-#### (e.g., 12345 or 12345-6789)');
  }

  if (!phoneNumber || phoneNumber.replace(/\D/g, '').length !== 10) {
    errors.push('Valid 10-digit phone number is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  const errors = [];

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    errors.push('Valid email is required');
  }

  if (!password) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

