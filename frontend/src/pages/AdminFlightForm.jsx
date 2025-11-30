import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaPlane, FaArrowLeft, FaSave } from 'react-icons/fa';
import { useToast } from '../context/ToastContext';
import { flightAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminFlightForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  const [formData, setFormData] = useState({
    flightId: '',
    airline: '',
    departureAirport: {
      code: '',
      name: '',
      city: '',
      country: 'USA'
    },
    arrivalAirport: {
      code: '',
      name: '',
      city: '',
      country: 'USA'
    },
    departureDateTime: '',
    arrivalDateTime: '',
    duration: {
      hours: 0,
      minutes: 0
    },
    flightClass: 'Economy',
    ticketPrice: 0,
    totalAvailableSeats: 0,
    availableSeats: 0,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEdit) {
      fetchFlight();
    }
  }, [id]);

  // Auto-calculate duration based on departure and arrival times
  useEffect(() => {
    if (formData.departureDateTime && formData.arrivalDateTime) {
      const departure = new Date(formData.departureDateTime);
      const arrival = new Date(formData.arrivalDateTime);
      if (arrival > departure) {
        const diffMs = arrival - departure;
        const diffHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10; // Round to 1 decimal place
        setFormData(prev => ({
          ...prev,
          duration: { ...prev.duration, hours: diffHours, minutes: 0 }
        }));
      }
    }
  }, [formData.departureDateTime, formData.arrivalDateTime]);

  const fetchFlight = async () => {
    try {
      setFetching(true);
      const response = await flightAPI.getFlight(id);
      if (response.data.success) {
        const flight = response.data.data;
        
        setFormData({
          flightId: flight.flightId || '',
          airline: flight.airline || '',
          departureAirport: flight.departureAirport || { code: '', name: '', city: '', country: 'USA' },
          arrivalAirport: flight.arrivalAirport || { code: '', name: '', city: '', country: 'USA' },
          departureDateTime: flight.departureDateTime ? new Date(flight.departureDateTime).toISOString().slice(0, 16) : '',
          arrivalDateTime: flight.arrivalDateTime ? new Date(flight.arrivalDateTime).toISOString().slice(0, 16) : '',
          duration: flight.duration || { hours: 0, minutes: 0 },
          flightClass: flight.flightClass || 'Economy',
          ticketPrice: flight.ticketPrice || flight.fare || 0,
          totalAvailableSeats: flight.totalAvailableSeats || 0,
          availableSeats: flight.availableSeats || 0,
        });
      }
    } catch (error) {
      toast.error('Failed to fetch flight details');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('departureAirport.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        departureAirport: { ...prev.departureAirport, [field]: value }
      }));
    } else if (name.startsWith('arrivalAirport.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        arrivalAirport: { ...prev.arrivalAirport, [field]: value }
      }));
    } else if (name.startsWith('duration.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        duration: { ...prev.duration, [field]: parseInt(value) || 0 }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.flightId) newErrors.flightId = 'Flight ID is required';
    if (!formData.airline) newErrors.airline = 'Airline is required';
    if (!formData.departureAirport.code) newErrors['departureAirport.code'] = 'Departure airport code is required';
    if (!formData.arrivalAirport.code) newErrors['arrivalAirport.code'] = 'Arrival airport code is required';
    if (!formData.departureDateTime) newErrors.departureDateTime = 'Departure date/time is required';
    if (!formData.arrivalDateTime) newErrors.arrivalDateTime = 'Arrival date/time is required';
    if (formData.ticketPrice <= 0) newErrors.ticketPrice = 'Ticket price must be greater than 0';
    if (formData.totalAvailableSeats <= 0) newErrors.totalAvailableSeats = 'Total seats must be greater than 0';
    if (formData.availableSeats > formData.totalAvailableSeats) {
      newErrors.availableSeats = 'Available seats cannot exceed total seats';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Get form values directly from DOM as fallback (in case React state isn't updated)
    const getFormValue = (name) => {
      const input = document.querySelector(`input[name="${name}"], select[name="${name}"]`);
      return input ? input.value : formData[name];
    };
    
    // Update formData with current DOM values to ensure we have the latest data
    // Read ALL fields from DOM to ensure we capture the latest values
    const currentFormData = {
      ...formData,
      // Main flight fields
      flightId: getFormValue('flightId') || formData.flightId,
      airline: getFormValue('airline') || formData.airline,
      departureDateTime: getFormValue('departureDateTime') || formData.departureDateTime,
      arrivalDateTime: getFormValue('arrivalDateTime') || formData.arrivalDateTime,
      ticketPrice: getFormValue('ticketPrice') || formData.ticketPrice,
      totalAvailableSeats: getFormValue('totalAvailableSeats') || formData.totalAvailableSeats,
      availableSeats: getFormValue('availableSeats') || formData.availableSeats,
      flightClass: getFormValue('flightClass') || formData.flightClass,
      // Departure airport fields
      departureAirport: {
        code: getFormValue('departureAirport.code') || formData.departureAirport?.code,
        name: getFormValue('departureAirport.name') || formData.departureAirport?.name,
        city: getFormValue('departureAirport.city') || formData.departureAirport?.city,
        country: getFormValue('departureAirport.country') || formData.departureAirport?.country,
      },
      // Arrival airport fields
      arrivalAirport: {
        code: getFormValue('arrivalAirport.code') || formData.arrivalAirport?.code,
        name: getFormValue('arrivalAirport.name') || formData.arrivalAirport?.name,
        city: getFormValue('arrivalAirport.city') || formData.arrivalAirport?.city,
        country: getFormValue('arrivalAirport.country') || formData.arrivalAirport?.country,
      },
    };
    
    // Initialize duration if not present
    if (!currentFormData.duration) {
      currentFormData.duration = { hours: 0, minutes: 0 };
    }
    
    // Calculate duration hours if dates are present but duration is 0 or missing
    if (currentFormData.departureDateTime && currentFormData.arrivalDateTime) {
      const departure = new Date(currentFormData.departureDateTime);
      const arrival = new Date(currentFormData.arrivalDateTime);
      if (arrival > departure && (!currentFormData.duration.hours || currentFormData.duration.hours === 0)) {
        const diffMs = arrival - departure;
        const diffHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
        currentFormData.duration = {
          hours: diffHours,
          minutes: 0
        };
      }
    }
    
    // Also get duration hours from DOM as fallback (check DOM first, then use calculated)
    const durationHoursInput = document.querySelector('input[name="duration.hours"]');
    if (durationHoursInput && durationHoursInput.value && parseFloat(durationHoursInput.value) > 0) {
      currentFormData.duration = {
        hours: parseFloat(durationHoursInput.value),
        minutes: 0
      };
    }
    
    // Final check: ensure outbound duration is set (if still 0, recalculate from dates)
    if (currentFormData.departureDateTime && currentFormData.arrivalDateTime && (!currentFormData.duration.hours || currentFormData.duration.hours === 0)) {
      const departure = new Date(currentFormData.departureDateTime);
      const arrival = new Date(currentFormData.arrivalDateTime);
      if (arrival > departure) {
        const diffMs = arrival - departure;
        const diffHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
        currentFormData.duration = { hours: diffHours, minutes: 0 };
      }
    }
    
    // Validate with current form data
    const toValidDate = (value) => {
      if (!value) return null;
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    };

    const validateWithData = (data) => {
      const newErrors = {};
      if (!data.flightId) newErrors.flightId = 'Flight ID is required';
      if (!data.airline) newErrors.airline = 'Airline is required';
      if (!data.departureAirport?.code) newErrors['departureAirport.code'] = 'Departure airport code is required';
      if (!data.arrivalAirport?.code) newErrors['arrivalAirport.code'] = 'Arrival airport code is required';
      if (!data.departureDateTime) newErrors.departureDateTime = 'Departure date/time is required';
      if (!data.arrivalDateTime) newErrors.arrivalDateTime = 'Arrival date/time is required';
      const departureDate = toValidDate(data.departureDateTime);
      const arrivalDate = toValidDate(data.arrivalDateTime);
      if (departureDate && arrivalDate && arrivalDate <= departureDate) {
        newErrors.arrivalDateTime = 'Arrival must be after departure.';
      }
      if (data.ticketPrice <= 0) newErrors.ticketPrice = 'Ticket price must be greater than 0';
      const totalSeatsValue = Number(data.totalAvailableSeats);
      const availableSeatsValue = Number(data.availableSeats);
      if (!Number.isFinite(totalSeatsValue) || totalSeatsValue <= 0) {
        newErrors.totalAvailableSeats = 'Total seats must be greater than 0';
      } else if (totalSeatsValue > 60) {
        newErrors.totalAvailableSeats = 'Total seats cannot exceed 60';
      }
      if (!Number.isFinite(availableSeatsValue) || availableSeatsValue <= 0) {
        newErrors.availableSeats = 'Available seats must be greater than 0';
      } else if (availableSeatsValue > 60) {
        newErrors.availableSeats = 'Available seats cannot exceed 60';
      }
      if (Number.isFinite(totalSeatsValue) &&
          Number.isFinite(availableSeatsValue) &&
          availableSeatsValue > totalSeatsValue) {
        newErrors.availableSeats = 'Available seats cannot exceed total seats';
      }
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };
    
    if (!validateWithData(currentFormData)) return;

    try {
      setLoading(true);
      
      // Build submit data explicitly to avoid issues with nested objects
      const submitData = {
        flightId: currentFormData.flightId,
        airline: currentFormData.airline,
        departureAirport: currentFormData.departureAirport,
        arrivalAirport: currentFormData.arrivalAirport,
        departureDateTime: new Date(currentFormData.departureDateTime),
        arrivalDateTime: new Date(currentFormData.arrivalDateTime),
        duration: {
          hours: currentFormData.duration.hours,
          minutes: 0
        },
        flightClass: currentFormData.flightClass,
        ticketPrice: parseFloat(currentFormData.ticketPrice),
        totalAvailableSeats: parseInt(currentFormData.totalAvailableSeats),
        availableSeats: parseInt(currentFormData.availableSeats),
      };
      
      // Remove undefined and empty string values to ensure clean data
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === undefined || submitData[key] === '') {
          delete submitData[key];
        }
      });
      
      // Debug: Log the data being sent
      console.log('Submitting flight data:', JSON.stringify(submitData, null, 2));

      if (isEdit) {
        const response = await flightAPI.updateFlight(id, submitData);
        console.log('Update response:', response.data);
        toast.success('Flight updated successfully');
      } else {
        await flightAPI.createFlight(submitData);
        toast.success('Flight created successfully');
      }
      navigate('/admin/flights');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save flight');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin/flights')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEdit ? 'Edit Flight' : 'Add New Flight'}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Flight ID & Airline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Flight ID *</label>
              <input
                type="text"
                name="flightId"
                value={formData.flightId}
                onChange={handleChange}
                className={`input-field ${errors.flightId ? 'border-red-500' : ''}`}
                placeholder="AA1234"
                disabled={isEdit}
              />
              {errors.flightId && <p className="mt-1 text-sm text-red-500">{errors.flightId}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Airline *</label>
              <input
                type="text"
                name="airline"
                value={formData.airline}
                onChange={handleChange}
                className={`input-field ${errors.airline ? 'border-red-500' : ''}`}
                placeholder="American Airlines"
              />
              {errors.airline && <p className="mt-1 text-sm text-red-500">{errors.airline}</p>}
            </div>
          </div>

          {/* Departure Airport */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Departure Airport *</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Code</label>
                <input
                  type="text"
                  name="departureAirport.code"
                  value={formData.departureAirport.code}
                  onChange={handleChange}
                  className={`input-field ${errors['departureAirport.code'] ? 'border-red-500' : ''}`}
                  placeholder="JFK"
                  maxLength={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  name="departureAirport.name"
                  value={formData.departureAirport.name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="John F. Kennedy International"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  name="departureAirport.city"
                  value={formData.departureAirport.city}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="New York"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                <input
                  type="text"
                  name="departureAirport.country"
                  value={formData.departureAirport.country}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="USA"
                />
              </div>
            </div>
          </div>

          {/* Arrival Airport */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Arrival Airport *</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Code</label>
                <input
                  type="text"
                  name="arrivalAirport.code"
                  value={formData.arrivalAirport.code}
                  onChange={handleChange}
                  className={`input-field ${errors['arrivalAirport.code'] ? 'border-red-500' : ''}`}
                  placeholder="LAX"
                  maxLength={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  name="arrivalAirport.name"
                  value={formData.arrivalAirport.name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Los Angeles International"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  name="arrivalAirport.city"
                  value={formData.arrivalAirport.city}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Los Angeles"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                <input
                  type="text"
                  name="arrivalAirport.country"
                  value={formData.arrivalAirport.country}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="USA"
                />
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Departure Date & Time *</label>
              <input
                type="datetime-local"
                name="departureDateTime"
                value={formData.departureDateTime}
                onChange={handleChange}
                className={`input-field ${errors.departureDateTime ? 'border-red-500' : ''}`}
              />
              {errors.departureDateTime && <p className="mt-1 text-sm text-red-500">{errors.departureDateTime}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Arrival Date & Time *</label>
              <input
                type="datetime-local"
                name="arrivalDateTime"
                value={formData.arrivalDateTime}
                onChange={handleChange}
                className={`input-field ${errors.arrivalDateTime ? 'border-red-500' : ''}`}
              />
              {errors.arrivalDateTime && <p className="mt-1 text-sm text-red-500">{errors.arrivalDateTime}</p>}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (Hours) - Auto-calculated</label>
            <input
              type="number"
              name="duration.hours"
              value={formData.duration.hours}
              onChange={handleChange}
              className="input-field bg-gray-50"
              min="0"
              max="24"
              step="0.1"
              readOnly
              title="Automatically calculated from departure and arrival times"
            />
          </div>

          {/* Flight Class & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Flight Class</label>
              <select
                name="flightClass"
                value={formData.flightClass}
                onChange={handleChange}
                className="input-field"
              >
                <option value="Economy">Economy</option>
                <option value="Business">Business</option>
                <option value="First">First</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Ticket Price ($) *</label>
              <input
                type="number"
                name="ticketPrice"
                value={formData.ticketPrice}
                onChange={handleChange}
                className={`input-field ${errors.ticketPrice ? 'border-red-500' : ''}`}
                min="0"
                step="0.01"
              />
              {errors.ticketPrice && <p className="mt-1 text-sm text-red-500">{errors.ticketPrice}</p>}
            </div>
          </div>

          {/* Seats */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Total Available Seats *</label>
              <input
                type="number"
                name="totalAvailableSeats"
                value={formData.totalAvailableSeats}
                onChange={handleChange}
                className={`input-field ${errors.totalAvailableSeats ? 'border-red-500' : ''}`}
                min="1"
                max="60"
              />
              {errors.totalAvailableSeats && <p className="mt-1 text-sm text-red-500">{errors.totalAvailableSeats}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Available Seats *</label>
              <input
                type="number"
                name="availableSeats"
                value={formData.availableSeats}
                onChange={handleChange}
                className={`input-field ${errors.availableSeats ? 'border-red-500' : ''}`}
                min="0"
                max={Math.min(60, formData.totalAvailableSeats || 60)}
              />
              {errors.availableSeats && <p className="mt-1 text-sm text-red-500">{errors.availableSeats}</p>}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/admin/flights')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center space-x-2"
            >
              {loading ? <LoadingSpinner size="sm" /> : <FaSave />}
              <span>{isEdit ? 'Update Flight' : 'Create Flight'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminFlightForm;

