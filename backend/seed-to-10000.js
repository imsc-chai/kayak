const { exec } = require('child_process');
const path = require('path');

console.log('🌱 Seeding additional records to reach 10,000 total...\n');
console.log('Current counts:');
console.log('  - Flights: ~2,521');
console.log('  - Hotels: ~680 (need ~2,820 more to reach 3,500)');
console.log('  - Cars: ~3,182 (need ~818 more to reach 4,000)');
console.log('\nTarget: 2,500 flights + 3,500 hotels + 4,000 cars = 10,000 total\n');

const seedScripts = [
  { name: 'Hotels', path: path.join(__dirname, 'services/hotel-service/seed-additional.js') },
  { name: 'Cars', path: path.join(__dirname, 'services/car-service/seed-additional.js') }
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

async function seedTo10000() {
  try {
    for (const script of seedScripts) {
      await runSeedScript(script);
    }
    console.log('\n✅ Additional seeding completed!');
    console.log('📊 Expected totals:');
    console.log('   - Flights: ~2,521');
    console.log('   - Hotels: ~3,500');
    console.log('   - Cars: ~4,000');
    console.log('   - Total: ~10,021 records');
    console.log('\n💡 Verify counts in your database or admin UI');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedTo10000();

