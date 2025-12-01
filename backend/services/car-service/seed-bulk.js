const mongoose = require('mongoose');
const Car = require('./src/models/Car');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27020/kayak_cars';

const cities = [
  { city: 'New York', state: 'NY' },
  { city: 'Los Angeles', state: 'CA' },
  { city: 'Chicago', state: 'IL' },
  { city: 'Houston', state: 'TX' },
  { city: 'Phoenix', state: 'AZ' },
  { city: 'Philadelphia', state: 'PA' },
  { city: 'San Antonio', state: 'TX' },
  { city: 'San Diego', state: 'CA' },
  { city: 'Dallas', state: 'TX' },
  { city: 'San Jose', state: 'CA' },
  { city: 'Austin', state: 'TX' },
  { city: 'Jacksonville', state: 'FL' },
  { city: 'Fort Worth', state: 'TX' },
  { city: 'Columbus', state: 'OH' },
  { city: 'Charlotte', state: 'NC' },
  { city: 'San Francisco', state: 'CA' },
  { city: 'Indianapolis', state: 'IN' },
  { city: 'Seattle', state: 'WA' },
  { city: 'Denver', state: 'CO' },
  { city: 'Washington', state: 'DC' },
  { city: 'Boston', state: 'MA' },
  { city: 'Miami', state: 'FL' },
  { city: 'Atlanta', state: 'GA' },
  { city: 'Detroit', state: 'MI' },
  { city: 'Portland', state: 'OR' },
  { city: 'Las Vegas', state: 'NV' },
  { city: 'Memphis', state: 'TN' },
  { city: 'Louisville', state: 'KY' },
  { city: 'Baltimore', state: 'MD' },
  { city: 'Milwaukee', state: 'WI' }
];

const carTypes = ['SUV', 'Sedan', 'Compact', 'Luxury', 'Convertible', 'Truck', 'Van', 'Coupe'];
const companies = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'BMW', 'Mercedes-Benz', 'Audi', 'Hyundai', 'Kia', 'Mazda', 'Subaru', 'Jeep', 'Volkswagen', 'Lexus', 'Acura', 'Infiniti', 'Cadillac', 'Lincoln', 'Chrysler'];
const models = {
  'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Prius', 'Sienna', 'Tacoma', '4Runner'],
  'Honda': ['Accord', 'Civic', 'CR-V', 'Pilot', 'Odyssey', 'Ridgeline', 'HR-V'],
  'Ford': ['F-150', 'Explorer', 'Escape', 'Mustang', 'Edge', 'Expedition', 'Bronco'],
  'Chevrolet': ['Silverado', 'Equinox', 'Tahoe', 'Malibu', 'Traverse', 'Suburban', 'Camaro'],
  'Nissan': ['Altima', 'Sentra', 'Rogue', 'Pathfinder', 'Frontier', 'Murano', 'Maxima'],
  'BMW': ['3 Series', '5 Series', 'X3', 'X5', '7 Series', 'X1'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'GLE', 'S-Class', 'GLA'],
  'Audi': ['A4', 'A6', 'Q5', 'Q7', 'A3', 'Q3'],
  'Hyundai': ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Palisade'],
  'Kia': ['Optima', 'Sorento', 'Sportage', 'Telluride', 'Forte'],
  'Mazda': ['CX-5', 'CX-9', 'Mazda3', 'Mazda6', 'CX-30'],
  'Subaru': ['Outback', 'Forester', 'Crosstrek', 'Ascent', 'Legacy'],
  'Jeep': ['Grand Cherokee', 'Wrangler', 'Cherokee', 'Compass', 'Renegade'],
  'Volkswagen': ['Jetta', 'Passat', 'Tiguan', 'Atlas', 'Golf'],
  'Lexus': ['RX', 'ES', 'NX', 'GX', 'LS'],
  'Acura': ['MDX', 'RDX', 'TLX', 'ILX'],
  'Infiniti': ['Q50', 'QX50', 'QX60', 'QX80'],
  'Cadillac': ['XT5', 'Escalade', 'CT5', 'XT4'],
  'Lincoln': ['Navigator', 'Aviator', 'Corsair', 'Nautilus'],
  'Chrysler': ['Pacifica', '300', 'Voyager']
};

const transmissionTypes = ['Automatic', 'Manual'];
const fuelTypes = ['Gasoline', 'Hybrid', 'Electric', 'Diesel'];
const allFeatures = ['GPS', 'Bluetooth', 'Backup Camera', 'Sunroof', 'Leather Seats', 'Premium Sound', 'Third Row Seating', 'Heated Seats', 'Cooled Seats', 'Navigation', 'Apple CarPlay', 'Android Auto', 'Keyless Entry', 'Remote Start'];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getModelForCompany(company) {
  const companyModels = models[company] || ['Model'];
  return getRandomElement(companyModels);
}

function getPriceForCarType(carType) {
  switch (carType) {
    case 'Luxury': return 150 + Math.random() * 100;
    case 'SUV': return 80 + Math.random() * 50;
    case 'Truck': return 90 + Math.random() * 60;
    case 'Van': return 70 + Math.random() * 40;
    case 'Convertible': return 120 + Math.random() * 80;
    case 'Sedan': return 50 + Math.random() * 40;
    case 'Coupe': return 60 + Math.random() * 50;
    default: return 40 + Math.random() * 30; // Compact
  }
}

function getSeatsForCarType(carType) {
  switch (carType) {
    case 'Van': return 7;
    case 'SUV': return Math.random() > 0.5 ? 7 : 5;
    case 'Truck': return 5;
    default: return 5;
  }
}

async function seedBulkCars() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing cars (optional - comment out if you want to keep existing)
    // await Car.deleteMany({});
    // console.log('✅ Cleared existing cars');

    const cars = [];
    const totalCars = 4000;

    console.log(`🔄 Generating ${totalCars} cars...`);

    for (let i = 1; i <= totalCars; i++) {
      const carId = `CAR${String(i).padStart(4, '0')}`;
      const carType = getRandomElement(carTypes);
      const company = getRandomElement(companies);
      const model = getModelForCompany(company);
      const year = 2020 + Math.floor(Math.random() * 5); // 2020-2024
      const location = getRandomElement(cities);
      
      const dailyRentalPrice = getPriceForCarType(carType);
      const numberOfSeats = getSeatsForCarType(carType);
      const numFeatures = Math.floor(Math.random() * 8) + 4; // 4-11 features
      const features = getRandomElements(allFeatures, numFeatures);

      cars.push({
        carId,
        carType,
        company,
        model,
        year,
        transmissionType: getRandomElement(transmissionTypes),
        fuelType: getRandomElement(fuelTypes),
        numberOfSeats,
        dailyRentalPrice: Math.round(dailyRentalPrice * 100) / 100,
        availabilityStatus: Math.random() > 0.1 ? 'available' : 'unavailable',
        location: {
          city: location.city,
          state: location.state,
          address: `${Math.floor(Math.random() * 9999) + 1} ${getRandomElement(['Airport', 'Rental', 'Main', 'Park', 'Downtown'])} ${getRandomElement(['Road', 'Street', 'Avenue', 'Boulevard'])}`
        },
        features,
        images: [
          'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
          'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
          'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
        ]
      });

      if (i % 100 === 0) {
        console.log(`   Generated ${i}/${totalCars} cars...`);
      }
    }

    console.log('🔄 Inserting cars into database...');
    await Car.insertMany(cars, { ordered: false });
    console.log(`✅ Successfully seeded ${totalCars} cars!`);

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error seeding cars:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedBulkCars();

