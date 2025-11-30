import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FaChartLine, FaHotel, FaPlane, FaCar, FaUsers, FaDollarSign, FaSignOutAlt, FaBook, FaCalendarAlt, FaChartBar, FaEnvelope, FaPhone, FaIdBadge, FaShieldAlt, FaImage, FaSearch } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { fetchAnalytics, adminLogout, updateAdminProfile } from '../store/slices/adminSlice';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { LineChart, PieChart, RevenueChart } from '../components/ChartComponents';

const CATEGORY_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'flight', label: 'Flights' },
  { id: 'hotel', label: 'Hotels' },
  { id: 'car', label: 'Cars' },
];

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const { admin, analytics, loading } = useSelector((state) => state.admin);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [companySearch, setCompanySearch] = useState('');
  const profilePanelRef = useRef(null);

  useEffect(() => {
    dispatch(fetchAnalytics()).catch((error) => {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    });
  }, [dispatch, toast]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profilePanelRef.current && !profilePanelRef.current.contains(event.target)) {
        setShowProfilePanel(false);
      }
    };

    if (showProfilePanel) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfilePanel]);

  const handleLogout = () => {
    dispatch(adminLogout());
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  // Ensure analytics has default structure - MUST be defined before use
  const safeAnalytics = {
    stats: {
      totalRevenue: analytics?.stats?.totalRevenue || 0,
      totalBookings: analytics?.stats?.totalBookings || 0,
      totalUsers: analytics?.stats?.totalUsers || 0,
      totalFlights: analytics?.stats?.totalFlights || 0,
      totalHotels: analytics?.stats?.totalHotels || 0,
      totalCars: analytics?.stats?.totalCars || 0,
    },
    monthlyRevenue: analytics?.monthlyRevenue || [],
    monthlyBookings: analytics?.monthlyBookings || [],
    monthlyRevenueByType: analytics?.monthlyRevenueByType || {},
    monthlyBookingsByType: analytics?.monthlyBookingsByType || {},
    typeSummaries: analytics?.typeSummaries || {},
    bookingTypeDistribution: analytics?.bookingTypeDistribution || [],
    bookingStatusDistribution: analytics?.bookingStatusDistribution || [],
    topProperties: analytics?.topProperties || [],
    cityWiseRevenue: analytics?.cityWiseRevenue || [],
    topProviders: analytics?.topProviders || [],
  };
  
  const revenueDataForSegment =
    selectedCategory === 'all'
      ? safeAnalytics.monthlyRevenue
      : safeAnalytics.monthlyRevenueByType[selectedCategory] || [];
  const bookingDataForSegment =
    selectedCategory === 'all'
      ? safeAnalytics.monthlyBookings
      : safeAnalytics.monthlyBookingsByType[selectedCategory] || [];
  const segmentSummary =
    selectedCategory === 'all'
      ? {
          totalRevenue: safeAnalytics.stats.totalRevenue,
          totalBookings: safeAnalytics.stats.totalBookings,
          avgBookingValue:
            safeAnalytics.stats.totalBookings > 0
              ? safeAnalytics.stats.totalRevenue / safeAnalytics.stats.totalBookings
              : 0,
        }
      : safeAnalytics.typeSummaries[selectedCategory] || {
          totalRevenue: 0,
          totalBookings: 0,
          avgBookingValue: 0,
        };
  const filteredTopProviders =
    selectedCategory === 'all'
      ? safeAnalytics.topProviders
      : safeAnalytics.topProviders.filter((provider) => provider.type === selectedCategory);
  
  // Filter by company search
  const searchFilteredProviders = companySearch.trim()
    ? filteredTopProviders.filter(provider => 
        provider.name.toLowerCase().includes(companySearch.toLowerCase())
      )
    : filteredTopProviders;
  
  const isCityInsightVisible = selectedCategory === 'all' || selectedCategory === 'hotel';
  const showHotelSpecificInsights = selectedCategory === 'all' || selectedCategory === 'hotel';

  const statCards = [
    { 
      label: 'Total Revenue', 
      value: `$${safeAnalytics.stats.totalRevenue.toLocaleString()}`,
      icon: FaDollarSign, 
      color: 'from-green-500 to-green-600',
      change: '+12.5%'
    },
    { 
      label: 'Total Bookings', 
      value: safeAnalytics.stats.totalBookings.toLocaleString(),
      icon: FaChartLine, 
      color: 'from-blue-500 to-blue-600',
      change: '+8.2%'
    },
    { 
      label: 'Active Users', 
      value: safeAnalytics.stats.totalUsers.toLocaleString(),
      icon: FaUsers, 
      color: 'from-purple-500 to-purple-600',
      change: '+15.3%'
    },
    { 
      label: 'Total Properties', 
      value: (safeAnalytics.stats.totalHotels + safeAnalytics.stats.totalCars + safeAnalytics.stats.totalFlights).toLocaleString(),
      icon: FaHotel, 
      color: 'from-orange-500 to-orange-600',
      change: '+5.1%'
    },
  ];

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const adminProfile = {
    fullName: `${admin?.firstName || 'Admin'} ${admin?.lastName || ''}`.trim(),
    email: admin?.email || 'admin@kayak.com',
    phoneNumber: admin?.phoneNumber || admin?.phone || '+1 (000) 000-0000',
    role: admin?.role || 'Super Admin',
    adminId: admin?.adminId || admin?._id || 'Not assigned',
    lastLogin: admin?.lastLogin || admin?.updatedAt || null,
    firstName: admin?.firstName || '',
    lastName: admin?.lastName || '',
    address: admin?.address || '',
    city: admin?.city || '',
    state: admin?.state || '',
    zipCode: admin?.zipCode || '',
  };

  const adminInitial = adminProfile.fullName
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const [profileForm, setProfileForm] = useState({
    firstName: adminProfile.firstName,
    lastName: adminProfile.lastName,
    address: adminProfile.address,
    city: adminProfile.city,
    state: adminProfile.state,
    zipCode: adminProfile.zipCode,
    phoneNumber: adminProfile.phoneNumber,
    email: adminProfile.email,
    role: adminProfile.role,
    profileImage: admin?.profileImage || '',
  });

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (name === 'phoneNumber') {
      nextValue = value.replace(/\D/g, '').slice(0, 10);
    }
    setProfileForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Create canvas to compress image
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression (0.8 quality)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          
          setProfileForm((prev) => ({
            ...prev,
            profileImage: compressedBase64,
          }));
          toast.success('Image uploaded and compressed successfully');
        };
        img.onerror = () => {
          toast.error('Error loading image');
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!admin?._id && !admin?.adminId) {
      toast.error('Admin ID not found. Please re-login.');
      return;
    }

    const sanitizedPhone = (profileForm.phoneNumber || '').replace(/\D/g, '');
    if (!sanitizedPhone || sanitizedPhone.length !== 10) {
      toast.error('Phone number must contain exactly 10 digits.');
      return;
    }

    try {
      setIsSavingProfile(true);
      await dispatch(
        updateAdminProfile({
          id: admin?._id || admin?.adminId,
          data: {
            ...profileForm,
            phoneNumber: sanitizedPhone,
          },
        })
      ).unwrap();
      toast.success('Profile updated successfully');
      setShowProfilePanel(false);
    } catch (error) {
      toast.error(error || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  useEffect(() => {
    setProfileForm({
      firstName: adminProfile.firstName,
      lastName: adminProfile.lastName,
      address: adminProfile.address,
      city: adminProfile.city,
      state: adminProfile.state,
      zipCode: adminProfile.zipCode,
      phoneNumber: adminProfile.phoneNumber,
      email: adminProfile.email,
      role: adminProfile.role,
      profileImage: admin?.profileImage || '',
    });
  }, [adminProfile.firstName, adminProfile.lastName, adminProfile.address, adminProfile.city, adminProfile.state, adminProfile.zipCode, adminProfile.phoneNumber, adminProfile.email, adminProfile.role, admin?.profileImage]);

  // Show loading only on initial load
  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {admin?.firstName || 'Admin'} {admin?.lastName || ''}</p>
            </div>
            <div className="flex items-center space-x-3 relative" ref={profilePanelRef}>
              <button
                onClick={() => setShowProfilePanel((prev) => !prev)}
                className="flex items-center space-x-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {admin?.profileImage || profileForm.profileImage ? (
                  <img 
                    src={admin?.profileImage || profileForm.profileImage} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-kayak-blue to-blue-700 text-white flex items-center justify-center text-lg font-bold uppercase">
                    {adminInitial || 'AD'}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">{adminProfile.fullName || 'Admin'}</p>
                  <p className="text-xs text-gray-600">{adminProfile.role}</p>
                </div>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
              {showProfilePanel && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 top-16 w-[420px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-30"
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      {admin?.profileImage || profileForm.profileImage ? (
                        <img 
                          src={admin?.profileImage || profileForm.profileImage} 
                          alt="Profile" 
                          className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-lg"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-kayak-blue to-blue-700 text-white flex items-center justify-center text-2xl font-bold uppercase">
                          {adminInitial || 'AD'}
                        </div>
                      )}
                      <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-kayak-blue rounded-full border-2 border-white flex items-center justify-center cursor-pointer hover:bg-kayak-blue-dark transition-colors shadow-lg">
                        <FaImage className="text-white text-xs" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Account Owner</p>
                      <h3 className="text-lg font-semibold text-gray-900">{adminProfile.fullName || 'Admin'}</h3>
                      <p className="text-xs text-gray-500">Role: {adminProfile.role}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-4 text-sm max-h-[28rem] overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-xs uppercase text-gray-500 flex items-center space-x-2">
                          <FaIdBadge className="text-kayak-blue" />
                          <span>Admin ID</span>
                        </label>
                        <input
                          type="text"
                          value={adminProfile.adminId}
                          readOnly
                          className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs uppercase text-gray-500">First Name</label>
                        <input
                          type="text"
                          name="firstName"
                          value={profileForm.firstName}
                          onChange={handleProfileInputChange}
                          className="input-field mt-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase text-gray-500">Last Name</label>
                        <input
                          type="text"
                          name="lastName"
                          value={profileForm.lastName}
                          onChange={handleProfileInputChange}
                          className="input-field mt-1 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs uppercase text-gray-500">Address</label>
                      <input
                        type="text"
                        name="address"
                        value={profileForm.address}
                        onChange={handleProfileInputChange}
                        className="input-field mt-1 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs uppercase text-gray-500">City</label>
                        <input
                          type="text"
                          name="city"
                          value={profileForm.city}
                          onChange={handleProfileInputChange}
                          className="input-field mt-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase text-gray-500">State</label>
                        <input
                          type="text"
                          name="state"
                          value={profileForm.state}
                          onChange={handleProfileInputChange}
                          className="input-field mt-1 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs uppercase text-gray-500">Zip Code</label>
                        <input
                          type="text"
                          name="zipCode"
                          value={profileForm.zipCode}
                          onChange={handleProfileInputChange}
                          className="input-field mt-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase text-gray-500">Phone Number</label>
                        <input
                          type="text"
                          name="phoneNumber"
                          value={profileForm.phoneNumber}
                          onChange={handleProfileInputChange}
                          className="input-field mt-1 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs uppercase text-gray-500">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={adminProfile.email}
                        readOnly
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase text-gray-500">Role / Access Level</label>
                      <input
                        type="text"
                        value={adminProfile.role}
                        readOnly
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed text-sm capitalize"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-xs uppercase text-gray-500 flex items-center space-x-2">
                          <FaShieldAlt className="text-kayak-blue" />
                          <span>Last Login</span>
                        </label>
                        <input
                          type="text"
                          value={formatDateTime(adminProfile.lastLogin)}
                          readOnly
                          className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-end justify-end pt-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="btn-primary text-sm px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSavingProfile ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <button
              onClick={() => navigate('/admin/flights')}
              className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <FaPlane className="text-blue-600 text-xl" />
              <span className="font-semibold text-gray-900">Manage Flights</span>
            </button>
            <button
              onClick={() => navigate('/admin/hotels')}
              className="flex items-center space-x-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <FaHotel className="text-purple-600 text-xl" />
              <span className="font-semibold text-gray-900">Manage Hotels</span>
            </button>
            <button
              onClick={() => navigate('/admin/cars')}
              className="flex items-center space-x-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
            >
              <FaCar className="text-orange-600 text-xl" />
              <span className="font-semibold text-gray-900">Manage Cars</span>
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              className="flex items-center space-x-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <FaUsers className="text-green-600 text-xl" />
              <span className="font-semibold text-gray-900">Manage Users</span>
            </button>
            <button
              onClick={() => navigate('/admin/bookings')}
              className="flex items-center space-x-3 p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <FaBook className="text-indigo-600 text-xl" />
              <span className="font-semibold text-gray-900">View Bookings</span>
            </button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-green-600 mt-1">{stat.change} from last month</p>
                  </div>
                  <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="text-white text-xl" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Analytics Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Properties */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top Properties</h2>
            {showHotelSpecificInsights ? (
              safeAnalytics?.topProperties && safeAnalytics.topProperties.length > 0 ? (
                <div className="space-y-4">
                  {safeAnalytics.topProperties.map((property, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-900">{property.name}</p>
                        <p className="text-sm text-gray-600">{property.bookings} bookings</p>
                      </div>
                      <p className="text-lg font-bold text-green-600">${property.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No data available</p>
              )
            ) : (
              <p className="text-gray-500">Top properties are available for hotel bookings only.</p>
            )}
          </motion.div>

          {/* City Wise Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">City Wise Revenue</h2>
            {isCityInsightVisible ? (
              safeAnalytics?.cityWiseRevenue && safeAnalytics.cityWiseRevenue.length > 0 ? (
                <div className="space-y-4">
                  {safeAnalytics.cityWiseRevenue.map((city, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <FaHotel className="text-white" />
                        </div>
                        <p className="font-semibold text-gray-900">{city.city}</p>
                      </div>
                      <p className="text-lg font-bold text-blue-600">${city.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No data available</p>
              )
            ) : (
              <p className="text-gray-500">City-wise revenue is available for hotel bookings only.</p>
            )}
          </motion.div>
        </div>

        {/* Segment Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Segment Insights</h2>
              <p className="text-sm text-gray-600">Switch between booking categories to view focused revenue and booking trends.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedCategory(option.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                    selectedCategory === option.id
                      ? 'bg-kayak-blue text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs uppercase text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${segmentSummary.totalRevenue?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs uppercase text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {segmentSummary.totalBookings?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs uppercase text-gray-500">Avg Booking Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${Number(segmentSummary.avgBookingValue || 0).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-900">Revenue Trend</p>
                <FaChartBar className="text-green-600" />
              </div>
              <RevenueChart data={revenueDataForSegment} labelKey="month" valueKey="revenue" height={220} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-900">Bookings Trend</p>
                <FaCalendarAlt className="text-blue-600" />
              </div>
              <LineChart data={bookingDataForSegment} labelKey="month" valueKey="bookings" color="blue" height={220} />
            </div>
          </div>
        </motion.div>

        {/* Booking Type & Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Booking Type Distribution</h2>
            {safeAnalytics?.bookingTypeDistribution && safeAnalytics.bookingTypeDistribution.length > 0 ? (
              <PieChart
                data={safeAnalytics.bookingTypeDistribution}
                labelKey="type"
                valueKey="count"
                colors={['#3B82F6', '#8B5CF6', '#F59E0B']}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">No data available</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Booking Status Distribution</h2>
            {safeAnalytics?.bookingStatusDistribution && safeAnalytics.bookingStatusDistribution.length > 0 ? (
              <PieChart
                data={safeAnalytics.bookingStatusDistribution}
                labelKey="status"
                valueKey="count"
                colors={['#10B981', '#F59E0B', '#EF4444', '#6B7280']}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">No data available</p>
            )}
          </motion.div>
        </div>

        {/* Detailed Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Booking Type Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Booking Types</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FaPlane className="text-blue-600" />
                  <span className="text-sm text-gray-700">Flights</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{safeAnalytics?.stats?.totalFlights || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FaHotel className="text-purple-600" />
                  <span className="text-sm text-gray-700">Hotels</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{safeAnalytics?.stats?.totalHotels || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FaCar className="text-orange-600" />
                  <span className="text-sm text-gray-700">Cars</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{safeAnalytics?.stats?.totalCars || 0}</span>
              </div>
            </div>
          </motion.div>

          {/* Revenue Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Breakdown</h2>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">Total Revenue</span>
                  <span className="text-sm font-semibold text-gray-900">
                    ${safeAnalytics?.stats?.totalRevenue?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: '100%' }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">Total Bookings</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {safeAnalytics?.stats?.totalBookings?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: '100%' }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">Avg per Booking</span>
                  <span className="text-sm font-semibold text-gray-900">
                    ${safeAnalytics?.stats?.totalRevenue && safeAnalytics?.stats?.totalBookings
                      ? (safeAnalytics.stats.totalRevenue / safeAnalytics.stats.totalBookings).toFixed(2)
                      : '0'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Top Providers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Top Providers</h2>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  placeholder="Search company..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-kayak-blue focus:border-transparent w-48"
                />
              </div>
            </div>
            {searchFilteredProviders && searchFilteredProviders.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {searchFilteredProviders.map((provider, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{provider.name}</p>
                      <p className="text-xs text-gray-600 capitalize">
                        {provider.type || 'all'} • {provider.properties} bookings
                      </p>
                    </div>
                    <p className="text-sm font-bold text-green-600">${provider.revenue.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                {companySearch.trim() ? 'No providers found matching your search.' : 'No provider data available for this segment.'}
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
