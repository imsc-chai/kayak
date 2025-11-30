"""
Service integration functions for AI Agent
Connects to existing microservices
"""
import httpx
import os
import sys
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import json

# Service URLs
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:5001")
FLIGHT_SERVICE_URL = os.getenv("FLIGHT_SERVICE_URL", "http://localhost:5002")
HOTEL_SERVICE_URL = os.getenv("HOTEL_SERVICE_URL", "http://localhost:5003")
CAR_SERVICE_URL = os.getenv("CAR_SERVICE_URL", "http://localhost:5004")

async def get_user_data(user_id: str, token: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Get user data including preferences and booking history"""
    try:
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{USER_SERVICE_URL}/api/users/{user_id}",
                headers=headers
            )
            if response.status_code == 200:
                data = response.json()
                if data and isinstance(data, dict) and data.get("success"):
                    return data.get("data")
                return None
    except Exception as e:
        print(f"Error fetching user data: {e}")
        return None

async def search_flights(params: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Search flights with given parameters"""
    try:
        # Clean params - remove None values and ensure strings are properly formatted
        clean_params = {k: v for k, v in params.items() if v is not None and v != ""}
        print(f"🔍 Searching flights with params: {clean_params}")
        print(f"   URL: {FLIGHT_SERVICE_URL}/api/flights")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{FLIGHT_SERVICE_URL}/api/flights",
                params=clean_params
            )
            print(f"   Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data is None:
                    print(f"   Response data is None")
                    return []
                print(f"   Response success: {data.get('success') if data else 'N/A'}")
                
                if data and data.get("success"):
                    flights = data.get("data", [])
                    # Handle both single list and paginated response
                    if isinstance(flights, list):
                        print(f"✅ [FLIGHTS] Flight service returned {len(flights)} flights", flush=True)
                        if len(flights) > 0:
                            print(f"   [FLIGHTS] Sample destination: {flights[0].get('arrivalAirport', {}).get('city', 'N/A')}", flush=True)
                        sys.stdout.flush()
                        return flights
                    elif isinstance(flights, dict) and "flights" in flights:
                        flight_list = flights.get("flights", [])
                        print(f"✅ [FLIGHTS] Flight service returned {len(flight_list)} flights", flush=True)
                        sys.stdout.flush()
                        return flight_list
                else:
                    if data:
                        print(f"❌ [FLIGHTS] Flight service returned success=false: {data.get('message', 'Unknown error')}", flush=True)
                    else:
                        print(f"❌ [FLIGHTS] Flight service returned empty data", flush=True)
                    sys.stdout.flush()
            else:
                print(f"❌ [FLIGHTS] Flight service returned status {response.status_code}", flush=True)
                print(f"   [FLIGHTS] Response: {response.text[:200]}", flush=True)
                sys.stdout.flush()
            
            print(f"⚠️ [FLIGHTS] No flights found for params: {clean_params}", flush=True)
            sys.stdout.flush()
            return []
    except Exception as e:
        import traceback
        print(f"❌ [FLIGHTS] Error searching flights: {e}", flush=True)
        traceback.print_exc()
        sys.stdout.flush()
        return []

async def search_hotels(params: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Search hotels with given parameters"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{HOTEL_SERVICE_URL}/api/hotels",
                params=params
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    hotels = data.get("data", [])
                    return hotels if isinstance(hotels, list) else []
            return []
    except Exception as e:
        print(f"Error searching hotels: {e}")
        return []

async def search_cars(params: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Search cars with given parameters"""
    try:
        if params is None:
            params = {}
        # Note: Car service doesn't support "make" parameter directly
        # We'll filter by company (make) after getting results
        # Make a copy so we don't modify the original params dict
        search_params = {k: v for k, v in params.items() if k != "make"}
        make_filter = params.get("make")  # Keep make for filtering, but don't send to API
        
        import sys
        print(f"🔍 [CARS] Searching cars with params: {search_params}", flush=True)
        sys.stdout.flush()
        if make_filter:
            print(f"   [CARS] Will filter by make: {make_filter}", flush=True)
            sys.stdout.flush()
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{CAR_SERVICE_URL}/api/cars",
                params=search_params
            )
            if response.status_code == 200:
                data = response.json()
                if data and data.get("success"):
                    cars = data.get("data", [])
                    cars_list = cars if isinstance(cars, list) else []
                    
                    # Filter by make/brand if specified
                    if make_filter and cars_list:
                        make_lower = make_filter.lower().strip()
                        print(f"   🔍 Filtering {len(cars_list)} cars for make: '{make_filter}' (normalized: '{make_lower}')")
                        print(f"   Sample companies: {[c.get('company', 'N/A') for c in cars_list[:5]]}")
                        
                        filtered_cars = []
                        for car in cars_list:
                            car_company = car.get("company", "").lower().strip()
                            if car_company == make_lower:
                                filtered_cars.append(car)
                        
                        print(f"✅ [CARS] Filtered {len(cars_list)} → {len(filtered_cars)} cars matching make '{make_filter}'", flush=True)
                        sys.stdout.flush()
                        if len(filtered_cars) == 0:
                            available_makes = sorted(set(c.get("company", "") for c in cars_list if c.get("company")))
                            print(f"   ⚠️ [CARS] Available makes in results: {available_makes}", flush=True)
                            print(f"   ⚠️ [CARS] Looking for: '{make_filter}' (normalized: '{make_lower}')", flush=True)
                            sys.stdout.flush()
                        return filtered_cars
                    
                    print(f"✅ [CARS] Found {len(cars_list)} cars", flush=True)
                    sys.stdout.flush()
                    return cars_list
            return []
    except Exception as e:
        print(f"Error searching cars: {e}")
        import traceback
        traceback.print_exc()
        return []

def format_search_results(search_type: str, results: List[Dict[str, Any]], limit: int = 5) -> str:
    """Format search results for LLM context"""
    if not results:
        return f"No {search_type} found matching your criteria."
    
    from datetime import datetime
    
    formatted = []
    for i, item in enumerate(results[:limit], 1):
        if search_type == "flights":
            origin_city = item.get("departureAirport", {}).get("city", "Unknown")
            origin_code = item.get("departureAirport", {}).get("code", "")
            dest_city = item.get("arrivalAirport", {}).get("city", "Unknown")
            dest_code = item.get("arrivalAirport", {}).get("code", "")
            price = item.get("ticketPrice", item.get("price", item.get("fare", 0)))
            airline = item.get("airline", "Unknown Airline")
            flight_id = item.get("flightId", item.get("flightNumber", "N/A"))
            departure_time = item.get("departureDateTime", item.get("departureTime", ""))
            arrival_time = item.get("arrivalDateTime", item.get("arrivalTime", ""))
            duration = item.get("duration", item.get("flightDuration", ""))
            
            # Format times
            dep_time_str = ""
            arr_time_str = ""
            if departure_time:
                try:
                    if isinstance(departure_time, str):
                        if 'T' in departure_time:
                            dt = datetime.fromisoformat(departure_time.replace('Z', '+00:00'))
                        else:
                            dt = datetime.strptime(departure_time[:16], '%Y-%m-%d %H:%M')
                        dep_time_str = dt.strftime('%I:%M %p')
                except:
                    dep_time_str = str(departure_time)[:5] if len(str(departure_time)) > 5 else str(departure_time)
            
            if arrival_time:
                try:
                    if isinstance(arrival_time, str):
                        if 'T' in arrival_time:
                            dt = datetime.fromisoformat(arrival_time.replace('Z', '+00:00'))
                        else:
                            dt = datetime.strptime(arrival_time[:16], '%Y-%m-%d %H:%M')
                        arr_time_str = dt.strftime('%I:%M %p')
                except:
                    arr_time_str = str(arrival_time)[:5] if len(str(arrival_time)) > 5 else str(arrival_time)
            
            # Format route
            route = f"{origin_city}"
            if origin_code:
                route += f" ({origin_code})"
            route += " → "
            route += f"{dest_city}"
            if dest_code:
                route += f" ({dest_code})"
            
            # Build flight info
            flight_info = f"{i}. {airline} {flight_id}"
            if dep_time_str and arr_time_str:
                flight_info += f"\n   {route} • {dep_time_str} - {arr_time_str}"
            else:
                flight_info += f"\n   {route}"
            
            if duration:
                flight_info += f" • {duration}"
            
            flight_info += f" • ${price:.2f}"
            
            formatted.append(flight_info)
        elif search_type == "hotels":
            name = item.get("hotelName", "Unknown Hotel")
            city = item.get("city", "Unknown")
            price = item.get("pricePerNight", 0)
            rating = item.get("starRating", 0)
            hotel_id = item.get("hotelId", "N/A")
            formatted.append(
                f"{i}. {name} ({rating}★) in {city}, ${price:.2f}/night (ID: {hotel_id})"
            )
        elif search_type == "cars":
            name = f"{item.get('make', '')} {item.get('model', '')}".strip()
            city = item.get("location", {}).get("city", "Unknown")
            price = item.get("dailyRentalPrice", 0)
            car_id = item.get("carId", "N/A")
            formatted.append(
                f"{i}. {name} in {city}, ${price:.2f}/day (ID: {car_id})"
            )
    
    return "\n".join(formatted)

