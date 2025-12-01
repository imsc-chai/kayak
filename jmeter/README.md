# JMeter Performance Testing

This folder contains all files needed for performance testing the Kayak system.

## Quick Start

### 1. Setup Configuration
```powershell
# For B (Base) - No Redis, No Kafka
.\setup-base-config.ps1

# For B + S (Redis) - Redis enabled, Kafka disabled
.\setup-base-plus-redis-config.ps1

# For B + S + K (Redis + Kafka) - Both enabled
.\setup-base-plus-redis-plus-kafka-config.ps1
```

### 2. Start Services
```powershell
cd ..
# For Base config:
.\start-all-base.ps1

# For B+S or B+S+K configs:
.\start-all.ps1
```

### 3. Run Test
```powershell
cd jmeter
.\run-jmeter-test.ps1 "config-name" "results-filename"
```

Example:
```powershell
.\run-jmeter-test.ps1 "base" "results-base"
.\run-jmeter-test.ps1 "base-plus-redis" "results-base-plus-redis"
.\run-jmeter-test.ps1 "base-plus-redis-plus-kafka" "results-base-plus-redis-plus-kafka"
```

## Files

### Essential Files
- `KAYAK_JMETER_TEST_PLAN.jmx` - JMeter test plan (100 concurrent users)
- `run-jmeter-test.ps1` - Script to run tests and generate HTML reports
- `setup-base-config.ps1` - Setup script for B (Base) configuration
- `setup-base-plus-redis-config.ps1` - Setup script for B + S configuration
- `setup-base-plus-redis-plus-kafka-config.ps1` - Setup script for B + S + K configuration

### Results
- `results-base.csv` - CSV results for Base configuration
- `results-base-plus-redis.csv` - CSV results for B + S configuration
- `results-base-plus-redis-plus-kafka.csv` - CSV results for B + S + K configuration
- `results-base-html/` - HTML report for Base configuration
- `results-base-plus-redis-html/` - HTML report for B + S configuration
- `results-base-plus-redis-plus-kafka-html/` - HTML report for B + S + K configuration

### Documentation
- `PERFORMANCE_TEST_RESULTS.md` - Complete analysis and explanation of results
- `TESTING_STEPS.md` - Step-by-step testing guide

## Test Plan Details

- **Concurrent Users**: 100
- **Ramp-up Period**: 10 seconds
- **Endpoints Tested**:
  - GET /api/flights?limit=100
  - GET /api/hotels?limit=100
  - GET /api/cars?limit=100
- **Total Requests**: 300 (100 users × 3 endpoints)

## Results Summary

| Configuration | Avg Response Time | Improvement |
|--------------|-------------------|-------------|
| B (Base) | 37.78 ms | Baseline |
| B + S (Redis) | 22.64 ms | 1.67x faster (40% improvement) |
| B + S + K | 27.98 ms | 1.35x faster (26% improvement) |

See `PERFORMANCE_TEST_RESULTS.md` for detailed analysis.

