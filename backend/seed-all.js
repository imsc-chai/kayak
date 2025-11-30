const { exec } = require('child_process');
const path = require('path');

console.log('🌱 Starting database seeding process...\n');

const services = [
  { name: 'Flights', script: 'backend/services/flight-service/seed.js' },
  { name: 'Hotels', script: 'backend/services/hotel-service/seed.js' },
  { name: 'Cars', script: 'backend/services/car-service/seed.js' },
  { name: 'Users', script: 'backend/services/user-service/seed.js' },
  { name: 'Admins', script: 'backend/services/admin-service/seed.js' }
];

async function runSeed(service) {
  return new Promise((resolve, reject) => {
    console.log(`📦 Seeding ${service.name}...`);
    exec(`node ${service.script}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error seeding ${service.name}:`, error.message);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`⚠️  ${service.name} stderr:`, stderr);
      }
      console.log(stdout);
      console.log(`✅ ${service.name} seeded successfully!\n`);
      resolve();
    });
  });
}

async function seedAll() {
  try {
    for (const service of services) {
      await runSeed(service);
      // Small delay between seeds
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('🎉 All seeding completed successfully!');
    console.log('\n📋 SUMMARY:');
    console.log('  ✅ 20 Flights');
    console.log('  ✅ 20 Hotels');
    console.log('  ✅ 20 Cars');
    console.log('  ✅ 5 Users');
    console.log('  ✅ 3 Admins');
    console.log('\n💡 Remember: Data will persist as long as MongoDB data directory exists!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedAll();

