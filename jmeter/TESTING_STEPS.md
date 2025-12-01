# JMeter Testing Steps - Quick Reference

## Current Status: B (Base) Configuration Ready ✅

Redis and Kafka are now stopped. Your services will run without caching or messaging.

## Step 1: Restart All Services

**IMPORTANT: Use `start-all-base.ps1` (NOT `start-all.ps1`)**

```powershell
cd D:\kayak
.\start-all-base.ps1
```

**Wait for all services to start:**
- Check each terminal window
- Look for "Server running on port XXXX" messages
- Services will log Redis/Kafka connection errors - **this is NORMAL and EXPECTED** for Base config
- Services will still work, just without caching/messaging

## Step 2: Verify Services Are Running

Open a browser and test:
- http://localhost:5000/api/flights?limit=10
- http://localhost:5000/api/hotels?limit=10
- http://localhost:5000/api/cars?limit=10

All should return data (even without Redis/Kafka).

## Step 3: Run JMeter Test

### Option A: Using JMeter GUI (Recommended for first time)

1. **Open JMeter:**
   - Navigate to your JMeter installation folder
   - Run: `bin\jmeter.bat` (Windows)

2. **Load Test Plan:**
   - File → Open
   - Navigate to: `D:\kayak\jmeter\KAYAK_JMETER_TEST_PLAN.jmx`
   - Click Open

3. **Verify Settings:**
   - Thread Group → Number of Threads: 100
   - Thread Group → Ramp-up period: 10 seconds
   - Thread Group → Loop Count: 1

4. **Run Test:**
   - Click green "Play" button (top toolbar)
   - Watch the test run (30-60 seconds)
   - Wait for "Test completed" message

5. **View Results:**
   - Click on "Summary Report" in the left panel
   - You'll see metrics for all 3 requests (Flights, Hotels, Cars)

6. **Save Results:**
   - Right-click "Summary Report" → Save Table Data
   - Save as: `D:\kayak\jmeter\results-base.csv`

### Option B: Using JMeter Command Line (Faster)

```powershell
cd D:\kayak\jmeter
"C:\apache-jmeter-5.6\bin\jmeter.bat" -n -t KAYAK_JMETER_TEST_PLAN.jmx -l results-base.csv -e -o results-base-html
```

(Replace `C:\apache-jmeter-5.6` with your JMeter path)

## Step 4: Record Key Metrics

From the Summary Report, note these values:

| Metric | Value |
|--------|-------|
| Average (ms) | _____ |
| Median (ms) | _____ |
| 90th pct (ms) | _____ |
| 95th pct (ms) | _____ |
| Min (ms) | _____ |
| Max (ms) | _____ |
| Error % | _____ |
| Throughput | _____ |

## Step 5: Move to Next Configuration

After completing B (Base) test:

1. **Setup B + S (Redis):**
   ```powershell
   cd D:\kayak\jmeter
   .\setup-base-plus-redis-config.ps1
   cd ..
   .\start-all.ps1
   ```
   (Now use regular `start-all.ps1` since Redis is enabled)

2. **Run same JMeter test**
3. **Save as:** `results-base-plus-redis.csv`

4. **Setup B + S + K (Redis + Kafka):**
   ```powershell
   cd D:\kayak\jmeter
   .\setup-base-plus-redis-plus-kafka-config.ps1
   cd ..
   .\start-all.ps1
   ```

5. **Run same JMeter test**
6. **Save as:** `results-base-plus-redis-plus-kafka.csv`

## Important Notes

- **For B (Base) config: Use `start-all-base.ps1`** - This doesn't start Redis/Kafka
- **For B+S and B+S+K configs: Use `start-all.ps1`** - This starts Redis/Kafka
- **Services will log Redis/Kafka connection errors in Base config** - This is normal and expected
- **Each test should take 30-60 seconds** with 100 threads
- **Clear Redis cache between B+S and B+S+K tests** for fair comparison
- **Restart services after each configuration change**

## Troubleshooting

### Services won't start:
- Check MongoDB is running: `mongod --port 27020`
- Check port conflicts: `netstat -ano | findstr :5000`

### JMeter errors:
- Check Java: `java -version`
- Increase heap: Edit `bin\jmeter.bat`, add: `set HEAP=-Xms512m -Xmx2048m`

### No results in Summary Report:
- Make sure test completed (green checkmark)
- Check "View Results Tree" for errors

## Expected Results Summary

After all 4 tests, you should see:
- **B (Base):** Slowest (direct DB queries)
- **B + S:** 5-10x faster (Redis caching)
- **B + S + K:** Similar to B+S, better scalability
- **B + S + K + Other:** Best performance

Good luck! 🚀

