# Bulk Seeding Instructions - 10,000 Records

This guide explains how to seed 10,000 records (2,500 flights, 3,500 hotels, 4,000 cars) into your database for performance testing.

## Prerequisites

1. **MongoDB must be running** on port 27020
   ```powershell
   # If not running, start MongoDB:
   cd frontend
   .\start-mongodb-27020.ps1
   ```

2. **All services should be stopped** (optional, but recommended to avoid conflicts)

## Option 1: Seed All at Once (Recommended)

Run the master script that seeds all three services:

```powershell
cd backend
node seed-bulk-all.js
```

This will:
- Seed 2,500 flights
- Seed 3,500 hotels  
- Seed 4,000 cars
- Total: 10,000 records

**Estimated time:** 5-10 minutes (depending on your system)

## Option 2: Seed Individually

If you prefer to seed each service separately:

### Seed Flights (2,500 records)
```powershell
cd backend/services/flight-service
node seed-bulk.js
```

### Seed Hotels (3,500 records)
```powershell
cd backend/services/hotel-service
node seed-bulk.js
```

### Seed Cars (4,000 records)
```powershell
cd backend/services/car-service
node seed-bulk.js
```

## What Gets Seeded

### Flights (2,500)
- Random flights between 20 major US airports
- Various airlines (American, Delta, United, Southwest, etc.)
- Different flight classes (Economy, Business, First)
- Dates spread over 90 days from Dec 1, 2025
- Realistic pricing and seat availability

### Hotels (3,500)
- Hotels in 30 major US cities
- Star ratings: 3-5 stars
- Room types: Single, Double, Suite, Deluxe, Executive
- 50-250 rooms per hotel
- Various amenities (WiFi, Pool, Gym, Spa, etc.)

### Cars (4,000)
- Cars in 30 major US cities
- Various car types: SUV, Sedan, Compact, Luxury, etc.
- Multiple car companies (Toyota, Honda, Ford, BMW, etc.)
- Different models per company
- Realistic pricing based on car type

## Important Notes

1. **Existing Data**: The bulk seed scripts will ADD to existing data. If you want to start fresh:
   - Uncomment the `deleteMany()` lines in each seed-bulk.js file
   - Or manually clear collections before seeding

2. **Database Size**: 10,000 records will increase your database size significantly. Make sure you have enough disk space.

3. **Performance**: Seeding 10,000 records may take 5-10 minutes. Be patient!

4. **Verification**: After seeding, verify the counts:
   ```javascript
   // In MongoDB shell or via API:
   // Flights: db.flights.countDocuments()
   // Hotels: db.hotels.countDocuments()
   // Cars: db.cars.countDocuments()
   ```

## Troubleshooting

### Error: "Cannot connect to MongoDB"
- Make sure MongoDB is running on port 27020
- Check your `.env` file has correct `MONGODB_URI`

### Error: "Memory issues" or "Timeout"
- Seed in smaller batches (modify the scripts to seed 1000 at a time)
- Close other applications to free up memory

### Error: "Duplicate key error"
- This is normal if you're re-running the seed script
- The scripts use `insertMany` with `ordered: false` to continue on errors
- Some duplicates may be skipped, but most records will be inserted

## After Seeding

Once seeding is complete, you can:
1. Start all services: `.\start-all.ps1`
2. Run JMeter performance tests with 100 simultaneous users
3. Compare performance across B, B+S, B+S+K configurations

## Expected Output

```
🌱 Starting bulk seeding for 10,000 records...

🔄 Seeding Flights...
✅ Connected to MongoDB
🔄 Generating 2500 flights...
   Generated 100/2500 flights...
   Generated 200/2500 flights...
   ...
✅ Successfully seeded 2500 flights!

🔄 Seeding Hotels...
✅ Connected to MongoDB
🔄 Generating 3500 hotels...
   Generated 100/3500 hotels...
   ...
✅ Successfully seeded 3500 hotels!

🔄 Seeding Cars...
✅ Connected to MongoDB
🔄 Generating 4000 cars...
   Generated 100/4000 cars...
   ...
✅ Successfully seeded 4000 cars!

✅ All bulk seeding completed successfully!
📊 Total records seeded: 10,000
```

