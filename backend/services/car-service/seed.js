const mongoose = require('mongoose');
const Car = require('./src/models/Car');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27020/kayak_cars';

const cars = [
  {
    carId: 'CAR001',
    carType: 'SUV',
    company: 'Toyota',
    model: 'RAV4',
    year: 2024,
    transmissionType: 'Automatic',
    fuelType: 'Hybrid',
    numberOfSeats: 5,
    dailyRentalPrice: 89.99,
    availabilityStatus: 'available',
    location: { city: 'New York', state: 'NY', address: '123 Airport Road' },
    features: ['GPS', 'Bluetooth', 'Backup Camera', 'Sunroof'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ]
  },
  {
    carId: 'CAR002',
    carType: 'Sedan',
    company: 'Honda',
    model: 'Accord',
    year: 2024,
    transmissionType: 'Automatic',
    fuelType: 'Gasoline',
    numberOfSeats: 5,
    dailyRentalPrice: 59.99,
    availabilityStatus: 'available',
    location: { city: 'Los Angeles', state: 'CA', address: '456 Rental Street' },
    features: ['GPS', 'Bluetooth', 'Backup Camera'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ],
    carRating: { average: 4.1, count: 1 }
  },
  {
    carId: 'CAR003',
    carType: 'Compact',
    company: 'Nissan',
    model: 'Sentra',
    year: 2023,
    transmissionType: 'Automatic',
    fuelType: 'Gasoline',
    numberOfSeats: 5,
    dailyRentalPrice: 49.99,
    availabilityStatus: 'available',
    location: { city: 'Chicago', state: 'IL', address: '789 Downtown Ave' },
    features: ['GPS', 'Bluetooth'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ],
    carRating: { average: 3.8, count: 1 }
  },
  {
    carId: 'CAR004',
    carType: 'Luxury',
    company: 'BMW',
    model: '5 Series',
    year: 2024,
    transmissionType: 'Automatic',
    fuelType: 'Gasoline',
    numberOfSeats: 5,
    dailyRentalPrice: 149.99,
    availabilityStatus: 'available',
    location: { city: 'Miami', state: 'FL', address: '321 Beach Boulevard' },
    features: ['GPS', 'Bluetooth', 'Backup Camera', 'Leather Seats', 'Premium Sound'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ],
    carRating: { average: 4.6, count: 1 }
  },
  {
    carId: 'CAR005',
    carType: 'SUV',
    company: 'Ford',
    model: 'Explorer',
    year: 2024,
    transmissionType: 'Automatic',
    fuelType: 'Gasoline',
    numberOfSeats: 7,
    dailyRentalPrice: 99.99,
    availabilityStatus: 'available',
    location: { city: 'Denver', state: 'CO', address: '555 Mountain View' },
    features: ['GPS', 'Bluetooth', 'Backup Camera', 'Third Row Seating'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ],
    carRating: { average: 4.4, count: 1 }
  },
  {
    carId: 'CAR006',
    carType: 'Convertible',
    company: 'Chevrolet',
    model: 'Camaro',
    year: 2024,
    transmissionType: 'Automatic',
    fuelType: 'Gasoline',
    numberOfSeats: 4,
    dailyRentalPrice: 129.99,
    availabilityStatus: 'available',
    location: { city: 'San Francisco', state: 'CA', address: '777 Bay Street' },
    features: ['GPS', 'Bluetooth', 'Backup Camera', 'Convertible Top'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ],
    carRating: { average: 4.5, count: 1 }
  },
  {
    carId: 'CAR007',
    carType: 'Sedan',
    company: 'Tesla',
    model: 'Model 3',
    year: 2024,
    transmissionType: 'Automatic',
    fuelType: 'Electric',
    numberOfSeats: 5,
    dailyRentalPrice: 119.99,
    availabilityStatus: 'available',
    location: { city: 'Seattle', state: 'WA', address: '888 Tech Avenue' },
    features: ['GPS', 'Bluetooth', 'Backup Camera', 'Autopilot', 'Supercharger Access'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ],
    carRating: { average: 4.7, count: 1 }
  },
  {
    carId: 'CAR008',
    carType: 'Van',
    company: 'Chrysler',
    model: 'Pacifica',
    year: 2024,
    transmissionType: 'Automatic',
    fuelType: 'Hybrid',
    numberOfSeats: 8,
    dailyRentalPrice: 109.99,
    availabilityStatus: 'available',
    location: { city: 'Boston', state: 'MA', address: '222 Harbor Drive' },
    features: ['GPS', 'Bluetooth', 'Backup Camera', 'Stow and Go Seating'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ],
    carRating: { average: 4.2, count: 1 }
  },
  {
    carId: 'CAR009',
    carType: 'Compact',
    company: 'Hyundai',
    model: 'Elantra',
    year: 2023,
    transmissionType: 'Automatic',
    fuelType: 'Gasoline',
    numberOfSeats: 5,
    dailyRentalPrice: 54.99,
    availabilityStatus: 'available',
    location: { city: 'Atlanta', state: 'GA', address: '444 Peachtree Street' },
    features: ['GPS', 'Bluetooth'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ],
    carRating: { average: 3.7, count: 1 }
  },
  {
    carId: 'CAR010',
    carType: 'SUV',
    company: 'Jeep',
    model: 'Grand Cherokee',
    year: 2024,
    transmissionType: 'Automatic',
    fuelType: 'Gasoline',
    numberOfSeats: 5,
    dailyRentalPrice: 94.99,
    availabilityStatus: 'available',
    location: { city: 'Phoenix', state: 'AZ', address: '666 Desert Road' },
    features: ['GPS', 'Bluetooth', 'Backup Camera', '4WD', 'Sunroof'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ]
  },
  {
    carId: 'CAR011',
    carType: 'Sedan',
    company: 'Mercedes-Benz',
    model: 'C-Class',
    year: 2024,
    transmissionType: 'Automatic',
    fuelType: 'Gasoline',
    numberOfSeats: 5,
    dailyRentalPrice: 139.99,
    availabilityStatus: 'available',
    location: { city: 'Dallas', state: 'TX', address: '111 Business Park' },
    features: ['GPS', 'Bluetooth', 'Backup Camera', 'Leather Seats', 'Premium Sound'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ],
    carRating: { average: 4.5, count: 1 }
  },
  {
    carId: 'CAR012',
    carType: 'Truck',
    company: 'Ford',
    model: 'F-150',
    year: 2024,
    transmissionType: 'Automatic',
    fuelType: 'Gasoline',
    numberOfSeats: 5,
    dailyRentalPrice: 119.99,
    availabilityStatus: 'available',
    location: { city: 'Houston', state: 'TX', address: '333 Industrial Way' },
    features: ['GPS', 'Bluetooth', 'Backup Camera', 'Towing Package'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ],
    carRating: { average: 4.4, count: 1 }
  },
  {
    carId: 'CAR013',
    carType: 'Compact',
    company: 'Mazda',
    model: 'Mazda3',
    year: 2023,
    transmissionType: 'Automatic',
    fuelType: 'Gasoline',
    numberOfSeats: 5,
    dailyRentalPrice: 64.99,
    availabilityStatus: 'available',
    location: { city: 'Portland', state: 'OR', address: '555 Green Street' },
    features: ['GPS', 'Bluetooth', 'Backup Camera'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ],
    carRating: { average: 4.0, count: 1 }
  },
  {
    carId: 'CAR014',
    carType: 'SUV',
    company: 'Subaru',
    model: 'Outback',
    year: 2024,
    transmissionType: 'Automatic',
    fuelType: 'Gasoline',
    numberOfSeats: 5,
    dailyRentalPrice: 84.99,
    availabilityStatus: 'available',
    location: { city: 'Minneapolis', state: 'MN', address: '777 Lake Drive' },
    features: ['GPS', 'Bluetooth', 'Backup Camera', 'AWD', 'Roof Rails'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ],
    carRating: { average: 4.2, count: 1 }
  },
  {
    carId: 'CAR015',
    carType: 'Sedan',
    company: 'Audi',
    model: 'A4',
    year: 2024,
    transmissionType: 'Automatic',
    fuelType: 'Gasoline',
    numberOfSeats: 5,
    dailyRentalPrice: 134.99,
    availabilityStatus: 'available',
    location: { city: 'Washington', state: 'DC', address: '888 Capital Circle' },
    features: ['GPS', 'Bluetooth', 'Backup Camera', 'Leather Seats', 'Premium Sound'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ],
    carRating: { average: 4.6, count: 1 }
  },
  {
    carId: 'CAR016',
    carType: 'Convertible',
    company: 'Ford',
    model: 'Mustang',
    year: 2024,
    transmissionType: 'Automatic',
    fuelType: 'Gasoline',
    numberOfSeats: 4,
    dailyRentalPrice: 124.99,
    availabilityStatus: 'available',
    location: { city: 'Las Vegas', state: 'NV', address: '999 Strip Avenue' },
    features: ['GPS', 'Bluetooth', 'Backup Camera', 'Convertible Top', 'Sport Mode'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ],
    carRating: { average: 4.5, count: 1 }
  },
  {
    carId: 'CAR017',
    carType: 'Compact',
    company: 'Kia',
    model: 'Forte',
    year: 2023,
    transmissionType: 'Automatic',
    fuelType: 'Gasoline',
    numberOfSeats: 5,
    dailyRentalPrice: 49.99,
    availabilityStatus: 'available',
    location: { city: 'Nashville', state: 'TN', address: '111 Music Row' },
    features: ['GPS', 'Bluetooth'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ],
    carRating: { average: 3.6, count: 1 }
  },
  {
    carId: 'CAR018',
    carType: 'SUV',
    company: 'Volvo',
    model: 'XC60',
    year: 2024,
    transmissionType: 'Automatic',
    fuelType: 'Hybrid',
    numberOfSeats: 5,
    dailyRentalPrice: 104.99,
    availabilityStatus: 'available',
    location: { city: 'San Diego', state: 'CA', address: '222 Coast Highway' },
    features: ['GPS', 'Bluetooth', 'Backup Camera', 'Safety Features', 'Sunroof'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ]
  },
  {
    carId: 'CAR019',
    carType: 'Sedan',
    company: 'Lexus',
    model: 'ES 350',
    year: 2024,
    transmissionType: 'Automatic',
    fuelType: 'Gasoline',
    numberOfSeats: 5,
    dailyRentalPrice: 144.99,
    availabilityStatus: 'available',
    location: { city: 'Austin', state: 'TX', address: '333 Live Music Street' },
    features: ['GPS', 'Bluetooth', 'Backup Camera', 'Leather Seats', 'Premium Sound'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ],
    carRating: { average: 4.6, count: 1 }
  },
  {
    carId: 'CAR020',
    carType: 'Van',
    company: 'Toyota',
    model: 'Sienna',
    year: 2024,
    transmissionType: 'Automatic',
    fuelType: 'Hybrid',
    numberOfSeats: 8,
    dailyRentalPrice: 114.99,
    availabilityStatus: 'available',
    location: { city: 'Philadelphia', state: 'PA', address: '444 Historic Avenue' },
    features: ['GPS', 'Bluetooth', 'Backup Camera', 'Sliding Doors', 'Third Row'],
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'
    ],
    carRating: { average: 4.4, count: 1 }
  }
];

async function seedCars() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing cars
    await Car.deleteMany({});
    console.log('Cleared existing cars');

    // Insert new cars
    const insertedCars = await Car.insertMany(cars);
    console.log(`✅ Seeded ${insertedCars.length} cars successfully!`);
    console.log('✅ All cars now have:');
    console.log('   - Images (3 per car)');
    console.log('   - Year displayed in cards');
    console.log('   - Ratings and reviews support');

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding cars:', error);
    process.exit(1);
  }
}

seedCars();
