const { exec } = require('child_process');
const path = require('path');

console.log('🌱 Starting bulk seeding for 10,000 records...\n');
console.log('This will seed:');
console.log('  - 2,500 flights');
console.log('  - 3,500 hotels');
console.log('  - 4,000 cars');
console.log('  Total: 10,000 records\n');

const seedScripts = [
  { name: 'Flights', path: path.join(__dirname, 'services/flight-service/seed-bulk.js') },
  { name: 'Hotels', path: path.join(__dirname, 'services/hotel-service/seed-bulk.js') },
  { name: 'Cars', path: path.join(__dirname, 'services/car-service/seed-bulk.js') }
];

async function runSeedScript(script) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 Seeding ${script.name}...`);
    const process = exec(`node ${script.path}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error seeding ${script.name}:`, error);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`⚠️ ${script.name} stderr:`, stderr);
      }
      console.log(stdout);
      resolve();
    });
  });
}

async function seedAll() {
  try {
    for (const script of seedScripts) {
      await runSeedScript(script);
    }
    console.log('\n✅ All bulk seeding completed successfully!');
    console.log('📊 Total records seeded: 10,000');
    console.log('   - 2,500 flights');
    console.log('   - 3,500 hotels');
    console.log('   - 4,000 cars');
  } catch (error) {
    console.error('\n❌ Bulk seeding failed:', error);
    process.exit(1);
  }
}

seedAll();

