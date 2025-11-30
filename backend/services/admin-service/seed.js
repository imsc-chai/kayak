const mongoose = require('mongoose');
const Admin = require('./src/models/Admin');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27020/kayak_admin';

const admins = [
  {
    adminId: 'ADM001',
    firstName: 'Admin',
    lastName: 'Super',
    address: '100 Admin Street',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    phoneNumber: '1111111111',
    email: 'admin@kayak.com',
    password: 'admin123', // Will be hashed by pre-save hook
    role: 'super_admin',
    accessLevel: 'full'
  },
  {
    adminId: 'ADM002',
    firstName: 'Manager',
    lastName: 'Admin',
    address: '200 Management Ave',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90210',
    phoneNumber: '2222222222',
    email: 'manager@kayak.com',
    password: 'admin123',
    role: 'admin',
    accessLevel: 'full'
  },
  {
    adminId: 'ADM003',
    firstName: 'Moderator',
    lastName: 'User',
    address: '300 Mod Street',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60601',
    phoneNumber: '3333333333',
    email: 'moderator@kayak.com',
    password: 'admin123',
    role: 'moderator',
    accessLevel: 'limited'
  }
];

async function seedAdmins() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing admins
    await Admin.deleteMany({});
    console.log('Cleared existing admins');

    // Hash passwords before inserting (insertMany bypasses pre-save hooks)
    const adminsWithHashedPasswords = await Promise.all(
      admins.map(async (admin) => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(admin.password, salt);
        return {
          ...admin,
          password: hashedPassword
        };
      })
    );

    // Insert new admins with hashed passwords
    const insertedAdmins = await Admin.insertMany(adminsWithHashedPasswords);
    console.log(`✅ Seeded ${insertedAdmins.length} admins successfully!`);
    console.log('\n📋 ADMIN CREDENTIALS:');
    console.log('═══════════════════════════════════════════════════════════');
    admins.forEach((admin, index) => {
      console.log(`\nAdmin ${index + 1}:`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Password: admin123`);
      console.log(`  Name: ${admin.firstName} ${admin.lastName}`);
      console.log(`  Role: ${admin.role}`);
      console.log(`  Access Level: ${admin.accessLevel}`);
    });
    console.log('\n═══════════════════════════════════════════════════════════\n');

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding admins:', error);
    process.exit(1);
  }
}

seedAdmins();

