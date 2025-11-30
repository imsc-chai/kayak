import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { billingAPI, userAPI } from '../../services/api';

export const createBooking = createAsyncThunk(
  'bookings/createBooking',
  async ({ userId, bookingData, billingData }, { rejectWithValue }) => {
    try {
      // Create billing record
      const billingResponse = await billingAPI.createBilling(billingData);
      if (!billingResponse.data.success) {
        const errorMsg = billingResponse.data.message || billingResponse.data.error || 'Failed to create billing';
        return rejectWithValue(errorMsg);
      }

      // NOTE:
      // We no longer write directly to the user's booking history here.
      // Instead, the Billing Service emits a Kafka `booking.created` event,
      // and the User Service consumes that event to update bookingHistory.
      // This avoids duplicate entries and makes the system fully event-driven.

      return { billing: billingResponse.data.data, booking: bookingData };
    } catch (error) {
      console.error('Booking error details:', error);
      const errorMsg = error.response?.data?.message || 
                      error.response?.data?.error || 
                      (error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : null) ||
                      error.message || 
                      'Failed to create booking';
      return rejectWithValue(errorMsg);
    }
  }
);

export const fetchUserBookings = createAsyncThunk(
  'bookings/fetchUserBookings',
  async ({ userId, params }, { rejectWithValue }) => {
    try {
      const response = await userAPI.getBookings(userId, params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch bookings');
    }
  }
);

const initialState = {
  bookings: [],
  currentBooking: null,
  loading: false,
  error: null,
};

const bookingSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    clearBookings: (state) => {
      state.bookings = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBooking = action.payload;
        state.bookings.push(action.payload.booking);
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchUserBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload.data;
      })
      .addCase(fetchUserBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearBookings, clearError } = bookingSlice.actions;
export default bookingSlice.reducer;

