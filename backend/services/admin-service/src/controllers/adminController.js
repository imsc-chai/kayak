const Admin = require('../models/Admin');
const AnalyticsClick = require('../models/AnalyticsClick');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const axios = require('axios');
const { getCache, setCache, deleteCache, deleteCacheByPattern, recordCacheMiss, calculateSpeedup } = require('@kayak/shared/redis');

const generateToken = (adminId) => {
  return jwt.sign({ adminId }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken(admin._id);
    res.json({ success: true, message: 'Login successful', data: { admin: admin.toJSON(), token } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error logging in', error: error.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const requestStartTime = Date.now();
    
    // Create cache key from query parameters
    const cacheKey = `admin:analytics:${JSON.stringify({ startDate, endDate })}`;
    
    // Try to get from cache first
    const cacheResult = await getCache(cacheKey);
    if (cacheResult && cacheResult.value) {
      const totalTime = Date.now() - requestStartTime;
      const speedup = calculateSpeedup(cacheKey, totalTime);
      const speedupText = speedup ? ` | ${speedup}` : '';
      console.log(`✅ [Cache HIT] Analytics (${startDate || 'all'} - ${endDate || 'all'}) | Redis: ${cacheResult.time}ms | Total: ${totalTime}ms${speedupText}`);
      return res.json({
        success: true,
        data: cacheResult.value,
        cached: true
      });
    }
    
    const servicesStartTime = Date.now();
    console.log(`❌ [Cache MISS] Analytics (${startDate || 'all'} - ${endDate || 'all'}) - fetching from services`);
    
    // Fetch data from all services in parallel
    const [usersRes, flightsRes, hotelsRes, carsRes, revenueRes] = await Promise.allSettled([
      axios.get('http://localhost:5001/api/users?limit=1').catch(() => ({ data: { data: [] } })),
      axios.get('http://localhost:5002/api/flights?limit=1').catch(() => ({ data: { data: [] } })),
      axios.get('http://localhost:5003/api/hotels?limit=1').catch(() => ({ data: { data: [] } })),
      axios.get('http://localhost:5004/api/cars?limit=1').catch(() => ({ data: { data: [] } })),
      axios.get(`http://localhost:5005/api/billing/stats/revenue${startDate || endDate ? `?startDate=${startDate || ''}&endDate=${endDate || ''}` : ''}`).catch(() => ({ data: { data: { totalRevenue: 0, totalTransactions: 0 } } }))
    ]);

    // Get counts from each service using API calls with large limits
    let totalUsers = 0;
    let totalFlights = 0;
    let totalHotels = 0;
    let totalCars = 0;
    
    try {
      const usersData = await axios.get('http://localhost:5001/api/users?limit=10000').catch(() => ({ data: { data: [] } }));
      totalUsers = usersData.data?.data?.length || 0;
    } catch (err) {
      console.error('Error counting users:', err.message);
    }
    
    try {
      const flightsData = await axios.get('http://localhost:5002/api/flights?limit=10000').catch(() => ({ data: { data: [] } }));
      totalFlights = flightsData.data?.data?.length || 0;
    } catch (err) {
      console.error('Error counting flights:', err.message);
    }
    
    try {
      const hotelsData = await axios.get('http://localhost:5003/api/hotels?limit=10000').catch(() => ({ data: { data: [] } }));
      totalHotels = hotelsData.data?.data?.length || 0;
    } catch (err) {
      console.error('Error counting hotels:', err.message);
    }
    
    try {
      const carsData = await axios.get('http://localhost:5004/api/cars?limit=10000').catch(() => ({ data: { data: [] } }));
      totalCars = carsData.data?.data?.length || 0;
    } catch (err) {
      console.error('Error counting cars:', err.message);
    }
    const revenueData = revenueRes.status === 'fulfilled' ? revenueRes.value.data.data : { totalRevenue: 0, totalTransactions: 0 };

    // Get top hotels by city
    let topHotels = [];
    let cityWiseRevenue = [];
    try {
      const hotelsData = await axios.get('http://localhost:5003/api/hotels?limit=100').catch(() => ({ data: { data: [] } }));
      const hotels = hotelsData.data.data || [];
      
      // Group by city and calculate revenue from actual bookings only
      const cityMap = {};
      try {
        const billingResponse = await axios.get('http://localhost:5005/api/billing', {
          params: { bookingType: 'hotel', limit: 10000 }
        }).catch(() => ({ data: { data: [] } }));
        
        const hotelBookings = billingResponse.data.data || [];
        
        // Fetch all users to get their bookings for city information
        const usersResponse = await axios.get('http://localhost:5001/api/users', {
          params: { limit: 10000 }
        }).catch(() => ({ data: { data: [] } }));
        const allUsers = usersResponse.data.data || [];
        
        // Create a map of bookingId to booking details from user service
        const bookingDetailsMap = {};
        allUsers.forEach(user => {
          const bookings = user.bookingHistory || user.bookings || [];
          if (Array.isArray(bookings)) {
            bookings.forEach(booking => {
              if (booking.type === 'hotel' && booking.bookingId) {
                bookingDetailsMap[booking.bookingId] = booking.details || {};
              }
            });
          }
        });
        
        hotelBookings.forEach(billing => {
          const bookingDetails = bookingDetailsMap[billing.bookingId] || {};
          const hotelId = bookingDetails.hotelId || bookingDetails._id;
          const hotelCity = bookingDetails.city || 
                          hotels.find(h => h.hotelId === hotelId)?.city ||
                          'Unknown';
          
          if (!cityMap[hotelCity]) {
            cityMap[hotelCity] = { city: hotelCity, revenue: 0 };
          }
          cityMap[hotelCity].revenue += billing.totalAmountPaid || 0;
        });
        
        cityWiseRevenue = Object.values(cityMap)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
          .map(item => ({ city: item.city, revenue: Math.round(item.revenue) }));
      } catch (error) {
        console.error('Error calculating city revenue:', error.message);
        cityWiseRevenue = [];
      }

      // Top properties - ONLY from actual bookings in billing service
      // Fetch all hotel bookings once, then match to hotels
      try {
        const billingResponse = await axios.get('http://localhost:5005/api/billing', {
          params: { bookingType: 'hotel', limit: 10000 }
        }).catch(() => ({ data: { data: [] } }));
        
        const allHotelBookings = billingResponse.data.data || [];
        
        // Fetch all users to get their bookings
        const usersResponse = await axios.get('http://localhost:5001/api/users', {
          params: { limit: 10000 }
        }).catch(() => ({ data: { data: [] } }));
        const allUsers = usersResponse.data.data || [];
        
        // Create a map of bookingId to booking details from user service
        const bookingDetailsMap = {};
        allUsers.forEach(user => {
          const bookings = user.bookingHistory || user.bookings || [];
          if (Array.isArray(bookings)) {
            bookings.forEach(booking => {
              if (booking.type === 'hotel' && booking.bookingId) {
                bookingDetailsMap[booking.bookingId] = booking.details || {};
              }
            });
          }
        });
        
        // Group bookings by hotel
        const hotelRevenueMap = {};
        allHotelBookings.forEach(billing => {
          const bookingDetails = bookingDetailsMap[billing.bookingId] || {};
          const hotelId = bookingDetails.hotelId || bookingDetails._id;
          const hotelName = bookingDetails.hotelName || bookingDetails.name || 'Unknown Hotel';
          const key = hotelId || hotelName || 'unknown';
          
          if (!hotelRevenueMap[key]) {
            hotelRevenueMap[key] = {
              name: hotelName,
              revenue: 0,
              bookings: 0
            };
          }
          hotelRevenueMap[key].revenue += billing.totalAmountPaid || 0;
          hotelRevenueMap[key].bookings += 1;
        });
        
        // Convert to array and sort by revenue
        topHotels = Object.values(hotelRevenueMap)
          .filter(h => h.bookings > 0) // Only hotels with actual bookings
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);
      } catch (error) {
        console.error('Error fetching top hotels from bookings:', error.message);
        topHotels = [];
      }
    } catch (error) {
      console.error('Error fetching hotel analytics:', error.message);
      topHotels = []; // Ensure empty array on error
      cityWiseRevenue = []; // Ensure empty array on error
    }
    
    // If no hotels with bookings found, ensure empty array
    if (!topHotels || topHotels.length === 0) {
      topHotels = [];
    }
    if (!cityWiseRevenue || cityWiseRevenue.length === 0) {
      cityWiseRevenue = [];
    }

    // Get monthly revenue data (last 6 months)
    let monthlyRevenue = [];
    let monthlyBookings = [];
    let monthlyRevenueByType = {};
    let monthlyBookingsByType = {};
    let typeSummaries = {};
    let bookingTypeDistribution = [];
    let bookingStatusDistribution = [];
    
    try {
      const billingData = await axios.get('http://localhost:5005/api/billing?limit=10000').catch(() => ({ data: { data: [] } }));
      const billings = billingData.data.data || [];
      const bookingTypes = ['flight', 'hotel', 'car'];
      
      // Calculate monthly revenue and bookings for last 6 months
      const now = new Date();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          month: date.toLocaleString('default', { month: 'short' }),
          year: date.getFullYear(),
          monthIndex: date.getMonth(),
          yearIndex: date.getFullYear()
        });
      }
      
      bookingTypes.forEach((type) => {
        monthlyRevenueByType[type] = [];
        monthlyBookingsByType[type] = [];
      });
      
      monthlyRevenue = months.map(m => {
        const monthBillings = billings.filter(b => {
          if (!b.dateOfTransaction) return false;
          const bDate = new Date(b.dateOfTransaction);
          return bDate.getMonth() === m.monthIndex && 
                 bDate.getFullYear() === m.yearIndex &&
                 b.transactionStatus === 'completed';
        });
        
        bookingTypes.forEach((type) => {
          const typeMonthBillings = monthBillings.filter(b => b.bookingType === type);
          const typeMonthRevenue = typeMonthBillings.reduce((sum, b) => sum + (b.totalAmountPaid || 0), 0);
          monthlyRevenueByType[type].push({
            month: m.month,
            revenue: typeMonthRevenue
          });
          const allTypeBillingsForMonth = billings.filter(b => {
            if (!b.dateOfTransaction) return false;
            const bDate = new Date(b.dateOfTransaction);
            return (
              b.bookingType === type &&
              bDate.getMonth() === m.monthIndex &&
              bDate.getFullYear() === m.yearIndex
            );
          });
          monthlyBookingsByType[type].push({
            month: m.month,
            bookings: allTypeBillingsForMonth.length
          });
        });
        
        return {
          month: m.month,
          revenue: monthBillings.reduce((sum, b) => sum + (b.totalAmountPaid || 0), 0)
        };
      });
      
      monthlyBookings = months.map(m => {
        const monthBillings = billings.filter(b => {
          if (!b.dateOfTransaction) return false;
          const bDate = new Date(b.dateOfTransaction);
          return bDate.getMonth() === m.monthIndex && 
                 bDate.getFullYear() === m.yearIndex;
        });
        return {
          month: m.month,
          bookings: monthBillings.length
        };
      });
      
      bookingTypes.forEach((type) => {
        const typeBillings = billings.filter(b => b.bookingType === type);
        const completedTypeBillings = typeBillings.filter(b => b.transactionStatus === 'completed');
        const totalRevenueByType = completedTypeBillings.reduce((sum, b) => sum + (b.totalAmountPaid || 0), 0);
        const totalBookingsByType = typeBillings.length;
        typeSummaries[type] = {
          totalRevenue: totalRevenueByType,
          totalBookings: totalBookingsByType,
          avgBookingValue: totalBookingsByType > 0 ? totalRevenueByType / totalBookingsByType : 0
        };
      });
      
      // Booking type distribution
      const typeCounts = {};
      billings.forEach(b => {
        const type = b.bookingType || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
      bookingTypeDistribution = Object.entries(typeCounts).map(([type, count]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count,
        percentage: billings.length > 0 ? ((count / billings.length) * 100).toFixed(1) : 0
      }));
      
      // Booking status distribution
      const statusCounts = {};
      billings.forEach(b => {
        const status = b.transactionStatus || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      bookingStatusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count,
        percentage: billings.length > 0 ? ((count / billings.length) * 100).toFixed(1) : 0
      }));
    } catch (error) {
      console.error('Error calculating time-based analytics:', error.message);
    }

    // Top providers - show by actual item names (flight names, hotel names, car names)
    let topProviders = [];
    try {
      const billingResponse = await axios.get('http://localhost:5005/api/billing?limit=10000').catch(() => ({ data: { data: [] } }));
      const allBillings = billingResponse.data.data || [];
      
      console.log(`[Top Providers] Found ${allBillings.length} billing records`);
      
      // Fetch all users to get booking details (fallback for itemId)
      const usersResponse = await axios.get('http://localhost:5001/api/users?limit=10000').catch(() => ({ data: { data: [] } }));
      const allUsers = usersResponse.data.data || [];
      
      // Create a map of bookingId to booking details from user service
      const bookingDetailsMap = {};
      allUsers.forEach(user => {
        const bookings = user.bookingHistory || user.bookings || [];
        if (Array.isArray(bookings)) {
          bookings.forEach(booking => {
            if (booking.bookingId) {
              bookingDetailsMap[booking.bookingId] = booking.details || {};
            }
          });
        }
      });
      
      console.log(`[Top Providers] Found ${Object.keys(bookingDetailsMap).length} booking details from users`);
      
      // Fetch all items from services directly
      let flightsMap = {};
      let hotelsMap = {};
      let carsMap = {};
      
      try {
        const flightsData = await axios.get('http://localhost:5002/api/flights?limit=10000').catch(() => ({ data: { data: [] } }));
        (flightsData.data.data || []).forEach(flight => {
          const key = flight._id?.toString();
          const flightIdKey = flight.flightId;
          if (key) {
            flightsMap[key] = flight;
          }
          if (flightIdKey) {
            flightsMap[flightIdKey] = flight;
          }
        });
      } catch (err) {
        console.error('Error fetching flights:', err.message);
      }
      
      try {
        const hotelsData = await axios.get('http://localhost:5003/api/hotels?limit=10000').catch(() => ({ data: { data: [] } }));
        (hotelsData.data.data || []).forEach(hotel => {
          const key = hotel._id?.toString();
          const hotelIdKey = hotel.hotelId;
          if (key) {
            hotelsMap[key] = hotel;
          }
          if (hotelIdKey) {
            hotelsMap[hotelIdKey] = hotel;
          }
        });
      } catch (err) {
        console.error('Error fetching hotels:', err.message);
      }
      
      try {
        const carsData = await axios.get('http://localhost:5004/api/cars?limit=10000').catch(() => ({ data: { data: [] } }));
        (carsData.data.data || []).forEach(car => {
          const key = car._id?.toString();
          const carIdKey = car.carId;
          if (key) {
            carsMap[key] = car;
          }
          if (carIdKey) {
            carsMap[carIdKey] = car;
          }
        });
      } catch (err) {
        console.error('Error fetching cars:', err.message);
      }
      
      const providerMap = {};
      let processedCount = 0;
      let skippedCount = 0;
      
      allBillings.forEach(billing => {
        const bookingDetails = bookingDetailsMap[billing.bookingId] || {};
        let itemName = null;
        let itemType = billing.bookingType || 'unknown';
        
        // PRIMARY STRATEGY: Use itemId from billing to lookup in services (most reliable)
        const itemId = billing.itemId?.toString();
        
        if (billing.bookingType === 'flight') {
          // First try: Lookup by itemId in flightsMap
          if (itemId) {
            const flight = flightsMap[itemId];
            if (flight) {
              itemName = flight.flightId || `Flight ${flight._id?.toString().slice(-6)}`;
            } else {
              // Search all flights if direct lookup fails
              const foundFlight = Object.values(flightsMap).find(f => 
                f._id?.toString() === itemId || 
                f.flightId === itemId ||
                f.flightId?.toString() === itemId
              );
              if (foundFlight) {
                itemName = foundFlight.flightId || `Flight ${foundFlight._id?.toString().slice(-6)}`;
              }
            }
          }
          
          // Fallback: Try booking details
          if (!itemName) {
            itemName = bookingDetails.flightId || 
                      bookingDetails.flight?.flightId ||
                      bookingDetails.details?.flightId;
          }
          
          // Last resort: Use airline name
          if (!itemName && bookingDetails.airline) {
            itemName = bookingDetails.airline;
          }
        } else if (billing.bookingType === 'hotel') {
          // First try: Lookup by itemId in hotelsMap
          if (itemId) {
            const hotel = hotelsMap[itemId];
            if (hotel) {
              itemName = hotel.hotelName || hotel.name || `Hotel ${hotel._id?.toString().slice(-6)}`;
            } else {
              // Search all hotels if direct lookup fails
              const foundHotel = Object.values(hotelsMap).find(h => 
                h._id?.toString() === itemId || 
                h.hotelId === itemId ||
                h.hotelId?.toString() === itemId
              );
              if (foundHotel) {
                itemName = foundHotel.hotelName || foundHotel.name || `Hotel ${foundHotel._id?.toString().slice(-6)}`;
              }
            }
          }
          
          // Fallback: Try booking details
          if (!itemName) {
            itemName = bookingDetails.hotelName || 
                      bookingDetails.name ||
                      bookingDetails.hotel?.hotelName ||
                      bookingDetails.hotel?.name ||
                      bookingDetails.details?.hotelName ||
                      bookingDetails.details?.name;
          }
        } else if (billing.bookingType === 'car') {
          // First try: Lookup by itemId in carsMap
          if (itemId) {
            const car = carsMap[itemId];
            if (car) {
              const carBrand = car.company || car.brand || '';
              const carModel = car.model || '';
              const carYear = car.year || '';
              itemName = [carBrand, carModel, carYear].filter(Boolean).join(' ').trim();
            } else {
              // Search all cars if direct lookup fails
              const foundCar = Object.values(carsMap).find(c => 
                c._id?.toString() === itemId || 
                c.carId === itemId ||
                c.carId?.toString() === itemId
              );
              if (foundCar) {
                const carBrand = foundCar.company || foundCar.brand || '';
                const carModel = foundCar.model || '';
                const carYear = foundCar.year || '';
                itemName = [carBrand, carModel, carYear].filter(Boolean).join(' ').trim();
              }
            }
          }
          
          // Fallback: Try booking details
          if (!itemName) {
            const brand = bookingDetails.company || 
                         bookingDetails.brand || 
                         bookingDetails.car?.company ||
                         bookingDetails.car?.brand ||
                         bookingDetails.details?.company ||
                         bookingDetails.details?.brand || '';
            const model = bookingDetails.model || 
                         bookingDetails.car?.model ||
                         bookingDetails.details?.model || '';
            const year = bookingDetails.year || 
                        bookingDetails.car?.year ||
                        bookingDetails.details?.year || '';
            if (brand || model) {
              itemName = [brand, model, year].filter(Boolean).join(' ').trim();
            }
          }
        } else {
          return; // Skip unknown types
        }
        
        // Skip if still no name found
        if (!itemName || itemName.trim() === '') {
          skippedCount++;
          if (skippedCount <= 3) {
            console.log(`[Top Providers] ⚠️ Skipping billing ${skippedCount}:`, {
              bookingId: billing.bookingId,
              bookingType: billing.bookingType,
              itemId: billing.itemId,
              hasBookingDetails: !!bookingDetails && Object.keys(bookingDetails).length > 0
            });
          }
          return;
        }
        
        processedCount++;
        if (processedCount <= 3) {
          console.log(`[Top Providers] ✅ Found: "${itemName}" (${billing.bookingType}, itemId: ${itemId || 'none'})`);
        }
        
        const providerKey = `${itemName}-${itemType}`;
        
        if (!providerMap[providerKey]) {
          providerMap[providerKey] = { 
            name: itemName, 
            revenue: 0, 
            properties: 0, 
            type: itemType 
          };
        }
        providerMap[providerKey].revenue += billing.totalAmountPaid || 0;
        providerMap[providerKey].properties += 1;
      });
      
      console.log(`[Top Providers] Summary: Processed ${processedCount}, Skipped ${skippedCount}, Total providers: ${Object.keys(providerMap).length}`);
      
      topProviders = Object.values(providerMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Show top 10
    } catch (error) {
      console.error('Error calculating top providers:', error.message);
      topProviders = [];
    }

    const analytics = {
      stats: {
        totalUsers,
        totalFlights,
        totalHotels,
        totalCars,
        totalRevenue: revenueData.totalRevenue || 0,
        totalBookings: revenueData.totalTransactions || 0,
      },
      topProperties: topHotels,
      cityWiseRevenue,
      topProviders,
      monthlyRevenue,
      monthlyBookings,
      monthlyRevenueByType,
      monthlyBookingsByType,
      typeSummaries,
      bookingTypeDistribution,
      bookingStatusDistribution
    };

    const servicesTime = Date.now() - servicesStartTime;
    
    // Cache for 5 minutes (300 seconds) - analytics data changes frequently but expensive to compute
    const cacheStartTime = Date.now();
    await setCache(cacheKey, analytics, 300);
    const cacheTime = Date.now() - cacheStartTime;
    
    const totalTime = Date.now() - requestStartTime;
    console.log(`   Services: ${servicesTime}ms | Cache Write: ${cacheTime}ms | Total: ${totalTime}ms`);
    
    // Record cache miss for performance tracking
    recordCacheMiss(cacheKey, totalTime);

    res.json({
      success: true,
      data: analytics,
      cached: false
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Error fetching analytics', error: error.message });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const admin = new Admin(req.body);
    await admin.save();
    
    // Invalidate admin list cache
    await deleteCache('admin:list');
    
    res.status(201).json({ success: true, message: 'Admin created successfully', data: admin.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating admin', error: error.message });
  }
};

exports.getAdmins = async (req, res) => {
  const requestStartTime = Date.now();
  try {
    const cacheKey = 'admin:list';
    
    // Try to get from cache first
    const cacheResult = await getCache(cacheKey);
    if (cacheResult && cacheResult.value) {
      const totalTime = Date.now() - requestStartTime;
      const speedup = calculateSpeedup(cacheKey, totalTime);
      const speedupText = speedup ? ` | ${speedup}` : '';
      console.log(`✅ [Cache HIT] Admin list | Redis: ${cacheResult.time}ms | Total: ${totalTime}ms${speedupText}`);
      return res.json({
        success: true,
        data: cacheResult.value,
        cached: true
      });
    }
    
    const dbStartTime = Date.now();
    console.log(`❌ [Cache MISS] Admin list - fetching from DB`);
    
    const admins = await Admin.find().select('-password');
    
    const dbTime = Date.now() - dbStartTime;
    
    // Cache for 5 minutes (300 seconds)
    const cacheStartTime = Date.now();
    await setCache(cacheKey, admins, 300);
    const cacheTime = Date.now() - cacheStartTime;
    
    const totalTime = Date.now() - requestStartTime;
    console.log(`   DB: ${dbTime}ms | Cache Write: ${cacheTime}ms | Total: ${totalTime}ms`);
    
    // Record cache miss for performance tracking
    recordCacheMiss(cacheKey, totalTime);
    
    res.json({
      success: true,
      data: admins,
      cached: false
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching admins', error: error.message });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    delete req.body.password;
    const admin = await Admin.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    // Invalidate admin list cache
    await deleteCache('admin:list');
    
    res.json({ success: true, message: 'Admin updated successfully', data: admin.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating admin', error: error.message });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    // Invalidate admin list cache
    await deleteCache('admin:list');
    
    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting admin', error: error.message });
  }
};

// Track click
exports.trackClick = async (req, res) => {
  try {
    const { clickType, pageName, propertyId, propertyType, sectionName, userId, metadata } = req.body;
    
    if (!clickType || !['page', 'property', 'section'].includes(clickType)) {
      return res.status(400).json({ success: false, message: 'Valid clickType (page, property, section) is required' });
    }
    
    const clickData = {
      clickType,
      userId: userId || null,
      metadata: metadata || {}
    };
    
    if (clickType === 'page' && pageName) {
      clickData.pageName = pageName;
    } else if (clickType === 'property' && propertyId && propertyType) {
      clickData.propertyId = propertyId;
      clickData.propertyType = propertyType;
    } else if (clickType === 'section' && sectionName) {
      clickData.sectionName = sectionName;
    } else {
      return res.status(400).json({ success: false, message: 'Missing required fields for clickType' });
    }
    
    const click = new AnalyticsClick(clickData);
    await click.save();
    
    res.json({ success: true, message: 'Click tracked successfully' });
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ success: false, message: 'Error tracking click', error: error.message });
  }
};

