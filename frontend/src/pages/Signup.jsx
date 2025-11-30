import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaEnvelope, FaLock, FaUser, FaEye, FaEyeSlash, FaGoogle, FaFacebook, FaIdCard } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { registerUser, clearError } from '../store/slices/authSlice';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);
  
  // SSN format: ###-##-####
  const formatSSN = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Format as ###-##-####
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
  };

  const validateSSN = (ssn) => {
    return /^\d{3}-\d{2}-\d{4}$/.test(ssn);
  };
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userId: '', // SSN - must be provided by user, never auto-generated
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phoneNumber: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, toast, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for SSN field - auto-format as user types
    if (name === 'userId') {
      const formattedSSN = formatSSN(value);
      setFormData({
        ...formData,
        userId: formattedSSN,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validate SSN (required, must be in format ###-##-####)
    if (!formData.userId) {
      newErrors.userId = 'SSN is required';
    } else if (!validateSSN(formData.userId)) {
      newErrors.userId = 'SSN must be in format ###-##-#### (e.g., 123-45-6789)';
    }

    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.city) newErrors.city = 'City is required';
    
    // Validate state (US state abbreviation or full name)
    if (!formData.state) {
      newErrors.state = 'State is required';
    }
    
    // Validate zip code (##### or #####-####)
    if (!formData.zipCode) {
      newErrors.zipCode = 'Zip code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
      newErrors.zipCode = 'Zip code must be ##### or #####-#### format';
    }
    
    // Validate phone number (10 digits)
    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
      newErrors.phoneNumber = 'Phone number must be 10 digits';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const { confirmPassword, ...signupData } = formData;
      
      // SSN is already in correct format from user input
      console.log('Submitting signup data:', signupData);
      
      const result = await dispatch(registerUser(signupData)).unwrap();
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = typeof err === 'string' ? err : err?.message || 'Registration failed';
      setErrors({ submit: errorMessage });
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-kayak-blue via-blue-600 to-kayak-blue-dark flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-2xl p-8"
      >
        <div>
          <h2 className="text-center text-4xl font-bold bg-gradient-to-r from-kayak-blue to-kayak-orange bg-clip-text text-transparent mb-2">
            Create Account
          </h2>
          <p className="text-center text-gray-600">
            Join thousands of travelers today
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                First Name
              </label>
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`input-field pl-10 ${errors.firstName ? 'border-red-500' : ''}`}
                  placeholder="John"
                />
              </div>
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Last Name
              </label>
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`input-field pl-10 ${errors.lastName ? 'border-red-500' : ''}`}
                  placeholder="Doe"
                />
              </div>
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Social Security Number (SSN) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FaIdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="userId"
                value={formData.userId}
                onChange={handleChange}
                maxLength={11}
                className={`input-field pl-10 ${errors.userId ? 'border-red-500' : ''}`}
                placeholder="###-##-####"
              />
            </div>
            {errors.userId && (
              <p className="mt-1 text-sm text-red-500">{errors.userId}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Format: 123-45-6789 (Required for identification)</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`input-field pl-10 ${errors.email ? 'border-red-500' : ''}`}
                placeholder="you@example.com"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                placeholder="Create a password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className={`input-field ${errors.address ? 'border-red-500' : ''}`}
              placeholder="Street address"
            />
            {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className={`input-field ${errors.city ? 'border-red-500' : ''}`} />
              {errors.city && <p className="mt-1 text-sm text-red-500">{errors.city}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
              <input type="text" name="state" value={formData.state} onChange={handleChange} className={`input-field ${errors.state ? 'border-red-500' : ''}`} />
              {errors.state && <p className="mt-1 text-sm text-red-500">{errors.state}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Zip Code</label>
              <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} className={`input-field ${errors.zipCode ? 'border-red-500' : ''}`} />
              {errors.zipCode && <p className="mt-1 text-sm text-red-500">{errors.zipCode}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
              <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className={`input-field ${errors.phoneNumber ? 'border-red-500' : ''}`} />
              {errors.phoneNumber && <p className="mt-1 text-sm text-red-500">{errors.phoneNumber}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`input-field pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              className="h-4 w-4 text-kayak-blue focus:ring-kayak-blue border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
              I agree to the{' '}
              <Link to="/terms" className="text-kayak-blue hover:text-kayak-blue-dark">
                Terms and Conditions
              </Link>
            </label>
          </div>

          {errors.submit && (
            <p className="text-red-500 text-sm mb-4">{errors.submit}</p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : 'Create Account'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or sign up with</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center space-x-2 px-4 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <FaGoogle className="text-red-500" />
              <span className="text-sm font-semibold text-gray-700">Google</span>
            </button>
            <button className="flex items-center justify-center space-x-2 px-4 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <FaFacebook className="text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">Facebook</span>
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-kayak-blue hover:text-kayak-blue-dark font-semibold">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;

