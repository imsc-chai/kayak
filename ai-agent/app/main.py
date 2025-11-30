from fastapi import FastAPI, HTTPException, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv

try:
    from .ai_service import get_chat_response, extract_search_intent
    from .services import get_user_data, search_flights, search_hotels, search_cars, format_search_results
    from .nlp_parser import parse_search_query, extract_location
    from .query_handlers import (
        get_user_bookings, get_user_favourites, format_booking_details,
        generate_trip_planning_checklist, suggest_trip, detect_query_type,
        get_weather_info, format_weather_response
    )
except ImportError:
    # For direct execution
    from ai_service import get_chat_response, extract_search_intent
    from services import get_user_data, search_flights, search_hotels, search_cars, format_search_results
    from nlp_parser import parse_search_query, extract_location
    from query_handlers import (
        get_user_bookings, get_user_favourites, format_booking_details,
        generate_trip_planning_checklist, suggest_trip, detect_query_type,
        get_weather_info, format_weather_response
    )

# Load environment variables - try multiple paths
import pathlib
import sys

# Force flush stdout for immediate logging
def log_print(*args, **kwargs):
    print(*args, **kwargs, flush=True)
    sys.stdout.flush()

env_path = pathlib.Path(__file__).parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    # Try current directory
    load_dotenv()
    # Also try parent directory
    load_dotenv(pathlib.Path(__file__).parent.parent.parent / ".env")

app = FastAPI(title="Kayak AI Agent", version="1.0.0")

# CORS middleware - MUST be added FIRST
# Note: Cannot use allow_origins=["*"] with allow_credentials=True
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Frontend URLs
    allow_credentials=False,  # Set to False when using wildcard or multiple origins
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Request logging middleware - simplified to not consume body
@app.middleware("http")
async def log_requests(request, call_next):
    import time
    start_time = time.time()
    try:
        log_print(f"\n{'='*60}")
        log_print(f"📥 [REQUEST] {request.method} {request.url.path}")
        # Don't try to convert headers to dict - just log the path
    except:
        pass
    response = await call_next(request)
    process_time = time.time() - start_time
    try:
        log_print(f"📤 [RESPONSE] Status: {response.status_code}, Time: {process_time:.2f}s")
        log_print(f"{'='*60}\n")
    except:
        pass
    return response

# Request/Response Models
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []
    user_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    search_results: Optional[Dict[str, Any]] = None
    search_type: Optional[str] = None

@app.options("/api/chat")
async def options_chat():
    """Handle OPTIONS request for CORS"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
        }
    )

@app.get("/health")
async def health_check():
    try:
        return {"status": "ok", "service": "ai-agent"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@app.get("/")
async def root():
    return {"message": "Kayak AI Agent Service"}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, authorization: Optional[str] = Header(None)):
    """
    Main chat endpoint for AI agent
    """
    # Ensure extract_location is available (import at function start to avoid scoping issues)
    try:
        from .nlp_parser import extract_location as _extract_location_func
    except ImportError:
        from nlp_parser import extract_location as _extract_location_func
    
    try:
        import traceback
        # Extract token if provided
        token = None
        if authorization and authorization.startswith("Bearer "):
            token = authorization[7:]
            log_print(f"🔑 [AUTH] Token extracted: {token[:20]}...")
        else:
            log_print(f"⚠️ [AUTH] No authorization header provided")
        
        # Get user context if user_id is provided
        user_context = None
        user_data = None
        log_print(f"🔍 [USER] Request user_id: {request.user_id}")
        if request.user_id:
            user_data = await get_user_data(request.user_id, token)
            if user_data:
                user_context = {
                    "preferences": user_data.get("travelPreferences", {}),
                    "booking_history": user_data.get("bookingHistory", []),
                    "favourites": user_data.get("favourites", []),
                    "user_id": request.user_id
                }
        
        # Detect query type
        query_type = detect_query_type(request.message)
        log_print(f"🔍 [CHAT] Received message: '{request.message}'")
        log_print(f"🔍 [CHAT] User ID: {request.user_id}")
        log_print(f"🔍 [CHAT] Detected query type: {query_type}")
        log_print(f"🔍 [CHAT] Has token: {bool(token)}")
        
        # Handle special query types
        if query_type == "booking_details":
            log_print(f"🔍 [BOOKINGS] Query type: booking_details, user_id: {request.user_id}")
            if not request.user_id:
                log_print(f"⚠️ [BOOKINGS] No user_id provided")
                ai_response = "I'd be happy to help you with your booking details! Please log in to view your bookings."
                return ChatResponse(response=ai_response, search_results=None, search_type=None)
            
            # Check if user_id looks like a valid MongoDB ObjectId (24 hex characters)
            import re
            is_valid_objectid = re.match(r'^[0-9a-fA-F]{24}$', request.user_id) if request.user_id else False
            
            if not is_valid_objectid:
                log_print(f"⚠️ [BOOKINGS] Invalid user_id format: {request.user_id} (not a valid MongoDB ObjectId)")
                ai_response = "I'm having trouble accessing your booking information. Please make sure you're logged in correctly and try refreshing the page."
                return ChatResponse(response=ai_response, search_results=None, search_type=None)
            
            log_print(f"🔍 [BOOKINGS] Fetching bookings for user_id: {request.user_id}")
            try:
                bookings = await get_user_bookings(request.user_id, token)
                log_print(f"✅ [BOOKINGS] Retrieved {len(bookings) if bookings else 0} bookings")
                if bookings and len(bookings) > 0:
                    try:
                        booking_text = format_booking_details(bookings)
                        ai_response = f"Here are your booking details:\n\n{booking_text}"
                    except Exception as format_error:
                        log_print(f"❌ [BOOKINGS] Error formatting booking details: {format_error}")
                        import traceback
                        traceback.print_exc()
                        sys.stdout.flush()
                        # Fallback to simple format
                        booking_list = []
                        for i, booking in enumerate(bookings, 1):
                            booking_type = booking.get("type", "unknown")
                            booking_id = booking.get("bookingId", "N/A")
                            status = booking.get("status", "unknown")
                            details = booking.get("details", {})
                            price = details.get("totalAmountPaid", 0)
                            booking_list.append(f"{i}. {booking_type.title()} {booking_id}: ${price:.2f} • {status.title()}")
                        ai_response = f"Here are your booking details:\n\n" + "\n".join(booking_list)
                else:
                    ai_response = "You don't have any bookings yet. Would you like to search for flights, hotels, or cars?"
            except Exception as booking_error:
                log_print(f"❌ [BOOKINGS] Error fetching bookings: {booking_error}")
                import traceback
                traceback.print_exc()
                sys.stdout.flush()
                ai_response = "I'm having trouble accessing your booking information right now. Please try again in a moment."
            return ChatResponse(response=ai_response, search_results=None, search_type=None)
        
        elif query_type == "trip_planning":
            # Extract destination if mentioned
            destination = None
            if "to" in request.message.lower() or "for" in request.message.lower():
                destination = _extract_location_func(request.message)
            
            checklist = generate_trip_planning_checklist(destination)
            ai_response = checklist
            return ChatResponse(response=ai_response, search_results=None, search_type=None)
        
        elif query_type == "trip_suggestions":
            suggestions = await suggest_trip(user_context if user_context else None)
            ai_response = f"Here are some trip suggestions for you:\n\n{suggestions}\n\nWould you like me to search for specific flights, hotels, or cars?"
            return ChatResponse(response=ai_response, search_results=None, search_type=None)
        
        elif query_type == "weather":
            # Extract location from message
            location = _extract_location_func(request.message)
            if not location:
                # Try to extract from common patterns
                import re
                patterns = [
                    r'weather in (.+?)(?:\?|$|\.)',
                    r'weather at (.+?)(?:\?|$|\.)',
                    r'weather for (.+?)(?:\?|$|\.)',
                    r'temperature in (.+?)(?:\?|$|\.)',
                ]
                for pattern in patterns:
                    match = re.search(pattern, request.message, re.IGNORECASE)
                    if match:
                        location = match.group(1).strip()
                        break
            
            if location:
                log_print(f"🌤️ [WEATHER] Fetching weather for: {location}")
                try:
                    weather_data = await get_weather_info(location)
                    if weather_data:
                        ai_response = format_weather_response(weather_data, location)
                        log_print(f"✅ [WEATHER] Successfully fetched weather for {location}")
                    else:
                        log_print(f"❌ [WEATHER] get_weather_info returned None for {location}")
                        # Check if API key is set
                        weather_api_key = os.getenv("WEATHER_API_KEY", "")
                        if not weather_api_key:
                            ai_response = f"I'd love to help you with weather information for {location}! However, the weather API key is not configured. Please add WEATHER_API_KEY to your .env file to enable weather queries.\n\nFor now, would you like me to search for flights, hotels, or cars in {location} instead?"
                        else:
                            ai_response = f"I couldn't fetch weather information for {location} right now. Please make sure the location name is correct, or try again later."
                except Exception as weather_error:
                    log_print(f"❌ [WEATHER] Error fetching weather: {weather_error}")
                    import traceback
                    traceback.print_exc()
                    sys.stdout.flush()
                    weather_api_key = os.getenv("WEATHER_API_KEY", "")
                    if not weather_api_key:
                        ai_response = f"I'd love to help you with weather information for {location}! However, the weather API key is not configured. Please add WEATHER_API_KEY to your .env file to enable weather queries.\n\nFor now, would you like me to search for flights, hotels, or cars in {location} instead?"
                    else:
                        ai_response = f"I encountered an error while fetching weather for {location}. Please try again later."
            else:
                ai_response = "I'd be happy to help you with weather information! Please specify a location, for example: 'What is the weather in Sunnyvale?' or 'Weather in New York'"
            return ChatResponse(response=ai_response, search_results=None, search_type=None)
        
        # Check if message contains search intent
        search_intent = None
        try:
            log_print(f"🔍 [CHAT] Extracting search intent...")
            search_intent = extract_search_intent(request.message)
            log_print(f"✅ [CHAT] Extracted search intent: {search_intent}")
        except Exception as e:
            error_str = str(e).lower()
            if "quota" in error_str or "429" in error_str or "rate limit" in error_str or "insufficient_quota" in error_str:
                log_print(f"⚠️ [CHAT] OpenAI quota exceeded, using fallback parser")
            else:
                log_print(f"❌ [CHAT] Error in extract_search_intent: {e}")
                import traceback
                traceback.print_exc()
            # Fallback to basic parser
            from .nlp_parser import parse_search_query
            search_intent = parse_search_query(request.message)
            log_print(f"✅ [CHAT] Fallback parser result: {search_intent}")
        
        # Ensure search_intent is not None
        if search_intent is None:
            search_intent = {"type": None, "params": {}}
        
        search_results_text = None
        search_results_data = None
        search_type = None
        
        # If search intent detected, perform search
        if search_intent and isinstance(search_intent, dict) and search_intent.get("type") in ["flights", "hotels", "cars"]:
            search_type = search_intent.get("type")
            # Extract params, handling both direct params and nested params structure
            if search_intent.get("params") and isinstance(search_intent.get("params"), dict):
                params = search_intent["params"]
            else:
                # Extract all non-type keys as params (excluding "params" key itself)
                params = {k: v for k, v in search_intent.items() if k not in ["type", "params"] and v is not None} if search_intent else {}
            
            # Debug logging
            print(f"Search intent keys: {list(search_intent.keys())}")
            print(f"Extracted params: {params}")
            if search_type == "flights":
                print(f"Flight search - 'to': {params.get('to')}, 'from': {params.get('from')}")
            
            # Validate that we have required params for flights
            if search_type == "flights" and not params.get("to") and not params.get("from"):
                print("WARNING: Flight search without destination or origin - this will return all flights!")
            
            # Perform search based on type
            try:
                log_print(f"🔍 [SEARCH] Performing {search_type} search with params: {params}")
                results = []
                if search_type == "flights":
                    results = await search_flights(params)
                elif search_type == "hotels":
                    results = await search_hotels(params)
                elif search_type == "cars":
                    results = await search_cars(params)
                log_print(f"✅ [SEARCH] Got {len(results)} results")
                
                # Only set search results if we actually found some
                if results and len(results) > 0:
                    # For flights, ALWAYS verify results match the search criteria
                    if search_type == "flights":
                        if params.get("to"):
                            destination = params.get("to", "").lower().strip()
                            print(f"Filtering {len(results)} flights for destination: '{destination}'")
                            # Filter to ensure results actually match the destination (exact or partial match)
                            filtered_results = []
                            for r in results:
                                arrival_city = r.get("arrivalAirport", {}).get("city", "").lower().strip()
                                # Check if destination matches arrival city
                                if destination in arrival_city or arrival_city in destination:
                                    filtered_results.append(r)
                            
                            if filtered_results:
                                results = filtered_results
                                print(f"✓ Filtered to {len(results)} flights matching destination '{params.get('to')}'")
                            else:
                                print(f"✗ WARNING: No flights match destination '{params.get('to')}'")
                                print(f"  Sample arrival cities: {[r.get('arrivalAirport', {}).get('city') for r in results[:3]]}")
                                results = []
                        elif params.get("from"):
                            # If only origin specified, that's okay
                            print(f"Search with origin only: {params.get('from')}")
                        else:
                            # If no destination or origin specified, don't return random flights
                            print("✗ WARNING: Flight search without destination or origin - not returning results")
                            results = []
                    elif search_type == "cars":
                        # For cars, verify make/brand if specified (backup filtering)
                        # Note: search_cars already filters, but this is a safety check
                        if params.get("make") and results:
                            requested_make = params.get("make", "").lower()
                            original_count = len(results)
                            filtered_results = [
                                r for r in results
                                if r.get("company", "").lower() == requested_make
                            ]
                            if filtered_results:
                                results = filtered_results
                                print(f"✓ Double-check: Filtered {original_count} → {len(results)} cars matching make '{params.get('make')}'")
                            else:
                                print(f"✗ No cars match make '{params.get('make')}' after filtering")
                                print(f"  Sample makes in results: {set(r.get('company') for r in results[:10])}")
                                results = []
                    
                    if results and len(results) > 0:
                        if search_type == "flights":
                            search_results_data = {"flights": results[:10]}  # Limit to 10
                        elif search_type == "hotels":
                            search_results_data = {"hotels": results[:10]}
                        elif search_type == "cars":
                            search_results_data = {"cars": results[:10]}
                        
                        # Format results for LLM
                        search_results_text = format_search_results(search_type, results)
                        print(f"Found {len(results)} {search_type} results")
                    else:
                        search_results_data = None
                        search_results_text = None
                else:
                    print(f"No {search_type} found for params: {params}")
                    search_results_data = None
                    search_results_text = None
            except Exception as search_error:
                print(f"Error performing search: {search_error}")
                import traceback
                traceback.print_exc()
                results = []
                search_results_data = None
                search_results_text = None
        
        # Build conversation history
        messages = []
        for msg in request.conversation_history:
            messages.append({"role": msg.role, "content": msg.content})
        
        # Add current user message
        messages.append({"role": "user", "content": request.message})
        
        # Get AI response - but prioritize showing search results even if AI fails
        ai_response = None
        if search_results_data:
            # If we have search results, use a simple message (don't wait for AI)
            flights = search_results_data.get("flights", [])
            hotels = search_results_data.get("hotels", [])
            cars = search_results_data.get("cars", [])
            results_count = len(flights) + len(hotels) + len(cars)
            
            if results_count > 0:
                ai_response = f"I found {results_count} {search_type} for you. Here are the results:"
            else:
                ai_response = f"I couldn't find any {search_type} matching your criteria. Please try different search parameters."
        elif search_type:
            # Search was attempted but no results found
            destination = params.get("to") or params.get("city", "")
            if destination:
                ai_response = f"I couldn't find any {search_type} to {destination}. Please try a different destination or check your search parameters."
            else:
                ai_response = f"I couldn't find any {search_type} matching your search. Please specify a destination or try different parameters."
        else:
            # For conversational queries, always try AI
            try:
                log_print(f"🔍 [AI] Getting AI response for conversational query")
                # Enhance context with additional user data if available
                enhanced_context = {}
                if user_context:
                    enhanced_context = user_context.copy()
                if user_data:
                    enhanced_context["user_name"] = user_data.get("firstName", "") or user_data.get("name", "")
                    enhanced_context["user_email"] = user_data.get("email", "")
                
                log_print(f"🔍 [AI] Calling OpenAI API...")
                ai_response = await get_chat_response(
                    messages=messages,
                    user_context=enhanced_context if enhanced_context else None,
                    search_results=search_results_text
                )
                log_print(f"✅ [AI] Got AI response: {ai_response[:100]}...")
            except Exception as ai_error:
                error_str = str(ai_error).lower()
                if "quota" in error_str or "429" in error_str or "rate limit" in error_str or "insufficient_quota" in error_str:
                    log_print(f"⚠️ [AI] OpenAI quota exceeded, providing fallback response")
                    # For search queries, try to provide a basic response based on search results
                    if search_results_data:
                        flights = search_results_data.get("flights", [])
                        hotels = search_results_data.get("hotels", [])
                        cars = search_results_data.get("cars", [])
                        results_count = len(flights) + len(hotels) + len(cars)
                        if results_count > 0:
                            ai_response = f"I found {results_count} {search_type} for you. Please review the results below."
                        else:
                            ai_response = f"I searched for {search_type} but couldn't find any results matching your criteria. Please try different search parameters."
                    else:
                        ai_response = "I'm currently experiencing high demand. I can still help you search for flights, hotels, or cars. Please try a specific search query like 'find flights to Chicago' or 'hotels in Sunnyvale'."
                else:
                    error_str = str(ai_error).lower()
                    if "quota" in error_str or "429" in error_str or "rate limit" in error_str or "insufficient_quota" in error_str:
                        log_print(f"⚠️ [AI] OpenAI quota exceeded, providing fallback response")
                        # For general questions when OpenAI is unavailable, provide helpful guidance
                        if query_type == "conversation":
                            # Check if it's a question about a specific location/destination
                            message_lower = request.message.lower()
                            location_keywords = ["weather", "temperature", "time", "currency", "language", "population", "capital", "famous", "known for"]
                            is_location_question = any(kw in message_lower for kw in location_keywords)
                            
                            if is_location_question:
                                # Extract location if mentioned
                                location = _extract_location_func(request.message)
                                if location:
                                    ai_response = f"I'd love to help you with information about {location}! However, I'm currently experiencing high demand and can't access real-time information right now. For current weather, time, and other details about {location}, I recommend checking:\n• Weather.com or your weather app\n• TimeAndDate.com for timezone information\n• Official tourism websites for destination information\n\nWould you like me to search for flights, hotels, or cars in {location} instead?"
                                else:
                                    ai_response = "I'd love to help with that question! However, I'm currently experiencing high demand and can't access real-time information right now. For current weather, time, and destination details, I recommend checking weather apps or official tourism websites.\n\nWould you like me to search for flights, hotels, or cars instead?"
                            else:
                                ai_response = "I'm here to help! You can ask me about:\n• Searching for flights, hotels, or cars\n• Your booking details (when logged in)\n• Trip planning checklists\n• Travel suggestions\n\nWhat would you like to know?"
                        else:
                            ai_response = "I'm sorry, I'm having trouble processing your request right now. Please try again later."
                    else:
                        log_print(f"❌ [AI] Error getting AI response: {ai_error}")
                        import traceback
                        traceback.print_exc()
                        sys.stdout.flush()
                        # Provide helpful fallback message based on query type
                        if query_type == "conversation":
                            ai_response = "I'm here to help! You can ask me about:\n• Searching for flights, hotels, or cars\n• Your booking details (when logged in)\n• Trip planning checklists\n• Travel suggestions\n\nWhat would you like to know?"
                        else:
                            ai_response = "I'm sorry, I'm having trouble processing your request right now. Please try again later."
        
        return ChatResponse(
            response=ai_response,
            search_results=search_results_data,
            search_type=search_type
        )
        
    except Exception as e:
        log_print(f"❌ [CHAT] Error in chat endpoint: {e}")
        import traceback
        error_trace = traceback.format_exc()
        log_print(f"❌ [CHAT] Full traceback:\n{error_trace}")
        sys.stdout.flush()
        # Return a helpful error message instead of crashing
        return ChatResponse(
            response=f"I encountered an error: {str(e)}. Please try rephrasing your question.",
            search_results=None,
            search_type=None
        )

@app.get("/api/debug/search-intent")
async def debug_search_intent(message: str):
    """Debug endpoint to test search intent extraction"""
    try:
        from .nlp_parser import parse_search_query
        result = parse_search_query(message)
        return {
            "message": message,
            "extracted": result,
            "params": result.get("params", {}),
            "type": result.get("type")
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/search")
async def smart_search(request: ChatRequest):
    """
    Smart search endpoint - parses natural language and returns search results
    """
    try:
        # Parse query
        parsed = parse_search_query(request.message)
        search_type = parsed["type"]
        params = parsed["params"]
        
        # Perform search
        results = []
        if search_type == "flights":
            results = await search_flights(params)
        elif search_type == "hotels":
            results = await search_hotels(params)
        elif search_type == "cars":
            results = await search_cars(params)
        
        return {
            "success": True,
            "type": search_type,
            "results": results[:20],  # Limit to 20 results
            "params": params
        }
        
    except Exception as e:
        print(f"Error in smart search: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
