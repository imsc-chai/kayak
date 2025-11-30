"""
AI Service using OpenAI for chat and recommendations
"""
import os
from openai import OpenAI
from typing import List, Dict, Any, Optional
import json

# Initialize OpenAI client lazily
_client = None

def get_client():
    """Get or create OpenAI client"""
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        _client = OpenAI(api_key=api_key)
    return _client

SYSTEM_PROMPT = """You are a helpful AI travel assistant for KAYAK, a travel booking platform. 
Your role is to help users with all aspects of travel planning and booking.

Key capabilities:
1. Search for flights, hotels, and car rentals using natural language
2. Provide booking details and trip information
3. Offer trip planning checklists and travel tips
4. Suggest destinations and travel ideas
5. Answer questions about travel, destinations, bookings, and general travel advice
6. Help users plan complete trips

Guidelines:
- Be friendly, helpful, and conversational
- When you have search results, present them clearly with key details (price, location, dates)
- If you don't have enough information, ask clarifying questions
- Use the user's booking history and preferences to personalize recommendations
- Always mention specific IDs or details when referencing search results
- For booking-related queries, provide clear, organized information
- For trip planning, be thorough and helpful
- For suggestions, be creative and personalized

When presenting search results, format them clearly with:
- Item name/description
- Location
- Price
- Key features
- ID (if available)

You can handle:
- Search queries: "Find flights to Paris", "Show me hotels in NYC"
- Booking queries: "What are my bookings?", "Show my trip details"
- Planning queries: "Trip planning checklist", "What should I pack?"
- Suggestion queries: "Suggest a trip", "Where should I go?"
- General questions: Travel advice, destination info, etc."""

async def get_chat_response(
    messages: List[Dict[str, str]],
    user_context: Optional[Dict[str, Any]] = None,
    search_results: Optional[str] = None
) -> str:
    """Get AI response from OpenAI"""
    try:
        # Build context-aware messages
        system_message = SYSTEM_PROMPT
        
        if user_context and isinstance(user_context, dict):
            # Add user context to system prompt
            context_parts = []
            if user_context.get("preferences"):
                prefs = user_context.get("preferences")
                if prefs:
                    context_parts.append(f"User preferences: {json.dumps(prefs, indent=2)}")
            if user_context.get("booking_history"):
                bookings = user_context.get("booking_history", [])
                if bookings:
                    context_parts.append(f"User has {len(bookings)} past bookings")
            if user_context.get("favourites"):
                favs = user_context.get("favourites", [])
                if favs:
                    context_parts.append(f"User has {len(favs)} saved favourites")
            
            if context_parts:
                system_message += "\n\nUser Context:\n" + "\n".join(context_parts)
        
        if search_results:
            system_message += f"\n\nSearch Results:\n{search_results}"
        
        # Prepare messages for OpenAI
        openai_messages = [
            {"role": "system", "content": system_message}
        ] + messages
        
        import sys
        print(f"🔍 [OPENAI] Calling OpenAI API with model: {os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')}", flush=True)
        print(f"🔍 [OPENAI] Messages count: {len(openai_messages)}", flush=True)
        sys.stdout.flush()
        
        client = get_client()
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
            messages=openai_messages,
            temperature=0.7,
            max_tokens=500
        )
        
        result = response.choices[0].message.content
        print(f"✅ [OPENAI] Got response: {result[:100]}...", flush=True)
        sys.stdout.flush()
        return result
        
    except Exception as e:
        import traceback
        print(f"Error getting AI response: {e}")
        traceback.print_exc()
        # If we have search results, provide a basic response
        if search_results:
            return f"I found some results for you. Please review them below."
        return "I'm sorry, I'm having trouble processing your request right now. Please try again later."

def extract_search_intent(message: str) -> Dict[str, Any]:
    """Extract search intent from user message using OpenAI"""
    # First try OpenAI, but if it fails, fallback immediately
    try:
        # Check if API key is available
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("OpenAI API key not found, using fallback parser")
            raise ValueError("No API key")
        prompt = f"""Analyze this user message and extract search parameters in JSON format:
"{message}"

Return a JSON object with:
- type: "flights", "hotels", or "cars"
- from: origin city/airport (for flights) - only if explicitly mentioned
- to: destination city/airport (for flights) - extract from phrases like "to [city]", "flights to [city]", etc.
- city: city name (for hotels/cars)
- make: car brand/manufacturer (for cars) - extract from phrases like "Toyota cars", "Honda", "BMW", etc.
- departureDate/checkIn/pickupDate: date in YYYY-MM-DD format
- returnDate/checkOut/dropoffDate: date in YYYY-MM-DD format (if mentioned)
- minPrice: minimum price (if mentioned)
- maxPrice: maximum price (if mentioned)
- sortBy: "price" or "rating" (if mentioned)
- sortOrder: "asc" or "desc"

IMPORTANT: For flights, if the message mentions a destination city (like "to Paris", "flights to Paris"), extract it as the "to" field.
Only include fields that are explicitly mentioned or can be inferred. Return only valid JSON, no markdown."""

        client = get_client()
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
            messages=[
                {"role": "system", "content": "You are a JSON extraction assistant. Always return valid JSON only, no markdown code blocks, no explanations."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Lower temperature for more consistent extraction
            max_tokens=200
        )
        
        result_text = response.choices[0].message.content.strip()
        # Remove markdown code blocks if present
        if result_text.startswith("```"):
            parts = result_text.split("```")
            if len(parts) > 1:
                result_text = parts[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()
        
        parsed = json.loads(result_text)
        if parsed is None:
            parsed = {}
        print(f"OpenAI extracted intent: {parsed}")
        return parsed if isinstance(parsed, dict) else {"type": None, "params": {}}
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}, raw response: {result_text}")
        # Fallback to basic parsing
        from .nlp_parser import parse_search_query
        result = parse_search_query(message)
        return result if result and isinstance(result, dict) else {"type": None, "params": {}}
    except ValueError as e:
        # API key missing or other value error - use fallback
        print(f"ValueError in extract_search_intent: {e}, using fallback parser")
        from .nlp_parser import parse_search_query
        result = parse_search_query(message)
        return result if result and isinstance(result, dict) else {"type": None, "params": {}}
    except Exception as e:
        error_str = str(e).lower()
        # Check for quota/rate limit errors
        if "quota" in error_str or "429" in error_str or "rate limit" in error_str or "insufficient_quota" in error_str:
            print(f"⚠️ OpenAI quota exceeded, using fallback parser")
        else:
            print(f"Error extracting search intent: {e}")
            import traceback
            traceback.print_exc()
        # Fallback to basic parsing
        from .nlp_parser import parse_search_query
        result = parse_search_query(message)
        return result if result and isinstance(result, dict) else {"type": None, "params": {}}

