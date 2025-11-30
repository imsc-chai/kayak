const mongoose = require('mongoose');
const Hotel = require('./src/models/Hotel');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27020/kayak_hotels';

const hotels = [
  {
    hotelId: 'HOT001',
    hotelName: 'Grand Plaza Hotel',
    address: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    starRating: 5,
    numberOfRooms: 200,
    availableRooms: 150,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 199.99, available: 50, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 249.99, available: 60, maxGuests: 2 },
      { type: 'SUITE', pricePerNight: 399.99, available: 30, maxGuests: 4 }
    ],
    pricePerNight: 249.99,
    amenities: ['WiFi', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Parking'],
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'
    ]
  },
  {
    hotelId: 'HOT002',
    hotelName: 'Oceanview Resort',
    address: '456 Beach Boulevard',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90210',
    starRating: 4,
    numberOfRooms: 150,
    availableRooms: 120,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 179.99, available: 40, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 219.99, available: 50, maxGuests: 2 },
      { type: 'SUITE', pricePerNight: 349.99, available: 30, maxGuests: 4 }
    ],
    pricePerNight: 219.99,
    amenities: ['WiFi', 'Pool', 'Beach Access', 'Restaurant', 'Parking'],
    images: [
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800'
    ],
    hotelRating: { average: 4.2, count: 1 }
  },
  {
    hotelId: 'HOT003',
    hotelName: 'Downtown Inn',
    address: '789 Business District',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60601',
    starRating: 3,
    numberOfRooms: 100,
    availableRooms: 80,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 129.99, available: 30, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 159.99, available: 50, maxGuests: 2 }
    ],
    pricePerNight: 159.99,
    amenities: ['WiFi', 'Gym', 'Restaurant'],
    images: [
      'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800'
    ],
    hotelRating: { average: 3.8, count: 1 }
  },
  {
    hotelId: 'HOT004',
    hotelName: 'Mountain View Lodge',
    address: '321 Alpine Road',
    city: 'Denver',
    state: 'CO',
    zipCode: '80202',
    starRating: 4,
    numberOfRooms: 120,
    availableRooms: 95,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 149.99, available: 35, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 189.99, available: 40, maxGuests: 2 },
      { type: 'SUITE', pricePerNight: 299.99, available: 20, maxGuests: 4 }
    ],
    pricePerNight: 189.99,
    amenities: ['WiFi', 'Gym', 'Spa', 'Restaurant', 'Parking', 'Ski Access'],
    images: [
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800'
    ],
    hotelRating: { average: 4.1, count: 1 }
  },
  {
    hotelId: 'HOT005',
    hotelName: 'Riverside Hotel',
    address: '555 River Walk',
    city: 'San Antonio',
    state: 'TX',
    zipCode: '78205',
    starRating: 3,
    numberOfRooms: 80,
    availableRooms: 65,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 119.99, available: 25, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 139.99, available: 40, maxGuests: 2 }
    ],
    pricePerNight: 139.99,
    amenities: ['WiFi', 'Pool', 'Restaurant'],
    images: [
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
      'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800'
    ],
    hotelRating: { average: 3.7, count: 1 }
  },
  {
    hotelId: 'HOT006',
    hotelName: 'Luxury Suites',
    address: '888 Premium Avenue',
    city: 'Miami',
    state: 'FL',
    zipCode: '33139',
    starRating: 5,
    numberOfRooms: 180,
    availableRooms: 140,
    maxGuests: 10,
    roomTypes: [
      { type: 'DOUBLE', pricePerNight: 279.99, available: 60, maxGuests: 2 },
      { type: 'SUITE', pricePerNight: 449.99, available: 50, maxGuests: 4 }
    ],
    pricePerNight: 279.99,
    amenities: ['WiFi', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Beach Access', 'Parking', 'Concierge'],
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'
    ],
    hotelRating: { average: 4.7, count: 1 }
  },
  {
    hotelId: 'HOT007',
    hotelName: 'City Center Hotel',
    address: '222 Urban Street',
    city: 'Seattle',
    state: 'WA',
    zipCode: '98101',
    starRating: 4,
    numberOfRooms: 130,
    availableRooms: 105,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 169.99, available: 45, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 199.99, available: 40, maxGuests: 2 },
      { type: 'SUITE', pricePerNight: 329.99, available: 20, maxGuests: 4 }
    ],
    pricePerNight: 199.99,
    amenities: ['WiFi', 'Gym', 'Restaurant', 'Parking', 'Business Center'],
    images: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800'
    ],
    hotelRating: { average: 4.3, count: 1 }
  },
  {
    hotelId: 'HOT008',
    hotelName: 'Garden Inn',
    address: '777 Park Lane',
    city: 'Portland',
    state: 'OR',
    zipCode: '97201',
    starRating: 3,
    numberOfRooms: 90,
    availableRooms: 70,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 139.99, available: 30, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 169.99, available: 40, maxGuests: 2 }
    ],
    pricePerNight: 169.99,
    amenities: ['WiFi', 'Garden', 'Restaurant', 'Parking'],
    images: [
      'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'
    ],
    hotelRating: { average: 3.6, count: 1 }
  },
  {
    hotelId: 'HOT009',
    hotelName: 'Historic Grand Hotel',
    address: '999 Heritage Boulevard',
    city: 'Boston',
    state: 'MA',
    zipCode: '02108',
    starRating: 4,
    numberOfRooms: 160,
    availableRooms: 125,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 189.99, available: 50, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 229.99, available: 50, maxGuests: 2 },
      { type: 'SUITE', pricePerNight: 379.99, available: 25, maxGuests: 4 }
    ],
    pricePerNight: 229.99,
    amenities: ['WiFi', 'Gym', 'Restaurant', 'Parking', 'Historic Tours'],
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
    ],
    hotelRating: { average: 4.4, count: 1 }
  },
  {
    hotelId: 'HOT010',
    hotelName: 'Desert Oasis Resort',
    address: '111 Desert Drive',
    city: 'Phoenix',
    state: 'AZ',
    zipCode: '85001',
    starRating: 4,
    numberOfRooms: 140,
    availableRooms: 110,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 159.99, available: 40, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 199.99, available: 50, maxGuests: 2 },
      { type: 'SUITE', pricePerNight: 319.99, available: 20, maxGuests: 4 }
    ],
    pricePerNight: 199.99,
    amenities: ['WiFi', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Parking', 'Golf Course'],
    images: [
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'
    ],
    hotelRating: { average: 4.3, count: 1 }
  },
  {
    hotelId: 'HOT011',
    hotelName: 'Bayfront Hotel',
    address: '444 Harbor View',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    starRating: 5,
    numberOfRooms: 170,
    availableRooms: 135,
    maxGuests: 10,
    roomTypes: [
      { type: 'DOUBLE', pricePerNight: 259.99, available: 60, maxGuests: 2 },
      { type: 'SUITE', pricePerNight: 419.99, available: 50, maxGuests: 4 }
    ],
    pricePerNight: 259.99,
    amenities: ['WiFi', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Parking', 'Bay View'],
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'
    ],
    hotelRating: { average: 4.8, count: 1 }
  },
  {
    hotelId: 'HOT012',
    hotelName: 'Metro Hotel',
    address: '666 Transit Way',
    city: 'Atlanta',
    state: 'GA',
    zipCode: '30309',
    starRating: 3,
    numberOfRooms: 110,
    availableRooms: 85,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 149.99, available: 35, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 179.99, available: 50, maxGuests: 2 }
    ],
    pricePerNight: 179.99,
    amenities: ['WiFi', 'Gym', 'Restaurant', 'Parking'],
    images: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
      'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800'
    ],
    hotelRating: { average: 3.5, count: 1 }
  },
  {
    hotelId: 'HOT013',
    hotelName: 'Lakeside Resort',
    address: '333 Lake Shore Drive',
    city: 'Minneapolis',
    state: 'MN',
    zipCode: '55401',
    starRating: 4,
    numberOfRooms: 125,
    availableRooms: 100,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 174.99, available: 40, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 209.99, available: 45, maxGuests: 2 },
      { type: 'SUITE', pricePerNight: 339.99, available: 15, maxGuests: 4 }
    ],
    pricePerNight: 209.99,
    amenities: ['WiFi', 'Pool', 'Gym', 'Restaurant', 'Parking', 'Lake Access'],
    images: [
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800'
    ],
    hotelRating: { average: 4.2, count: 1 }
  },
  {
    hotelId: 'HOT014',
    hotelName: 'Business Hotel',
    address: '777 Corporate Plaza',
    city: 'Dallas',
    state: 'TX',
    zipCode: '75201',
    starRating: 3,
    numberOfRooms: 95,
    availableRooms: 75,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 134.99, available: 30, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 164.99, available: 45, maxGuests: 2 }
    ],
    pricePerNight: 164.99,
    amenities: ['WiFi', 'Gym', 'Restaurant', 'Parking', 'Business Center', 'Conference Rooms'],
    images: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
      'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800'
    ],
    hotelRating: { average: 3.6, count: 1 }
  },
  {
    hotelId: 'HOT015',
    hotelName: 'Sunset Beach Resort',
    address: '888 Coastal Highway',
    city: 'San Diego',
    state: 'CA',
    zipCode: '92101',
    starRating: 4,
    numberOfRooms: 155,
    availableRooms: 120,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 194.99, available: 45, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 234.99, available: 50, maxGuests: 2 },
      { type: 'SUITE', pricePerNight: 389.99, available: 25, maxGuests: 4 }
    ],
    pricePerNight: 234.99,
    amenities: ['WiFi', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Beach Access', 'Parking'],
    images: [
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800'
    ],
    hotelRating: { average: 4.4, count: 1 }
  },
  {
    hotelId: 'HOT016',
    hotelName: 'Capital Hotel',
    address: '111 Government Square',
    city: 'Washington',
    state: 'DC',
    zipCode: '20001',
    starRating: 4,
    numberOfRooms: 145,
    availableRooms: 115,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 204.99, available: 50, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 244.99, available: 45, maxGuests: 2 },
      { type: 'SUITE', pricePerNight: 399.99, available: 20, maxGuests: 4 }
    ],
    pricePerNight: 244.99,
    amenities: ['WiFi', 'Gym', 'Restaurant', 'Parking', 'Business Center'],
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
    ],
    hotelRating: { average: 4.3, count: 1 }
  },
  {
    hotelId: 'HOT017',
    hotelName: 'Airport Hotel',
    address: '222 Terminal Road',
    city: 'Las Vegas',
    state: 'NV',
    zipCode: '89119',
    starRating: 3,
    numberOfRooms: 105,
    availableRooms: 80,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 144.99, available: 35, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 174.99, available: 45, maxGuests: 2 }
    ],
    pricePerNight: 174.99,
    amenities: ['WiFi', 'Pool', 'Gym', 'Restaurant', 'Parking', 'Airport Shuttle'],
    images: [
      'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'
    ],
    hotelRating: { average: 3.7, count: 1 }
  },
  {
    hotelId: 'HOT018',
    hotelName: 'Boutique Hotel',
    address: '555 Art District',
    city: 'Nashville',
    state: 'TN',
    zipCode: '37203',
    starRating: 4,
    numberOfRooms: 85,
    availableRooms: 65,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 179.99, available: 25, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 219.99, available: 40, maxGuests: 2 }
    ],
    pricePerNight: 219.99,
    amenities: ['WiFi', 'Restaurant', 'Parking', 'Art Gallery'],
    images: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800'
    ],
    hotelRating: { average: 4.1, count: 1 }
  },
  {
    hotelId: 'HOT019',
    hotelName: 'Countryside Inn',
    address: '999 Rural Route',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    starRating: 3,
    numberOfRooms: 75,
    availableRooms: 60,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 124.99, available: 25, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 154.99, available: 35, maxGuests: 2 }
    ],
    pricePerNight: 154.99,
    amenities: ['WiFi', 'Restaurant', 'Parking'],
    images: [
      'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'
    ],
    hotelRating: { average: 3.5, count: 1 }
  },
  {
    hotelId: 'HOT020',
    hotelName: 'Executive Suites',
    address: '333 Business Park',
    city: 'Houston',
    state: 'TX',
    zipCode: '77002',
    starRating: 4,
    numberOfRooms: 135,
    availableRooms: 105,
    maxGuests: 10,
    roomTypes: [
      { type: 'SINGLE', pricePerNight: 184.99, available: 45, maxGuests: 1 },
      { type: 'DOUBLE', pricePerNight: 224.99, available: 40, maxGuests: 2 },
      { type: 'SUITE', pricePerNight: 364.99, available: 20, maxGuests: 4 }
    ],
    pricePerNight: 224.99,
    amenities: ['WiFi', 'Gym', 'Restaurant', 'Parking', 'Business Center', 'Conference Rooms'],
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
    ],
    hotelRating: { average: 4.0, count: 1 }
  }
];

async function seedHotels() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing hotels
    await Hotel.deleteMany({});
    console.log('Cleared existing hotels');

    // Insert new hotels
    const insertedHotels = await Hotel.insertMany(hotels);
    console.log(`✅ Seeded ${insertedHotels.length} hotels successfully!`);
    console.log('✅ All hotels now have:');
    console.log('   - Room types: SINGLE, DOUBLE, SUITE (with maxGuests)');
    console.log('   - Multiple images (2-5 per hotel)');
    console.log('   - maxGuests: 10 (flexible guest capacity)');

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding hotels:', error);
    process.exit(1);
  }
}

seedHotels();
