const { exec } = require('child_process');
const path = require('path');

console.log('🌱 Seeding to reach 10,000 total records...\n');
console.log('Target distribution:');
console.log('  - Flights: ~4,000');
console.log('  - Hotels: ~3,000');
console.log('  - Cars: ~3,000');
console.log('  Total: ~10,000\n');

const seedScripts = [
  { name: 'Flights', path: path.join(__dirname, 'services/flight-service/seed-additional.js') },
  { name: 'Hotels', path: path.join(__dirname, 'services/hotel-service/seed-additional.js') }
];

async function runSeedScript(script) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 Seeding additional ${script.name}...`);
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

async function seedTo10000Final() {
  try {
    // Update hotel target to 3000
    const hotelSeedPath = path.join(__dirname, 'services/hotel-service/seed-additional.js');
    const fs = require('fs');
    let hotelSeedContent = fs.readFileSync(hotelSeedPath, 'utf8');
    hotelSeedContent = hotelSeedContent.replace(/const targetCount = 3500;/, 'const targetCount = 3000;');
    fs.writeFileSync(hotelSeedPath, hotelSeedContent);
    console.log('✅ Updated hotel target to 3,000\n');

    for (const script of seedScripts) {
      await runSeedScript(script);
    }
    console.log('\n✅ Seeding completed!');
    console.log('📊 Expected totals:');
    console.log('   - Flights: ~4,000');
    console.log('   - Hotels: ~3,000');
    console.log('   - Cars: ~3,000 (already have 3,180+)');
    console.log('   - Total: ~10,000+ records');
    console.log('\n💡 Verify counts in your database or admin UI');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedTo10000Final();

