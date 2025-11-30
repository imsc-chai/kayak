import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FaFileInvoiceDollar, FaPlane, FaHotel, FaCar, FaCalendarAlt, FaCreditCard, FaCheckCircle, FaTimesCircle, FaSpinner, FaDownload, FaPrint, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { billingAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Billing = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useSelector((state) => state.auth);
  const [billings, setBillings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, completed, pending, cancelled
  const [selectedBilling, setSelectedBilling] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const profileUserId = user?.userId || user?._id || user?.id || 'N/A';
  const profileEmail = user?.email || user?.username || 'N/A';

  useEffect(() => {
    if (user?._id || user?.id) {
      fetchBillings();
    } else {
      navigate('/login');
    }
  }, [user]);

  const fetchBillings = async () => {
    try {
      setLoading(true);
      const userId = user?._id || user?.id;
      const params = { userId };
      if (filter !== 'all') {
        params.status = filter;
      }
      const response = await billingAPI.getBillings(params);
      if (response.data.success) {
        setBillings(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching billings:', error);
      toast.error('Failed to load billing information');
      setBillings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?._id || user?.id) {
      fetchBillings();
    }
  }, [filter]);

  const filteredBillings = billings.filter((billing) => {
    if (filter === 'all') return true;
    return billing.transactionStatus === filter;
  });

  const handleViewDetails = (billing) => {
    setSelectedBilling(billing);
    setShowDetailsModal(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="text-green-500" />;
      case 'pending':
        return <FaSpinner className="text-yellow-500 animate-spin" />;
      case 'refunded':
        return <FaCheckCircle className="text-blue-500" />;
      case 'failed':
      case 'cancelled':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaSpinner className="text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getBookingTypeIcon = (type) => {
    switch (type) {
      case 'flight':
        return <FaPlane className="text-kayak-blue" />;
      case 'hotel':
        return <FaHotel className="text-kayak-blue" />;
      case 'car':
        return <FaCar className="text-kayak-blue" />;
      default:
        return <FaFileInvoiceDollar className="text-kayak-blue" />;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatReceiptDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatReceiptTime = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const receiptRef = useRef(null);

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank');
      const receiptHTML = receiptRef.current.innerHTML;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Booking Receipt - ${selectedBilling?.invoiceDetails?.invoiceNumber || selectedBilling?.billingId}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Arial', 'Helvetica', sans-serif; 
                color: #1f2937;
                line-height: 1.6;
                padding: 40px;
                background: white;
              }
              .no-print { display: none !important; }
              h1, h2, h3 { color: #1e40af; }
              .border-b-4 { border-bottom: 4px solid #1e40af; }
              .border-2 { border: 2px solid; }
              .border-gray-300 { border-color: #d1d5db; }
              .border-gray-200 { border-color: #e5e7eb; }
              .bg-gray-50 { background-color: #f9fafb; }
              .bg-gray-100 { background-color: #f3f4f6; }
              .text-kayak-blue { color: #1e40af; }
              .text-gray-900 { color: #111827; }
              .text-gray-600 { color: #4b5563; }
              .text-gray-700 { color: #374151; }
              .font-bold { font-weight: 700; }
              .font-semibold { font-weight: 600; }
              .font-medium { font-weight: 500; }
              .rounded-lg { border-radius: 0.5rem; }
              .p-5 { padding: 1.25rem; }
              .p-6 { padding: 1.5rem; }
              .p-8 { padding: 2rem; }
              .mb-2 { margin-bottom: 0.5rem; }
              .mb-3 { margin-bottom: 0.75rem; }
              .mb-4 { margin-bottom: 1rem; }
              .mb-6 { margin-bottom: 1.5rem; }
              .mb-8 { margin-bottom: 2rem; }
              .mt-3 { margin-top: 0.75rem; }
              .mt-4 { margin-top: 1rem; }
              .mt-8 { margin-top: 2rem; }
              .pt-2 { padding-top: 0.5rem; }
              .pt-6 { padding-top: 1.5rem; }
              .pb-2 { padding-bottom: 0.5rem; }
              .pb-6 { padding-bottom: 1.5rem; }
              .space-y-2 > * + * { margin-top: 0.5rem; }
              .space-y-3 > * + * { margin-top: 0.75rem; }
              .grid { display: grid; }
              .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .gap-4 { gap: 1rem; }
              .gap-8 { gap: 2rem; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .justify-center { justify-content: center; }
              .items-center { align-items: center; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .text-left { text-align: left; }
              .text-sm { font-size: 0.875rem; }
              .text-base { font-size: 1rem; }
              .text-lg { font-size: 1.125rem; }
              .text-xl { font-size: 1.25rem; }
              .text-2xl { font-size: 1.5rem; }
              .text-4xl { font-size: 2.25rem; }
              .uppercase { text-transform: uppercase; }
              .capitalize { text-transform: capitalize; }
              .font-mono { font-family: 'Courier New', monospace; }
              .break-all { word-break: break-all; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 0.75rem 1.5rem; }
              thead { background-color: #1e40af; color: white; }
              tbody tr { border-bottom: 1px solid #e5e7eb; }
              tbody tr:hover { background-color: #f9fafb; }
              @media print {
                body { padding: 20px; }
                @page { margin: 1cm; }
              }
            </style>
          </head>
          <body>
            <div style="max-width: 800px; margin: 0 auto;">
              ${receiptHTML}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        // Don't close immediately, let user see the print preview
      }, 500);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Billing History</h1>
          <p className="text-gray-600">View all your transaction and billing information</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['all', 'completed', 'pending', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-kayak-blue text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Billing List */}
        {filteredBillings.length > 0 ? (
          <div className="grid gap-4">
            {filteredBillings.map((billing, index) => (
              <motion.div
                key={billing._id || billing.billingId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="mt-1">
                      {getBookingTypeIcon(billing.bookingType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {billing.bookingType.charAt(0).toUpperCase() + billing.bookingType.slice(1)} Booking
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(billing.transactionStatus)}`}>
                          {getStatusIcon(billing.transactionStatus)}
                          <span>{billing.transactionStatus.charAt(0).toUpperCase() + billing.transactionStatus.slice(1)}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <FaFileInvoiceDollar className="text-gray-400" />
                          <span>Invoice: {billing.invoiceDetails?.invoiceNumber || billing.billingId}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FaCalendarAlt className="text-gray-400" />
                          <span>{formatDate(billing.dateOfTransaction)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FaCreditCard className="text-gray-400" />
                          <span>{billing.paymentMethod}</span>
                        </div>
                      </div>
                      {billing.invoiceDetails?.items && billing.invoiceDetails.items.length > 0 && (
                        <div className="mt-3 text-sm text-gray-600">
                          <p className="font-medium">
                            {billing.invoiceDetails.items[0].description}
                            {billing.invoiceDetails.items[0].quantity > 1 && ` (x${billing.invoiceDetails.items[0].quantity})`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2 ml-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-kayak-blue">
                        {formatCurrency(billing.totalAmountPaid)}
                      </p>
                      {billing.refundDetails && billing.refundDetails.refundAmount > 0 && (
                        <p className="text-sm text-red-600 mt-1">
                          Refunded: {formatCurrency(billing.refundDetails.refundAmount)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleViewDetails(billing)}
                      className="text-sm text-kayak-blue hover:text-kayak-blue-dark font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <FaFileInvoiceDollar className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No billing records found</h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? "You haven't made any bookings yet. Your billing information will appear here once you complete a booking."
                : `No ${filter} transactions found.`}
            </p>
          </div>
        )}

        {/* Details Modal - Official Receipt */}
        {showDetailsModal && selectedBilling && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto"
            >
              {/* Action Bar */}
              <div className="sticky top-0 bg-gradient-to-r from-kayak-blue to-kayak-blue-dark text-white px-6 py-4 flex items-center justify-between z-10 no-print">
                <h2 className="text-xl font-bold">Official Booking Receipt</h2>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handlePrint}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <FaPrint />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-colors"
                  >
                    <FaTimesCircle className="text-xl" />
                  </button>
                </div>
              </div>

              {/* Receipt Content */}
              <div ref={receiptRef} className="p-8 bg-white">
                {/* Receipt Header */}
                <div className="border-b-4 border-kayak-blue pb-6 mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h1 className="text-4xl font-bold text-kayak-blue mb-2">KAYAK</h1>
                      <p className="text-gray-600 text-sm">Your Travel Companion</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Receipt Number</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {selectedBilling.invoiceDetails?.invoiceNumber || selectedBilling.billingId}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatReceiptDate(selectedBilling.dateOfTransaction)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getBookingTypeIcon(selectedBilling.bookingType)}
                    <span className="text-lg font-semibold text-gray-900 capitalize">
                      {selectedBilling.bookingType} Booking Receipt
                    </span>
                    <span className={`ml-auto px-4 py-1 rounded-full text-sm font-medium flex items-center space-x-2 ${getStatusColor(selectedBilling.transactionStatus)}`}>
                      {getStatusIcon(selectedBilling.transactionStatus)}
                      <span>{selectedBilling.transactionStatus.charAt(0).toUpperCase() + selectedBilling.transactionStatus.slice(1)}</span>
                    </span>
                  </div>
                </div>

                {/* Company & Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  {/* Company Information */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">From</h3>
                    <div className="space-y-2 text-sm">
                      <p className="font-bold text-gray-900 text-base">Kayak Travel Services</p>
                      <p className="text-gray-600 flex items-center">
                        <FaMapMarkerAlt className="mr-2 text-kayak-blue" />
                        123 Travel Street, Suite 100
                      </p>
                      <p className="text-gray-600 pl-6">San Francisco, CA 94102, USA</p>
                      <p className="text-gray-600 flex items-center mt-3">
                        <FaPhone className="mr-2 text-kayak-blue" />
                        +1 (555) 123-4567
                      </p>
                      <p className="text-gray-600 flex items-center">
                        <FaEnvelope className="mr-2 text-kayak-blue" />
                        support@kayak.com
                      </p>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Bill To</h3>
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold text-gray-900">
                        {user?.firstName && user?.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user?.username || 'Customer'}
                      </p>
                      <p className="text-gray-600 break-all">
                        {profileEmail}
                      </p>
                      <p className="text-gray-600 text-xs mt-3">
                        Customer ID: <span className="font-mono">{profileUserId}</span>
                      </p>
                      {user?.phoneNumber && (
                        <p className="text-gray-600">
                          Phone: {user.phoneNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Booking Information */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Booking Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Booking Type</p>
                      <p className="font-semibold text-gray-900 capitalize">{selectedBilling.bookingType}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Booking ID</p>
                      <p className="font-semibold text-gray-900 font-mono">{selectedBilling.bookingId}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Transaction Date</p>
                      <p className="font-semibold text-gray-900">{formatReceiptDate(selectedBilling.dateOfTransaction)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Transaction Time</p>
                      <p className="font-semibold text-gray-900">{formatReceiptTime(selectedBilling.dateOfTransaction)}</p>
                    </div>
                  </div>
                </div>
                {/* Invoice Header */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Invoice Number</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedBilling.invoiceDetails?.invoiceNumber || selectedBilling.billingId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Billing ID</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedBilling.billingId}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="text-base font-medium text-gray-900">
                        {formatDate(selectedBilling.dateOfTransaction)}
                      </p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2 ${getStatusColor(selectedBilling.transactionStatus)}`}>
                      {getStatusIcon(selectedBilling.transactionStatus)}
                      <span>{selectedBilling.transactionStatus.charAt(0).toUpperCase() + selectedBilling.transactionStatus.slice(1)}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-600">User ID</p>
                      <p className="text-base font-medium text-gray-900 break-all">
                        {profileUserId}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">User Email</p>
                      <p className="text-base font-medium text-gray-900 break-all">
                        {profileEmail}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Booking Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Booking Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Booking Type</p>
                      <p className="text-base font-medium text-gray-900 capitalize">
                        {selectedBilling.bookingType}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Booking ID</p>
                      <p className="text-base font-medium text-gray-900">
                        {selectedBilling.bookingId}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Invoice Items */}
                {selectedBilling.invoiceDetails?.items && selectedBilling.invoiceDetails.items.length > 0 ? (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Itemized Charges</h3>
                    <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-kayak-blue text-white">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold uppercase">Description</th>
                            <th className="px-6 py-4 text-center text-sm font-semibold uppercase">Quantity</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold uppercase">Unit Price</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold uppercase">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedBilling.invoiceDetails.items.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm text-gray-900 font-medium">{item.description}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 text-center">{item.quantity}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 text-right">{formatCurrency(item.price)}</td>
                              <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Booking Summary</h3>
                    <div className="bg-gray-50 rounded-lg p-5">
                      <p className="text-gray-700">
                        <span className="font-semibold capitalize">{selectedBilling.bookingType}</span> Booking - {selectedBilling.bookingId}
                      </p>
                    </div>
                  </div>
                )}

                {/* Payment Summary */}
                <div className="mb-8">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6 border-2 border-gray-300">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
                    <div className="space-y-3 max-w-md ml-auto">
                      {selectedBilling.invoiceDetails?.subtotal !== undefined && selectedBilling.invoiceDetails.subtotal > 0 && (
                        <div className="flex justify-between text-base">
                          <span className="text-gray-700">Subtotal</span>
                          <span className="text-gray-900 font-medium">{formatCurrency(selectedBilling.invoiceDetails.subtotal)}</span>
                        </div>
                      )}
                      {selectedBilling.invoiceDetails?.tax > 0 && (
                        <div className="flex justify-between text-base">
                          <span className="text-gray-700">Tax & Fees</span>
                          <span className="text-gray-900 font-medium">{formatCurrency(selectedBilling.invoiceDetails.tax)}</span>
                        </div>
                      )}
                      {selectedBilling.invoiceDetails?.discount > 0 && (
                        <div className="flex justify-between text-base">
                          <span className="text-gray-700">Discount</span>
                          <span className="text-green-600 font-medium">-{formatCurrency(selectedBilling.invoiceDetails.discount)}</span>
                        </div>
                      )}
                      <div className="border-t-2 border-gray-400 pt-3 mt-3 flex justify-between">
                        <span className="text-lg font-bold text-gray-900">Total Amount Paid</span>
                        <span className="text-2xl font-bold text-kayak-blue">{formatCurrency(selectedBilling.totalAmountPaid)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Payment Information</h3>
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <div className="flex items-start space-x-4">
                      <div className="bg-kayak-blue text-white p-3 rounded-lg">
                        <FaCreditCard className="text-2xl" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-semibold text-gray-900 mb-2">{selectedBilling.paymentMethod}</p>
                        {selectedBilling.paymentDetails && (
                          <div className="space-y-1 text-sm text-gray-600">
                            {selectedBilling.paymentDetails.cardLast4 && (
                              <p>Card ending in: <span className="font-mono font-semibold">****{selectedBilling.paymentDetails.cardLast4}</span></p>
                            )}
                            {selectedBilling.paymentDetails.cardType && (
                              <p>Card Type: <span className="font-semibold">{selectedBilling.paymentDetails.cardType}</span></p>
                            )}
                            {selectedBilling.paymentDetails.expiryDate && (
                              <p>Expiry: <span className="font-semibold">{selectedBilling.paymentDetails.expiryDate}</span></p>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-3">
                          Payment Status: <span className={`font-semibold ${selectedBilling.transactionStatus === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {selectedBilling.transactionStatus.charAt(0).toUpperCase() + selectedBilling.transactionStatus.slice(1)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Refund Information */}
                {selectedBilling.refundDetails && selectedBilling.refundDetails.refundAmount > 0 && (
                  <div className="mb-8 bg-blue-50 border-2 border-blue-300 rounded-lg p-5">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                      <FaCheckCircle className="mr-2" />
                      Refund Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-blue-700 mb-1">Refund Amount</p>
                        <p className="font-bold text-blue-900 text-lg">{formatCurrency(selectedBilling.refundDetails.refundAmount)}</p>
                      </div>
                      {selectedBilling.refundDetails.refundDate && (
                        <div>
                          <p className="text-blue-700 mb-1">Refund Date</p>
                          <p className="font-semibold text-blue-900">{formatReceiptDate(selectedBilling.refundDetails.refundDate)}</p>
                        </div>
                      )}
                      {selectedBilling.refundDetails.reason && (
                        <div className="md:col-span-2">
                          <p className="text-blue-700 mb-1">Reason</p>
                          <p className="text-blue-900 font-medium">{selectedBilling.refundDetails.reason}</p>
                        </div>
                      )}
                      {selectedBilling.refundDetails.status && (
                        <div>
                          <p className="text-blue-700 mb-1">Refund Status</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            selectedBilling.refundDetails.status === 'completed' ? 'bg-green-100 text-green-800' :
                            selectedBilling.refundDetails.status === 'processed' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {selectedBilling.refundDetails.status.charAt(0).toUpperCase() + selectedBilling.refundDetails.status.slice(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Receipt Footer */}
                <div className="border-t-2 border-gray-300 pt-6 mt-8">
                  <div className="text-center space-y-3">
                    <p className="text-sm text-gray-600">
                      Thank you for choosing <span className="font-bold text-kayak-blue">KAYAK</span> for your travel needs!
                    </p>
                    <div className="flex justify-center items-center space-x-6 text-xs text-gray-500">
                      <p>Questions? Contact us at support@kayak.com</p>
                      <p>•</p>
                      <p>+1 (555) 123-4567</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">
                      This is an official receipt for your records. Please keep this receipt for your reference.
                    </p>
                    <p className="text-xs text-gray-400">
                      Receipt ID: <span className="font-mono">{selectedBilling.billingId}</span> | 
                      Invoice: <span className="font-mono">{selectedBilling.invoiceDetails?.invoiceNumber || 'N/A'}</span>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Billing;

