# 🧪 Redis Caching Testing Guide

## ✅ Step 1: Verify Redis is Running

```powershell
# Check if Redis container is running
docker ps --filter "name=kayak-redis"

# Should show:
# NAMES         STATUS         PORTS
# kayak-redis   Up X minutes   0.0.0.0:6379->6379/tcp

# Test Redis connection
docker exec kayak-redis redis-cli ping
# Should return: PONG
```

---

## ✅ Step 2: Start All Services

Make sure all services are running:
```powershell
# From root directory
.\start-all.ps1

# OR start individually:
cd backend\services\user-service
npm start

cd backend\services\flight-service
npm start

# etc...
```

**Check service logs for:**
```
✅ Redis client connected
✅ Redis client ready
✅ Redis connected successfully
```

---

## 🧪 Step 3: Test Caching - User Service

### Test 1: Get User by ID (Cache Test)

**Terminal 1: Watch User Service logs**
- Look for `[Cache HIT]` or `[Cache MISS]` messages

**Terminal 2: Make API calls**

```powershell
# Replace {userId} with actual user ID from your database
# First request - should be Cache MISS
Invoke-WebRequest -Uri "http://localhost:5001/api/users/692cb77e73b6f6b497c2eb3e" -Method GET | Select-Object -ExpandProperty Content

# Second request (within 5 minutes) - should be Cache HIT
Invoke-WebRequest -Uri "http://localhost:5001/api/users/692cb77e73b6f6b497c2eb3e" -Method GET | Select-Object -ExpandProperty Content
```

**Expected in User Service terminal:**
```
❌ [Cache MISS] User 692cb77e73b6f6b497c2eb3e - fetching from DB
✅ Returning user data for: user@email.com (692cb77e73b6f6b497c2eb3e)

✅ [Cache HIT] User 692cb77e73b6f6b497c2eb3e
```

**Expected in response:**
- First request: `"cached": false`
- Second request: `"cached": true`

---

## 🧪 Step 4: Test Caching - Flight Service

### Test 2: Search Flights (Cache Test)

**Terminal 1: Watch Flight Service logs**

**Terminal 2: Make API calls**

```powershell
# First request - Cache MISS
Invoke-WebRequest -Uri "http://localhost:5002/api/flights?from=NYC&to=LAX&page=1&limit=10" -Method GET | Select-Object -ExpandProperty Content

# Second request (within 2 minutes) - Cache HIT
Invoke-WebRequest -Uri "http://localhost:5002/api/flights?from=NYC&to=LAX&page=1&limit=10" -Method GET | Select-Object -ExpandProperty Content
```

**Expected in Flight Service terminal:**
```
❌ [Cache MISS] Flight search: NYC → LAX
✅ [Cache HIT] Flight search: NYC → LAX
```

---

## 🧪 Step 5: Test Caching - Hotel Service

### Test 3: Search Hotels (Cache Test)

```powershell
# First request - Cache MISS
Invoke-WebRequest -Uri "http://localhost:5003/api/hotels?city=New York&page=1&limit=10" -Method GET | Select-Object -ExpandProperty Content

# Second request - Cache HIT
Invoke-WebRequest -Uri "http://localhost:5003/api/hotels?city=New York&page=1&limit=10" -Method GET | Select-Object -ExpandProperty Content
```

**Expected in Hotel Service terminal:**
```
❌ [Cache MISS] Hotel search: New York
✅ [Cache HIT] Hotel search: New York
```

---

## 🧪 Step 6: Test Caching - Admin Service

### Test 4: Get Analytics (Cache Test)

**Note:** You need to be logged in as admin first. Get admin token from login.

```powershell
# Login as admin (get token)
$loginResponse = Invoke-WebRequest -Uri "http://localhost:5006/api/admin/login" -Method POST -Body (@{email="admin@kayak.com"; password="admin123"} | ConvertTo-Json) -ContentType "application/json"
$token = ($loginResponse.Content | ConvertFrom-Json).data.token

# First request - Cache MISS
$headers = @{Authorization = "Bearer $token"}
Invoke-WebRequest -Uri "http://localhost:5006/api/admin/analytics" -Method GET -Headers $headers | Select-Object -ExpandProperty Content

# Second request (within 5 minutes) - Cache HIT
Invoke-WebRequest -Uri "http://localhost:5006/api/admin/analytics" -Method GET -Headers $headers | Select-Object -ExpandProperty Content
```

**Expected in Admin Service terminal:**
```
❌ [Cache MISS] Analytics (all - all) - fetching from services
✅ [Cache HIT] Analytics (all - all)
```

---

## 🔍 Step 7: Inspect Redis Directly

### Connect to Redis CLI

```powershell
docker exec -it kayak-redis redis-cli
```

### Useful Redis Commands

```redis
# See all cached keys
KEYS *

# See keys by pattern
KEYS user:*
KEYS flight:*
KEYS hotel:*
KEYS car:*
KEYS admin:*

# Get a specific cached value
GET user:692cb77e73b6f6b497c2eb3e

# Check TTL (Time To Live) - how long until cache expires
TTL user:692cb77e73b6f6b497c2eb3e
# Returns: seconds until expiry, -1 if no expiry, -2 if key doesn't exist

# Count keys by pattern
KEYS user:* | wc -l  # (in bash)
# In Redis CLI, use:
DBSIZE  # Total keys

# Delete a specific key
DEL user:692cb77e73b6f6b497c2eb3e

# Delete all keys matching pattern (CAREFUL!)
# In Redis CLI, you'd need to use SCAN or get keys and delete
KEYS user:* | xargs redis-cli DEL  # (bash)
```

### Exit Redis CLI
```redis
exit
```

---

## 🧪 Step 8: Test Cache Invalidation

### Test: Update User (should invalidate cache)

```powershell
# 1. Get user (creates cache)
Invoke-WebRequest -Uri "http://localhost:5001/api/users/692cb77e73b6f6b497c2eb3e" -Method GET

# 2. Update user (should invalidate cache)
$headers = @{Authorization = "Bearer YOUR_TOKEN"; "Content-Type" = "application/json"}
$body = @{firstName = "UpdatedName"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:5001/api/users/692cb77e73b6f6b497c2eb3e" -Method PUT -Headers $headers -Body $body

# 3. Get user again (should be Cache MISS, then new cache created)
Invoke-WebRequest -Uri "http://localhost:5001/api/users/692cb77e73b6f6b497c2eb3e" -Method GET
```

**Expected:**
- Step 1: `[Cache MISS]` → `[Cache HIT]` on second call
- Step 2: Cache invalidated (no log message, but cache deleted)
- Step 3: `[Cache MISS]` (cache was cleared, fetching fresh data)

---

## 🧪 Step 9: Test Cache via Frontend

1. **Open browser:** `http://localhost:5173`
2. **Login** as a user
3. **Navigate to different pages:**
   - View profile (caches user data)
   - Search flights (caches search results)
   - Search hotels (caches search results)
   - Search cars (caches search results)

4. **Watch service terminals** for:
   - First load: `[Cache MISS]`
   - Refresh page: `[Cache HIT]` (if within TTL)

---

## 📊 Expected Cache Behavior Summary

| Service | What's Cached | TTL | Cache Key Pattern |
|---------|--------------|-----|-------------------|
| **User Service** | User data | 5 min | `user:{userId}` |
| **Flight Service** | Search results | 2 min | `flight:search:{query}` |
| **Flight Service** | Individual flight | 5 min | `flight:{flightId}` |
| **Hotel Service** | Search results | 2 min | `hotel:search:{query}` |
| **Hotel Service** | Individual hotel | 5 min | `hotel:{hotelId}` |
| **Car Service** | Search results | 2 min | `car:search:{query}` |
| **Car Service** | Individual car | 5 min | `car:{carId}` |
| **Admin Service** | Analytics | 5 min | `admin:analytics:{params}` |
| **Admin Service** | Admin list | 5 min | `admin:list` |

---

## 🎯 Quick Test Checklist

- [ ] Redis container is running (`docker ps`)
- [ ] All services show "✅ Redis connected successfully"
- [ ] First API call shows `[Cache MISS]`
- [ ] Second API call (within TTL) shows `[Cache HIT]`
- [ ] Response includes `"cached": true` on cache hit
- [ ] Redis CLI shows cached keys (`KEYS *`)
- [ ] Cache invalidates on update/delete operations
- [ ] Cache expires after TTL (wait 5+ minutes, should be MISS)

---

## 🐛 Troubleshooting

### Redis not connecting?
```powershell
# Check if Redis is running
docker ps --filter "name=kayak-redis"

# Check Redis logs
docker logs kayak-redis

# Restart Redis
docker restart kayak-redis
```

### No cache HIT messages?
- Make sure you're making the **exact same request** (same URL, same parameters)
- Check if TTL expired (wait less than TTL time)
- Verify Redis is actually connected (check service logs)

### Cache not invalidating?
- Check service logs for errors
- Verify the update/delete operation succeeded
- Check Redis directly: `KEYS *` to see if key still exists

---

## 📝 Notes

- **Cache TTL:** Search results = 2 minutes, Individual items = 5 minutes
- **Cache invalidation:** Happens automatically on create/update/delete
- **Fallback:** If Redis fails, services continue working (just no caching)
- **Performance:** Cache HIT responses are **much faster** than cache MISS

---

**Happy Testing! 🚀**

