import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaArrowLeft, FaSearch, FaFilter, FaCalendarAlt, FaUser, FaDollarSign, FaTimes, FaFileInvoiceDollar, FaCreditCard, FaReceipt, FaInfoCircle, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';
import { billingAPI } from '../services/api';

// Create admin user API instance
const adminUserApi = axios.create({
  baseURL: 'http://localhost:5001/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

adminUserApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const AdminBookings = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [selectedBilling, setSelectedBilling] = useState(null);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [loadingBillingDetails, setLoadingBillingDetails] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, filterType, filterStatus]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      // Fetch from billing service
      const billingResponse = await billingAPI.getBillings({ limit: 1000, page: 1 });
      if (billingResponse.data.success) {
        setBookings(billingResponse.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = [...bookings];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.bookingId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.bookingType?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(booking => booking.bookingType === filterType);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(booking => booking.transactionStatus === filterStatus);
    }

    setFilteredBookings(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'failed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'flight':
        return '✈️';
      case 'hotel':
        return '🏨';
      case 'car':
        return '🚗';
      default:
        return '📋';
    }
  };

  const handleRowClick = async (booking) => {
    try {
      setLoadingBillingDetails(true);
      setLoadingUserDetails(true);
      setShowBillingModal(true);
      setUserDetails(null);
      
      // Fetch full billing details by ID
      const billingId = booking._id || booking.billingId;
      if (billingId) {
        const response = await billingAPI.getBilling(billingId);
        if (response.data.success) {
          setSelectedBilling(response.data.data);
        } else {
          toast.error('Failed to fetch billing details');
          setSelectedBilling(booking); // Fallback to the booking data we have
        }
      } else {
        setSelectedBilling(booking); // Use the booking data we have
      }

      // Fetch user details
      const userId = booking.userId || selectedBilling?.userId;
      if (userId) {
        try {
          const userResponse = await adminUserApi.get(`/users/${userId}`);
          if (userResponse.data.success) {
            setUserDetails(userResponse.data.data);
          }
        } catch (userError) {
          console.error('Error fetching user details:', userError);
          // Don't show error toast for user details, just log it
        }
      }
    } catch (error) {
      console.error('Error fetching billing details:', error);
      toast.error('Failed to fetch billing details');
      setSelectedBilling(booking); // Fallback to the booking data we have
    } finally {
      setLoadingBillingDetails(false);
      setLoadingUserDetails(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaArrowLeft className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Manage Bookings</h1>
                <p className="text-gray-600 mt-1">Total: {filteredBookings.length} bookings</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by booking ID, user ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10 w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Booking Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input-field w-full"
              >
                <option value="all">All Types</option>
                <option value="flight">Flights</option>
                <option value="hotel">Hotels</option>
                <option value="car">Cars</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field w-full"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((booking) => (
                    <tr 
                      key={booking._id || booking.bookingId} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(booking)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {booking.bookingId || booking._id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getTypeIcon(booking.bookingType)}</span>
                          <span className="text-sm text-gray-900 capitalize">{booking.bookingType || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {booking.userId || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {booking.dateOfTransaction ? new Date(booking.dateOfTransaction).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        ${booking.totalAmountPaid || booking.amount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.transactionStatus)}`}>
                          {booking.transactionStatus || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {booking.paymentMethod || 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                        ? 'No bookings found matching your filters'
                        : 'No bookings available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${filteredBookings.reduce((sum, b) => sum + (b.totalAmountPaid || 0), 0).toLocaleString()}
                </p>
              </div>
              <FaDollarSign className="text-green-600 text-2xl" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredBookings.filter(b => b.transactionStatus === 'completed').length}
                </p>
              </div>
              <FaBook className="text-green-600 text-2xl" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredBookings.filter(b => b.transactionStatus === 'pending').length}
                </p>
              </div>
              <FaCalendarAlt className="text-yellow-600 text-2xl" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredBookings.filter(b => b.transactionStatus === 'cancelled').length}
                </p>
              </div>
              <FaUser className="text-red-600 text-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Billing Details Modal */}
      {showBillingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowBillingModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                <FaFileInvoiceDollar className="text-blue-600" />
                <span>Billing Information</span>
              </h2>
              <button
                onClick={() => setShowBillingModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaTimes className="text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {loadingBillingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : selectedBilling ? (
                <div className="space-y-6">
                  {/* User Information */}
                  {loadingUserDetails ? (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-center py-4">
                        <LoadingSpinner />
                        <span className="ml-3 text-gray-600">Loading user information...</span>
                      </div>
                    </div>
                  ) : userDetails ? (
                    <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <FaUser className="text-blue-600" />
                        <span>User Information</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Full Name</p>
                          <p className="text-base font-semibold text-gray-900">
                            {userDetails.firstName && userDetails.lastName 
                              ? `${userDetails.firstName} ${userDetails.lastName}`
                              : userDetails.firstName || userDetails.lastName || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="text-base font-medium text-gray-900 flex items-center space-x-2">
                            <FaEnvelope className="text-gray-400" />
                            <span>{userDetails.email || 'N/A'}</span>
                          </p>
                        </div>
                        {userDetails.phoneNumber && (
                          <div>
                            <p className="text-sm text-gray-600">Phone Number</p>
                            <p className="text-base font-medium text-gray-900 flex items-center space-x-2">
                              <FaPhone className="text-gray-400" />
                              <span>{userDetails.phoneNumber}</span>
                            </p>
                          </div>
                        )}
                        {userDetails.address && (
                          <div>
                            <p className="text-sm text-gray-600">Address</p>
                            <p className="text-base font-medium text-gray-900 flex items-center space-x-2">
                              <FaMapMarkerAlt className="text-gray-400" />
                              <span>
                                {userDetails.address}
                                {userDetails.city && `, ${userDetails.city}`}
                                {userDetails.state && `, ${userDetails.state}`}
                                {userDetails.zipCode && ` ${userDetails.zipCode}`}
                              </span>
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-600">User ID</p>
                          <p className="text-base font-medium text-gray-600">{selectedBilling.userId || userDetails._id || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <FaUser className="text-blue-600" />
                        <span>User Information</span>
                      </h3>
                      <div>
                        <p className="text-sm text-gray-600">User ID</p>
                        <p className="text-base font-medium text-gray-900">{selectedBilling.userId || 'N/A'}</p>
                        <p className="text-sm text-gray-500 mt-2">User details not available</p>
                      </div>
                    </div>
                  )}

                  {/* Basic Information */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <FaInfoCircle className="text-blue-600" />
                      <span>Booking Information</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Billing ID</p>
                        <p className="text-base font-medium text-gray-900">{selectedBilling.billingId || selectedBilling._id || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Booking ID</p>
                        <p className="text-base font-medium text-gray-900">{selectedBilling.bookingId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Booking Type</p>
                        <p className="text-base font-medium text-gray-900 capitalize">{selectedBilling.bookingType || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Transaction Date</p>
                        <p className="text-base font-medium text-gray-900">{formatDate(selectedBilling.dateOfTransaction)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Transaction Status</p>
                        <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedBilling.transactionStatus)}`}>
                          {selectedBilling.transactionStatus || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <FaCreditCard className="text-blue-600" />
                      <span>Payment Information</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Amount Paid</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(selectedBilling.totalAmountPaid || selectedBilling.amount || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Payment Method</p>
                        <p className="text-base font-medium text-gray-900">{selectedBilling.paymentMethod || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Details */}
                  {selectedBilling.invoiceDetails && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <FaFileInvoiceDollar className="text-blue-600" />
                        <span>Invoice Details</span>
                      </h3>
                      <div className="space-y-4">
                        {selectedBilling.invoiceDetails.invoiceNumber && (
                          <div>
                            <p className="text-sm text-gray-600">Invoice Number</p>
                            <p className="text-base font-medium text-gray-900">{selectedBilling.invoiceDetails.invoiceNumber}</p>
                          </div>
                        )}
                        {selectedBilling.invoiceDetails.items && selectedBilling.invoiceDetails.items.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">Invoice Items</p>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Quantity</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Price</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {selectedBilling.invoiceDetails.items.map((item, index) => (
                                    <tr key={index}>
                                      <td className="px-4 py-2 text-sm text-gray-900">{item.description || 'N/A'}</td>
                                      <td className="px-4 py-2 text-sm text-gray-600">{item.quantity || 0}</td>
                                      <td className="px-4 py-2 text-sm text-gray-600">{formatCurrency(item.price || 0)}</td>
                                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{formatCurrency(item.total || 0)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                          {selectedBilling.invoiceDetails.subtotal !== undefined && (
                            <div>
                              <p className="text-sm text-gray-600">Subtotal</p>
                              <p className="text-base font-medium text-gray-900">{formatCurrency(selectedBilling.invoiceDetails.subtotal)}</p>
                            </div>
                          )}
                          {selectedBilling.invoiceDetails.tax !== undefined && (
                            <div>
                              <p className="text-sm text-gray-600">Tax</p>
                              <p className="text-base font-medium text-gray-900">{formatCurrency(selectedBilling.invoiceDetails.tax)}</p>
                            </div>
                          )}
                          {selectedBilling.invoiceDetails.discount !== undefined && selectedBilling.invoiceDetails.discount > 0 && (
                            <div>
                              <p className="text-sm text-gray-600">Discount</p>
                              <p className="text-base font-medium text-green-600">-{formatCurrency(selectedBilling.invoiceDetails.discount)}</p>
                            </div>
                          )}
                          {selectedBilling.invoiceDetails.total !== undefined && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700">Total</p>
                              <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedBilling.invoiceDetails.total)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Receipt Details */}
                  {selectedBilling.receiptDetails && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <FaReceipt className="text-blue-600" />
                        <span>Receipt Details</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedBilling.receiptDetails.receiptNumber && (
                          <div>
                            <p className="text-sm text-gray-600">Receipt Number</p>
                            <p className="text-base font-medium text-gray-900">{selectedBilling.receiptDetails.receiptNumber}</p>
                          </div>
                        )}
                        {selectedBilling.receiptDetails.issuedDate && (
                          <div>
                            <p className="text-sm text-gray-600">Issued Date</p>
                            <p className="text-base font-medium text-gray-900">{formatDate(selectedBilling.receiptDetails.issuedDate)}</p>
                          </div>
                        )}
                        {selectedBilling.receiptDetails.pdfUrl && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-600">PDF URL</p>
                            <a 
                              href={selectedBilling.receiptDetails.pdfUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-base font-medium text-blue-600 hover:underline"
                            >
                              {selectedBilling.receiptDetails.pdfUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Refund Details */}
                  {selectedBilling.refundDetails && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <FaDollarSign className="text-blue-600" />
                        <span>Refund Details</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedBilling.refundDetails.refundAmount !== undefined && (
                          <div>
                            <p className="text-sm text-gray-600">Refund Amount</p>
                            <p className="text-xl font-bold text-red-600">{formatCurrency(selectedBilling.refundDetails.refundAmount)}</p>
                          </div>
                        )}
                        {selectedBilling.refundDetails.refundDate && (
                          <div>
                            <p className="text-sm text-gray-600">Refund Date</p>
                            <p className="text-base font-medium text-gray-900">{formatDate(selectedBilling.refundDetails.refundDate)}</p>
                          </div>
                        )}
                        {selectedBilling.refundDetails.reason && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-600">Reason</p>
                            <p className="text-base font-medium text-gray-900">{selectedBilling.refundDetails.reason}</p>
                          </div>
                        )}
                        {selectedBilling.refundDetails.status && (
                          <div>
                            <p className="text-sm text-gray-600">Refund Status</p>
                            <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                              selectedBilling.refundDetails.status === 'completed' ? 'bg-green-100 text-green-800' :
                              selectedBilling.refundDetails.status === 'processed' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {selectedBilling.refundDetails.status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Timestamps</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedBilling.createdAt && (
                        <div>
                          <p className="text-sm text-gray-600">Created At</p>
                          <p className="text-base font-medium text-gray-900">{formatDate(selectedBilling.createdAt)}</p>
                        </div>
                      )}
                      {selectedBilling.updatedAt && (
                        <div>
                          <p className="text-sm text-gray-600">Last Updated</p>
                          <p className="text-base font-medium text-gray-900">{formatDate(selectedBilling.updatedAt)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No billing information available</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowBillingModal(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;

