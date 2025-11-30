"""
Query handlers for different types of user queries
"""
import httpx
import os
from typing import Dict, Any, Optional, List
from datetime import datetime

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:5001")
FLIGHT_SERVICE_URL = os.getenv("FLIGHT_SERVICE_URL", "http://localhost:5002")
HOTEL_SERVICE_URL = os.getenv("HOTEL_SERVICE_URL", "http://localhost:5003")
CAR_SERVICE_URL = os.getenv("CAR_SERVICE_URL", "http://localhost:5004")
BILLING_SERVICE_URL = os.getenv("BILLING_SERVICE_URL", "http://localhost:5005")
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")
WEATHER_API_URL = "http://api.openweathermap.org/data/2.5/weather"

async def get_user_bookings(user_id: str, token: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get user's booking history"""
    try:
        import sys
        print(f"🔍 [BOOKINGS] Fetching bookings for user_id: {user_id}", flush=True)
        print(f"🔍 [BOOKINGS] URL: {USER_SERVICE_URL}/api/users/{user_id}/bookings", flush=True)
        print(f"🔍 [BOOKINGS] Has token: {bool(token)}", flush=True)
        sys.stdout.flush()
        
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{USER_SERVICE_URL}/api/users/{user_id}/bookings",
                headers=headers
            )
            print(f"🔍 [BOOKINGS] Response status: {response.status_code}", flush=True)
            sys.stdout.flush()
            
            if response.status_code == 200:
                data = response.json()
                print(f"🔍 [BOOKINGS] Response data: {data}", flush=True)
                sys.stdout.flush()
                if data and data.get("success"):
                    bookings = data.get("data", [])
                    print(f"✅ [BOOKINGS] Found {len(bookings)} bookings", flush=True)
                    sys.stdout.flush()
                    return bookings
            else:
                print(f"❌ [BOOKINGS] Error status {response.status_code}: {response.text[:200]}", flush=True)
                sys.stdout.flush()
        return []
    except Exception as e:
        import traceback
        print(f"❌ [BOOKINGS] Error fetching user bookings: {e}", flush=True)
        traceback.print_exc()
        sys.stdout.flush()
        return []

async def get_user_favourites(user_id: str, token: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get user's favourites"""
    try:
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{USER_SERVICE_URL}/api/users/{user_id}/favourites",
                headers=headers
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    return data.get("data", [])
        return []
    except Exception as e:
        print(f"Error fetching user favourites: {e}")
        return []

def format_booking_details(bookings: List[Dict[str, Any]]) -> str:
    """Format booking details for AI response - showing important details without being too verbose"""
    if not bookings:
        return "You don't have any bookings yet."
    
    from datetime import datetime
    
    formatted = []
    formatted.append(f"📋 You have {len(bookings)} booking(s):\n")
    
    for i, booking in enumerate(bookings, 1):
        booking_type = booking.get("type", "unknown")
        booking_id = booking.get("bookingId", "N/A")
        status = booking.get("status", "unknown")
        details = booking.get("details", {})
        
        if booking_type == "flight":
            origin = details.get("departureAirport", {}).get("city", "Unknown")
            dest = details.get("arrivalAirport", {}).get("city", "Unknown")
            airline = details.get("airline", "Unknown Airline")
            departure_date = details.get("departureDateTime", details.get("departureDate", ""))
            price = details.get("totalAmountPaid", details.get("ticketPrice", 0))
            
            # Format date
            date_str = ""
            if departure_date:
                try:
                    # Handle both date-only (YYYY-MM-DD) and datetime strings
                    date_str_raw = str(departure_date).replace('Z', '').replace('+00:00', '')
                    if 'T' in date_str_raw:
                        dt = datetime.fromisoformat(date_str_raw)
                    else:
                        dt = datetime.strptime(date_str_raw[:10], '%Y-%m-%d')
                    date_str = dt.strftime('%b %d, %Y')
                except Exception as e:
                    date_str = str(departure_date)[:10] if departure_date else ""
            
            formatted.append(
                f"✈️ Flight {booking_id}: {origin} → {dest}\n"
                f"   {airline} • {date_str} • ${price:.2f} • {status.title()}\n"
            )
            
        elif booking_type == "hotel":
            hotel_name = details.get("hotelName", "Unknown Hotel")
            city = details.get("city", "Unknown")
            state = details.get("state", "")
            star_rating = details.get("starRating", 0)
            check_in = details.get("checkIn", "")
            check_out = details.get("checkOut", "")
            guests = details.get("guests", 1)
            price = details.get("totalAmountPaid", details.get("pricePerNight", 0))
            
            # Format dates
            check_in_str = ""
            check_out_str = ""
            if check_in:
                try:
                    # Handle both date-only (YYYY-MM-DD) and datetime strings
                    date_str = str(check_in).replace('Z', '').replace('+00:00', '')
                    if 'T' in date_str:
                        dt = datetime.fromisoformat(date_str)
                    else:
                        dt = datetime.strptime(date_str[:10], '%Y-%m-%d')
                    check_in_str = dt.strftime('%b %d')
                except Exception as e:
                    check_in_str = str(check_in)[:10] if check_in else ""
            if check_out:
                try:
                    # Handle both date-only (YYYY-MM-DD) and datetime strings
                    date_str = str(check_out).replace('Z', '').replace('+00:00', '')
                    if 'T' in date_str:
                        dt = datetime.fromisoformat(date_str)
                    else:
                        dt = datetime.strptime(date_str[:10], '%Y-%m-%d')
                    check_out_str = dt.strftime('%b %d')
                except Exception as e:
                    check_out_str = str(check_out)[:10] if check_out else ""
            
            location = f"{city}, {state}" if state else city
            stars = "⭐" * star_rating if star_rating else ""
            dates = f"{check_in_str} - {check_out_str}" if check_in_str and check_out_str else ""
            
            formatted.append(
                f"🏨 Hotel {booking_id}: {hotel_name} {stars}\n"
                f"   {location} • {dates} • {guests} guest(s) • ${price:.2f} • {status.title()}\n"
            )
            
        elif booking_type == "car":
            company = details.get("company", "")
            model = details.get("model", "")
            car_type = details.get("carType", "")
            car_name = f"{company} {model}".strip() if company and model else f"{car_type} Rental"
            location = details.get("location", {})
            city = location.get("city", "Unknown")
            state = location.get("state", "")
            pickup_date = details.get("pickupDate", "")
            return_date = details.get("returnDate", "")
            price = details.get("totalAmountPaid", details.get("dailyRentalPrice", 0))
            
            # Format dates
            pickup_str = ""
            return_str = ""
            if pickup_date:
                try:
                    # Handle both date-only (YYYY-MM-DD) and datetime strings
                    date_str = str(pickup_date).replace('Z', '').replace('+00:00', '')
                    if 'T' in date_str:
                        dt = datetime.fromisoformat(date_str)
                    else:
                        dt = datetime.strptime(date_str[:10], '%Y-%m-%d')
                    pickup_str = dt.strftime('%b %d')
                except Exception as e:
                    pickup_str = str(pickup_date)[:10] if pickup_date else ""
            if return_date:
                try:
                    # Handle both date-only (YYYY-MM-DD) and datetime strings
                    date_str = str(return_date).replace('Z', '').replace('+00:00', '')
                    if 'T' in date_str:
                        dt = datetime.fromisoformat(date_str)
                    else:
                        dt = datetime.strptime(date_str[:10], '%Y-%m-%d')
                    return_str = dt.strftime('%b %d')
                except Exception as e:
                    return_str = str(return_date)[:10] if return_date else ""
            
            location_str = f"{city}, {state}" if state else city
            dates = f"{pickup_str} - {return_str}" if pickup_str and return_str else ""
            
            formatted.append(
                f"🚗 Car {booking_id}: {car_name}\n"
                f"   {location_str} • {dates} • ${price:.2f} • {status.title()}\n"
            )
        else:
            formatted.append(
                f"📦 {booking_type.title()} {booking_id}: {status.title()}\n"
            )
    
    return "\n".join(formatted)

def generate_trip_planning_checklist(destination: Optional[str] = None) -> str:
    """Generate a trip planning checklist"""
    checklist = [
        "📋 TRIP PLANNING CHECKLIST",
        "",
        "✅ Pre-Travel:",
        "  • Book flights, hotels, and car rentals",
        "  • Check passport validity (6+ months)",
        "  • Get travel insurance",
        "  • Research destination and local customs",
        "  • Check visa requirements",
        "  • Notify bank/credit card companies",
        "  • Download offline maps",
        "",
        "✅ Packing:",
        "  • Pack essentials (clothes, toiletries, medications)",
        "  • Bring travel documents (passport, tickets, confirmations)",
        "  • Pack chargers and adapters",
        "  • Bring first aid kit",
        "",
        "✅ Before Departure:",
        "  • Check-in online (24 hours before)",
        "  • Confirm hotel and car rental reservations",
        "  • Print or save digital confirmations",
        "  • Arrange airport transportation",
        "  • Set up travel alerts",
        "",
        "✅ During Travel:",
        "  • Keep important documents safe",
        "  • Stay hydrated",
        "  • Follow local laws and customs",
        "  • Keep emergency contacts handy",
    ]
    
    if destination:
        checklist.insert(2, f"📍 Destination: {destination}")
        checklist.insert(3, "")
    
    return "\n".join(checklist)

async def suggest_trip(user_context: Optional[Dict[str, Any]] = None) -> str:
    """Generate trip suggestions based on user preferences and history"""
    suggestions = []
    
    # Get popular destinations
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Get some sample flights to popular destinations
            response = await client.get(f"{FLIGHT_SERVICE_URL}/api/flights", params={"limit": 5})
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    flights = data.get("data", [])
                    destinations = set()
                    for flight in flights[:10]:
                        dest = flight.get("arrivalAirport", {}).get("city")
                        if dest:
                            destinations.add(dest)
                    if destinations:
                        suggestions.append(f"🌍 Popular Destinations: {', '.join(list(destinations)[:5])}")
    except:
        pass
    
    # Based on user history
    if user_context and user_context.get("booking_history"):
        bookings = user_context["booking_history"]
        if bookings:
            suggestions.append(f"📅 You have {len(bookings)} past booking(s). Consider revisiting your favorite destinations!")
    
    # Based on favourites
    if user_context and user_context.get("favourites"):
        favs = user_context["favourites"]
        if favs:
            suggestions.append(f"❤️ You have {len(favs)} saved favorite(s). Check them out for your next trip!")
    
    if not suggestions:
        suggestions = [
            "🌍 Popular Destinations: New York, Los Angeles, Miami, Chicago, Denver",
            "✈️ Best Time to Book: 6-8 weeks in advance for best prices",
            "🏨 Hotel Tips: Book during weekdays for better rates",
            "🚗 Car Rentals: Book in advance and compare prices"
        ]
    
    return "\n".join(suggestions)

def detect_query_type(message: str) -> str:
    """Detect what type of query the user is asking"""
    message_lower = message.lower()
    
    # Booking-related queries - CHECK FIRST (before general questions)
    if any(phrase in message_lower for phrase in [
        "booking", "my bookings", "my trips", "reservation", 
        "what did i book", "booking details", "show my bookings",
        "my reservations", "my upcoming trips", "past bookings"
    ]):
        return "booking_details"
    
    # Weather queries - special handling
    if "weather" in message_lower or "temperature" in message_lower:
        return "weather"
    
    # Trip planning queries
    if any(phrase in message_lower for phrase in ["checklist", "planning", "prepare", "what to pack", "trip planning"]):
        return "trip_planning"
    
    # Trip suggestions (check before general questions)
    search_keywords = ['flight', 'hotel', 'car', 'rental', 'accommodation', 'airline', 'vehicle', 'book a', 'reserve']
    has_search_keyword = any(kw in message_lower for kw in search_keywords)
    
    if not has_search_keyword and any(phrase in message_lower for phrase in ["suggest", "recommend", "where should", "where to go", "ideas", "inspiration"]):
        return "trip_suggestions"
    
    # Check for specific search terms (flights, hotels, cars) - these take priority
    # If there's a search keyword AND a search verb, it's definitely a search
    search_verbs = ["find", "search", "show me", "look for", "need", "want", "suggest", "recommend", "book"]
    has_search_verb = any(verb in message_lower for verb in search_verbs)
    
    if has_search_keyword and has_search_verb:
        return "search"
    
    # General question patterns (time, info, etc.) - these should be conversation, not search
    general_question_patterns = [
        "what is", "what's", "what are", "how is", "how's", "tell me about",
        "time in", "timezone", "currency", "language",
        "population", "capital", "famous", "known for", "best time to visit",
        "is it safe", "do i need", "should i", "can you tell me", "explain"
    ]
    is_general_question = any(pattern in message_lower for pattern in general_question_patterns)
    
    # If it's a general question without search keywords, it's conversation
    if is_general_question and not has_search_keyword:
        return "conversation"
    
    # Search queries (flights, hotels, cars) - if there's a search verb
    if has_search_verb:
        return "search"
    
    # General conversation
    return "conversation"

async def get_weather_info(location: str) -> Optional[Dict[str, Any]]:
    """Get weather information for a location using OpenWeatherMap API"""
    import sys
    
    # Get API key dynamically (in case .env was loaded after module import)
    api_key = os.getenv("WEATHER_API_KEY", "") or WEATHER_API_KEY
    if not api_key:
        print(f"❌ [WEATHER] WEATHER_API_KEY is not set in environment variables.", flush=True)
        print(f"   [WEATHER] Checked os.getenv: '{os.getenv('WEATHER_API_KEY', 'NOT_SET')}'", flush=True)
        print(f"   [WEATHER] Checked module variable: '{WEATHER_API_KEY}'", flush=True)
        sys.stdout.flush()
        return None
    
    print(f"🌤️ [WEATHER] Fetching weather for: {location}", flush=True)
    print(f"   [WEATHER] Using API key: {api_key[:8]}...{api_key[-4:] if len(api_key) > 12 else '***'}", flush=True)
    print(f"   [WEATHER] API URL: {WEATHER_API_URL}", flush=True)
    sys.stdout.flush()
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            params = {
                "q": location,
                "appid": api_key,
                "units": "imperial"  # Use Fahrenheit
            }
            print(f"   [WEATHER] Request params: q={location}, appid={api_key[:8]}..., units=imperial", flush=True)
            sys.stdout.flush()
            
            response = await client.get(WEATHER_API_URL, params=params)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ [WEATHER] Weather data retrieved for {location}", flush=True)
                sys.stdout.flush()
                return data
            else:
                error_text = response.text[:200]
                print(f"❌ [WEATHER] API returned status {response.status_code}: {error_text}", flush=True)
                sys.stdout.flush()
                # Try to parse error message
                try:
                    error_data = response.json()
                    error_message = error_data.get("message", error_text)
                    print(f"   [WEATHER] Error message: {error_message}", flush=True)
                    sys.stdout.flush()
                except:
                    pass
                return None
    except Exception as e:
        import traceback
        print(f"❌ [WEATHER] Error fetching weather: {e}", flush=True)
        traceback.print_exc()
        sys.stdout.flush()
        return None

def format_weather_response(weather_data: Dict[str, Any], location: str) -> str:
    """Format weather data into a readable response"""
    if not weather_data:
        return f"I couldn't fetch weather information for {location} at the moment. Please try again later."
    
    try:
        main = weather_data.get("main", {})
        weather = weather_data.get("weather", [{}])[0]
        wind = weather_data.get("wind", {})
        sys_data = weather_data.get("sys", {})
        
        temp = main.get("temp", "N/A")
        feels_like = main.get("feels_like", "N/A")
        humidity = main.get("humidity", "N/A")
        pressure = main.get("pressure", "N/A")
        description = weather.get("description", "N/A").title()
        wind_speed = wind.get("speed", "N/A")
        country = sys_data.get("country", "")
        
        location_name = weather_data.get("name", location)
        if country:
            location_name += f", {country}"
        
        response = f"🌤️ Weather in {location_name}:\n\n"
        response += f"☁️ Conditions: {description}\n"
        response += f"🌡️ Temperature: {temp}°F (feels like {feels_like}°F)\n"
        response += f"💧 Humidity: {humidity}%\n"
        response += f"🌬️ Wind Speed: {wind_speed} mph\n"
        response += f"📊 Pressure: {pressure} hPa"
        
        return response
    except Exception as e:
        print(f"Error formatting weather: {e}")
        return f"Weather information for {location}: Currently {weather_data.get('weather', [{}])[0].get('description', 'unavailable')}"

