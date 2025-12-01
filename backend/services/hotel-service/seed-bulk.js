const mongoose = require('mongoose');
const Hotel = require('./src/models/Hotel');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27020/kayak_hotels';

const cities = [
  { city: 'New York', state: 'NY', zipCode: '10001' },
  { city: 'Los Angeles', state: 'CA', zipCode: '90210' },
  { city: 'Chicago', state: 'IL', zipCode: '60601' },
  { city: 'Houston', state: 'TX', zipCode: '77001' },
  { city: 'Phoenix', state: 'AZ', zipCode: '85001' },
  { city: 'Philadelphia', state: 'PA', zipCode: '19101' },
  { city: 'San Antonio', state: 'TX', zipCode: '78201' },
  { city: 'San Diego', state: 'CA', zipCode: '92101' },
  { city: 'Dallas', state: 'TX', zipCode: '75201' },
  { city: 'San Jose', state: 'CA', zipCode: '95101' },
  { city: 'Austin', state: 'TX', zipCode: '78701' },
  { city: 'Jacksonville', state: 'FL', zipCode: '32201' },
  { city: 'Fort Worth', state: 'TX', zipCode: '76101' },
  { city: 'Columbus', state: 'OH', zipCode: '43201' },
  { city: 'Charlotte', state: 'NC', zipCode: '28201' },
  { city: 'San Francisco', state: 'CA', zipCode: '94101' },
  { city: 'Indianapolis', state: 'IN', zipCode: '46201' },
  { city: 'Seattle', state: 'WA', zipCode: '98101' },
  { city: 'Denver', state: 'CO', zipCode: '80201' },
  { city: 'Washington', state: 'DC', zipCode: '20001' },
  { city: 'Boston', state: 'MA', zipCode: '02101' },
  { city: 'El Paso', state: 'TX', zipCode: '79901' },
  { city: 'Nashville', state: 'TN', zipCode: '37201' },
  { city: 'Detroit', state: 'MI', zipCode: '48201' },
  { city: 'Oklahoma City', state: 'OK', zipCode: '73101' },
  { city: 'Portland', state: 'OR', zipCode: '97201' },
  { city: 'Las Vegas', state: 'NV', zipCode: '89101' },
  { city: 'Memphis', state: 'TN', zipCode: '38101' },
  { city: 'Louisville', state: 'KY', zipCode: '40201' },
  { city: 'Baltimore', state: 'MD', zipCode: '21201' }
];

const hotelNames = [
  'Grand', 'Plaza', 'Royal', 'Crown', 'Elite', 'Premier', 'Luxury', 'Boutique', 'Resort', 'Inn',
  'Suites', 'Lodge', 'Manor', 'Tower', 'Palace', 'Villa', 'Garden', 'Park', 'View', 'Bay',
  'Ocean', 'Mountain', 'Riverside', 'Downtown', 'Airport', 'Central', 'Express', 'Comfort', 'Holiday', 'Hampton'
];

const roomTypes = ['SINGLE', 'DOUBLE', 'SUITE', 'DELUXE', 'EXECUTIVE'];
const allAmenities = ['WiFi', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Parking', 'Breakfast', 'Bar', 'Room Service', 'Concierge', 'Business Center', 'Laundry', 'Airport Shuttle', 'Beach Access', 'Ski Access'];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateHotelName() {
  const first = getRandomElement(hotelNames);
  const second = getRandomElement(hotelNames);
  if (first === second) {
    return `${first} Hotel`;
  }
  return `${first} ${second} Hotel`;
}

async function seedBulkHotels() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing hotels (optional - comment out if you want to keep existing)
    // await Hotel.deleteMany({});
    // console.log('✅ Cleared existing hotels');

    const hotels = [];
    const totalHotels = 3500;

    console.log(`🔄 Generating ${totalHotels} hotels...`);

    for (let i = 1; i <= totalHotels; i++) {
      const hotelId = `HOT${String(i).padStart(4, '0')}`;
      const location = getRandomElement(cities);
      const starRating = Math.floor(Math.random() * 3) + 3; // 3-5 stars
      const numberOfRooms = Math.floor(Math.random() * 200) + 50; // 50-250 rooms
      const availableRooms = Math.floor(numberOfRooms * (0.4 + Math.random() * 0.4));
      
      // Generate room types
      const numRoomTypes = Math.floor(Math.random() * 3) + 2; // 2-4 room types
      const selectedRoomTypes = getRandomElements(roomTypes, numRoomTypes);
      const roomTypesArray = selectedRoomTypes.map(type => {
        const basePrice = type === 'SUITE' ? 300 : type === 'DELUXE' ? 250 : type === 'EXECUTIVE' ? 200 : type === 'DOUBLE' ? 150 : 100;
        const pricePerNight = basePrice + Math.random() * 100;
        const available = Math.floor((numberOfRooms / numRoomTypes) * (0.3 + Math.random() * 0.4));
        const maxGuests = type === 'SUITE' ? 4 : type === 'DOUBLE' ? 2 : 1;
        return {
          type,
          pricePerNight: Math.round(pricePerNight * 100) / 100,
          available,
          maxGuests
        };
      });

      const avgPrice = roomTypesArray.reduce((sum, rt) => sum + rt.pricePerNight, 0) / roomTypesArray.length;
      const numAmenities = Math.floor(Math.random() * 8) + 5; // 5-12 amenities
      const amenities = getRandomElements(allAmenities, numAmenities);

      hotels.push({
        hotelId,
        hotelName: generateHotelName(),
        address: `${Math.floor(Math.random() * 9999) + 1} ${getRandomElement(['Main', 'Park', 'Oak', 'Maple', 'Elm', 'First', 'Second', 'Third', 'Broadway', 'Market'])} Street`,
        city: location.city,
        state: location.state,
        zipCode: location.zipCode,
        starRating,
        numberOfRooms,
        availableRooms,
        maxGuests: 10,
        roomTypes: roomTypesArray,
        pricePerNight: Math.round(avgPrice * 100) / 100,
        amenities,
        images: [
          'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
          'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
        ]
      });

      if (i % 100 === 0) {
        console.log(`   Generated ${i}/${totalHotels} hotels...`);
      }
    }

    console.log('🔄 Inserting hotels into database...');
    await Hotel.insertMany(hotels, { ordered: false });
    console.log(`✅ Successfully seeded ${totalHotels} hotels!`);

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error seeding hotels:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedBulkHotels();

