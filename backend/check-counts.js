const mongoose = require('mongoose');
require('dotenv').config();

async function checkCounts() {
  try {
    // Check Flights
    const flightConn = await mongoose.createConnection(process.env.MONGODB_URI || 'mongodb://localhost:27020/kayak_flights');
    const Flight = flightConn.model('Flight', new mongoose.Schema({}, { strict: false }));
    const flightCount = await Flight.countDocuments();
    console.log(`✈️  Flights: ${flightCount}`);
    await flightConn.close();

    // Check Hotels
    const hotelConn = await mongoose.createConnection(process.env.MONGODB_URI || 'mongodb://localhost:27020/kayak_hotels');
    const Hotel = hotelConn.model('Hotel', new mongoose.Schema({}, { strict: false }));
    const hotelCount = await Hotel.countDocuments();
    console.log(`🏨 Hotels: ${hotelCount}`);
    await hotelConn.close();

    // Check Cars
    const carConn = await mongoose.createConnection(process.env.MONGODB_URI || 'mongodb://localhost:27020/kayak_cars');
    const Car = carConn.model('Car', new mongoose.Schema({}, { strict: false }));
    const carCount = await Car.countDocuments();
    console.log(`🚗 Cars: ${carCount}`);
    await carConn.close();

    const total = flightCount + hotelCount + carCount;
    console.log(`\n📊 Total: ${total} records`);
    console.log(`\nTarget: 10,000 records`);
    
    if (total >= 10000) {
      console.log('✅ You have reached 10,000+ records!');
    } else {
      const needed = 10000 - total;
      console.log(`⚠️  Need ${needed} more records to reach 10,000`);
      console.log('\nSuggested distribution:');
      console.log(`  - Flights: ${flightCount} (target: 4,000, need: ${Math.max(0, 4000 - flightCount)})`);
      console.log(`  - Hotels: ${hotelCount} (target: 3,000, need: ${Math.max(0, 3000 - hotelCount)})`);
      console.log(`  - Cars: ${carCount} (target: 3,000, already have enough)`);
    }
  } catch (error) {
    console.error('❌ Error checking counts:', error);
  }
  process.exit(0);
}

checkCounts();

