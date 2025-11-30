const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27020/kayak_users';

const users = [
  {
    userId: '123-45-6789', // SSN format: ###-##-####
    firstName: 'John',
    lastName: 'Doe',
    address: '123 Main Street',
    city: 'New York',
    state: 'NY', // Valid US state abbreviation
    zipCode: '10001', // Format: ##### or #####-####
    phoneNumber: '1234567890',
    email: 'john.doe@example.com',
    password: 'password123', // Will be hashed by pre-save hook
    profileImage: 'https://randomuser.me/api/portraits/men/1.jpg',
    gender: 'Male',
    dateOfBirth: new Date('1990-01-15'),
    country: 'USA',
    preferredLanguage: 'English',
    currency: 'USD',
    creditCard: {
      cardNumber: '4111111111111111',
      cardHolderName: 'John Doe',
      expiryDate: '12/26',
      cvv: '123'
    }
  },
  {
    userId: '234-56-7890', // SSN format: ###-##-####
    firstName: 'Jane',
    lastName: 'Smith',
    address: '456 Oak Avenue',
    city: 'Los Angeles',
    state: 'California', // Valid US state full name
    zipCode: '90210-1234', // Format: #####-####
    phoneNumber: '2345678901',
    email: 'jane.smith@example.com',
    password: 'password123',
    profileImage: 'https://randomuser.me/api/portraits/women/2.jpg',
    gender: 'Female',
    dateOfBirth: new Date('1992-05-20'),
    country: 'USA',
    preferredLanguage: 'English',
    currency: 'USD',
    creditCard: {
      cardNumber: '5555555555554444',
      cardHolderName: 'Jane Smith',
      expiryDate: '06/27',
      cvv: '456'
    }
  },
  {
    userId: '345-67-8901', // SSN format: ###-##-####
    firstName: 'Michael',
    lastName: 'Johnson',
    address: '789 Pine Road',
    city: 'Chicago',
    state: 'IL', // Valid US state abbreviation
    zipCode: '60601',
    phoneNumber: '3456789012',
    email: 'michael.johnson@example.com',
    password: 'password123',
    profileImage: 'https://randomuser.me/api/portraits/men/3.jpg',
    gender: 'Male',
    dateOfBirth: new Date('1988-08-10'),
    country: 'USA',
    preferredLanguage: 'English',
    currency: 'USD',
    creditCard: {
      cardNumber: '378282246310005',
      cardHolderName: 'Michael Johnson',
      expiryDate: '03/28',
      cvv: '789'
    }
  },
  {
    userId: '456-78-9012', // SSN format: ###-##-####
    firstName: 'Emily',
    lastName: 'Williams',
    address: '321 Elm Street',
    city: 'Miami',
    state: 'Florida', // Valid US state full name
    zipCode: '33139-5678', // Format: #####-####
    phoneNumber: '4567890123',
    email: 'emily.williams@example.com',
    password: 'password123',
    profileImage: 'https://randomuser.me/api/portraits/women/4.jpg',
    gender: 'Female',
    dateOfBirth: new Date('1995-03-25'),
    country: 'USA',
    preferredLanguage: 'English',
    currency: 'USD',
    creditCard: {
      cardNumber: '6011111111111117',
      cardHolderName: 'Emily Williams',
      expiryDate: '09/26',
      cvv: '012'
    }
  },
  {
    userId: '567-89-0123', // SSN format: ###-##-####
    firstName: 'David',
    lastName: 'Brown',
    address: '654 Maple Drive',
    city: 'Seattle',
    state: 'WA', // Valid US state abbreviation
    zipCode: '98101',
    phoneNumber: '5678901234',
    email: 'david.brown@example.com',
    password: 'password123',
    profileImage: 'https://randomuser.me/api/portraits/men/5.jpg',
    gender: 'Male',
    dateOfBirth: new Date('1991-11-30'),
    country: 'USA',
    preferredLanguage: 'English',
    currency: 'USD',
    creditCard: {
      cardNumber: '3530111333300000',
      cardHolderName: 'David Brown',
      expiryDate: '11/27',
      cvv: '345'
    }
  }
];

async function seedUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Hash passwords before inserting (insertMany bypasses pre-save hooks)
    const usersWithHashedPasswords = await Promise.all(
      users.map(async (user) => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        return {
          ...user,
          password: hashedPassword
        };
      })
    );

    // Insert new users with hashed passwords
    const insertedUsers = await User.insertMany(usersWithHashedPasswords);
    console.log(`✅ Seeded ${insertedUsers.length} users successfully!`);
    console.log('\n📋 USER CREDENTIALS:');
    console.log('═══════════════════════════════════════════════════════════');
    users.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log(`  SSN (User ID): ${user.userId}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: password123`);
      console.log(`  Name: ${user.firstName} ${user.lastName}`);
      console.log(`  Address: ${user.address}, ${user.city}, ${user.state} ${user.zipCode}`);
    });
    console.log('\n═══════════════════════════════════════════════════════════\n');

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();

