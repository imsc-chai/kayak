const mongoose = require('mongoose');
const Flight = require('./src/models/Flight');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27020/kayak_flights';

// Airport data
const airports = [
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'USA' },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'USA' },
  { code: 'ORD', name: 'O\'Hare International', city: 'Chicago', country: 'USA' },
  { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', country: 'USA' },
  { code: 'DEN', name: 'Denver International', city: 'Denver', country: 'USA' },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', country: 'USA' },
  { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', country: 'USA' },
  { code: 'MIA', name: 'Miami International', city: 'Miami', country: 'USA' },
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta', country: 'USA' },
  { code: 'BOS', name: 'Logan International', city: 'Boston', country: 'USA' },
  { code: 'PHX', name: 'Phoenix Sky Harbor International', city: 'Phoenix', country: 'USA' },
  { code: 'LAS', name: 'McCarran International', city: 'Las Vegas', country: 'USA' },
  { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', country: 'USA' },
  { code: 'MSP', name: 'Minneapolis-Saint Paul International', city: 'Minneapolis', country: 'USA' },
  { code: 'DTW', name: 'Detroit Metropolitan', city: 'Detroit', country: 'USA' },
  { code: 'PHL', name: 'Philadelphia International', city: 'Philadelphia', country: 'USA' },
  { code: 'CLT', name: 'Charlotte Douglas International', city: 'Charlotte', country: 'USA' },
  { code: 'LGA', name: 'LaGuardia', city: 'New York', country: 'USA' },
  { code: 'BWI', name: 'Baltimore/Washington International', city: 'Baltimore', country: 'USA' },
  { code: 'DCA', name: 'Ronald Reagan Washington National', city: 'Washington', country: 'USA' }
];

const airlines = ['American Airlines', 'Delta Airlines', 'United Airlines', 'Southwest Airlines', 'JetBlue Airways', 'Alaska Airlines', 'Spirit Airlines', 'Frontier Airlines', 'Hawaiian Airlines', 'Virgin America'];
const flightClasses = ['Economy', 'Business', 'First'];
const amenities = [['WiFi'], ['WiFi', 'Entertainment'], ['WiFi', 'Entertainment', 'Meal'], ['WiFi', 'Entertainment', 'Premium Meal', 'Priority Boarding']];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(startDate, daysAhead) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead));
  const hours = Math.floor(Math.random() * 24);
  const minutes = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function calculateDuration(departure, arrival) {
  const diff = arrival - departure;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes };
}

async function seedBulkFlights() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing flights (optional - comment out if you want to keep existing)
    // await Flight.deleteMany({});
    // console.log('✅ Cleared existing flights');

    const flights = [];
    const startDate = new Date('2025-12-01');
    const totalFlights = 2500;

    console.log(`🔄 Generating ${totalFlights} flights...`);

    for (let i = 1; i <= totalFlights; i++) {
      const airline = getRandomElement(airlines);
      const airlineCode = airline.substring(0, 2).toUpperCase();
      const flightNumber = String(i).padStart(3, '0');
      const flightId = `${airlineCode}${flightNumber}`;

      const departureAirport = getRandomElement(airports);
      let arrivalAirport = getRandomElement(airports);
      // Ensure different airports
      while (arrivalAirport.code === departureAirport.code) {
        arrivalAirport = getRandomElement(airports);
      }

      const departureDateTime = getRandomDate(startDate, 90);
      const flightDuration = { hours: Math.floor(Math.random() * 8) + 1, minutes: Math.floor(Math.random() * 60) };
      const arrivalDateTime = new Date(departureDateTime.getTime() + (flightDuration.hours * 60 + flightDuration.minutes) * 60000);

      const flightClass = getRandomElement(flightClasses);
      const basePrice = flightClass === 'First' ? 800 : flightClass === 'Business' ? 500 : 200;
      const ticketPrice = basePrice + Math.random() * 300;

      const totalSeats = flightClass === 'First' ? 20 : flightClass === 'Business' ? 30 : 60;
      const availableSeats = Math.floor(totalSeats * (0.3 + Math.random() * 0.5));

      // Return flight
      const returnDate = new Date(departureDateTime);
      returnDate.setDate(returnDate.getDate() + Math.floor(Math.random() * 7) + 1);
      const returnDepartureDateTime = getRandomDate(returnDate, 1);
      const returnArrivalDateTime = new Date(returnDepartureDateTime.getTime() + (flightDuration.hours * 60 + flightDuration.minutes) * 60000);

      const returnTicketPrice = ticketPrice + (Math.random() * 100 - 50);
      const returnAvailableSeats = Math.floor(totalSeats * (0.3 + Math.random() * 0.5));

      flights.push({
        flightId,
        airline,
        departureAirport,
        arrivalAirport,
        departureDateTime,
        arrivalDateTime,
        duration: flightDuration,
        flightClass,
        ticketPrice: Math.round(ticketPrice * 100) / 100,
        totalAvailableSeats: totalSeats,
        availableSeats,
        returnFlightId: `${airlineCode}${String(i + 10000).padStart(3, '0')}`,
        returnDepartureDateTime,
        returnArrivalDateTime,
        returnDuration: flightDuration,
        returnTicketPrice: Math.round(returnTicketPrice * 100) / 100,
        returnFlightClass: flightClass,
        returnTotalAvailableSeats: totalSeats,
        returnAvailableSeats: returnAvailableSeats,
        amenities: getRandomElement(amenities)
      });

      if (i % 100 === 0) {
        console.log(`   Generated ${i}/${totalFlights} flights...`);
      }
    }

    console.log('🔄 Inserting flights into database...');
    await Flight.insertMany(flights, { ordered: false });
    console.log(`✅ Successfully seeded ${totalFlights} flights!`);

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error seeding flights:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedBulkFlights();

