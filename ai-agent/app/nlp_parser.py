"""
Natural Language Processing utilities for parsing user queries
"""
import re
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from dateutil import parser as date_parser

def parse_date_mention(text: str) -> Optional[str]:
    """Extract and parse date mentions from text"""
    # Common date patterns
    patterns = [
        r'\b(today|tomorrow|next week|next month)\b',
        r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b',  # MM/DD/YYYY
        r'\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\b',
        r'\b(in|on|by)\s+(\d{1,2})\s+(days?|weeks?|months?)\b',
    ]
    
    text_lower = text.lower()
    
    # Handle relative dates
    if 'today' in text_lower:
        return datetime.now().strftime('%Y-%m-%d')
    elif 'tomorrow' in text_lower:
        return (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
    elif 'next week' in text_lower:
        return (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
    elif 'next month' in text_lower:
        return (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
    
    # Try to parse explicit dates
    for pattern in patterns[1:]:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                date_str = match.group(0)
                parsed_date = date_parser.parse(date_str, fuzzy=True)
                return parsed_date.strftime('%Y-%m-%d')
            except:
                continue
    
    return None

def extract_location(text: str) -> Optional[str]:
    """Extract location/city names from text"""
    # Common city patterns (this is basic - could be enhanced with NER)
    # Look for "to [city]", "in [city]", "from [city]"
    # Handle both capitalized and lowercase city names
    patterns = [
        r'\bto\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b',
        r'\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b',
        r'\bfrom\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b',
        r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:airport|city)\b',
        # Also try lowercase patterns and capitalize
        r'\bto\s+([a-z]+(?:\s+[a-z]+)?)\b',
        r'\bin\s+([a-z]+(?:\s+[a-z]+)?)\b',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            location = match.group(1)
            # Capitalize first letter of each word
            return ' '.join(word.capitalize() for word in location.split())
    
    return None

def extract_price_range(text: str) -> Dict[str, Optional[float]]:
    """Extract price range from text"""
    result = {"minPrice": None, "maxPrice": None}
    
    # Look for price mentions
    price_patterns = [
        r'\b(?:under|below|less than|max|maximum)\s+\$?(\d+)',
        r'\b(?:over|above|more than|min|minimum)\s+\$?(\d+)',
        r'\$\s*(\d+)\s*(?:to|-)\s*\$?\s*(\d+)',
        r'\b(?:budget|around|about)\s+\$?(\d+)',
    ]
    
    text_lower = text.lower()
    
    # Under/below/max
    match = re.search(r'\b(?:under|below|less than|max|maximum)\s+\$?(\d+)', text_lower)
    if match:
        result["maxPrice"] = float(match.group(1))
    
    # Over/above/min
    match = re.search(r'\b(?:over|above|more than|min|minimum)\s+\$?(\d+)', text_lower)
    if match:
        result["minPrice"] = float(match.group(1))
    
    # Range
    match = re.search(r'\$\s*(\d+)\s*(?:to|-)\s*\$?\s*(\d+)', text)
    if match:
        result["minPrice"] = float(match.group(1))
        result["maxPrice"] = float(match.group(2))
    
    return result

def detect_search_type(text: str) -> str:
    """Detect what type of search the user wants"""
    text_lower = text.lower()
    
    flight_keywords = ['flight', 'fly', 'airline', 'airport', 'plane', 'ticket']
    hotel_keywords = ['hotel', 'stay', 'accommodation', 'room', 'lodge', 'resort']
    car_keywords = ['car', 'vehicle', 'rental', 'drive', 'automobile']
    
    flight_score = sum(1 for kw in flight_keywords if kw in text_lower)
    hotel_score = sum(1 for kw in hotel_keywords if kw in text_lower)
    car_score = sum(1 for kw in car_keywords if kw in text_lower)
    
    if flight_score > hotel_score and flight_score > car_score:
        return "flights"
    elif hotel_score > car_score:
        return "hotels"
    elif car_score > 0:
        return "cars"
    else:
        # Default to flights if unclear
        return "flights"

def parse_search_query(text: str) -> Dict[str, Any]:
    """Parse natural language query into search parameters"""
    search_type = detect_search_type(text)
    params = {}
    
    # Extract dates
    departure_date = parse_date_mention(text)
    if departure_date:
        params["departureDate" if search_type == "flights" else "checkIn" if search_type == "hotels" else "pickupDate"] = departure_date
    
    # Extract locations
    location = extract_location(text)
    if location:
        if search_type == "flights":
            # Try to detect origin/destination
            text_lower = text.lower()
            # Check for "from X to Y" pattern
            from_match = re.search(r'\bfrom\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)', text, re.IGNORECASE)
            to_match = re.search(r'\bto\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)', text, re.IGNORECASE)
            
            if from_match and to_match:
                # Both origin and destination mentioned
                params["from"] = ' '.join(word.capitalize() for word in from_match.group(1).split())
                params["to"] = ' '.join(word.capitalize() for word in to_match.group(1).split())
            elif "from" in text_lower:
                params["from"] = location
            elif "to" in text_lower or "flights to" in text_lower or "flight to" in text_lower:
                params["to"] = location
            else:
                # If no "to" or "from", assume it's destination if it's after "flights"
                if re.search(r'flights?\s+[^to]*\s+([A-Za-z]+)', text, re.IGNORECASE):
                    params["to"] = location
                else:
                    params["to"] = location  # Default to destination
        else:
            params["city"] = location
    
    # Extract price range
    price_range = extract_price_range(text)
    if price_range["minPrice"]:
        params["minPrice"] = price_range["minPrice"]
    if price_range["maxPrice"]:
        params["maxPrice"] = price_range["maxPrice"]
    
    # Extract car make/brand for car searches
    if search_type == "cars":
        make = extract_make(text)
        if make:
            params["make"] = make
    
    # Extract other parameters
    if "cheap" in text.lower() or "budget" in text.lower() or "affordable" in text.lower():
        params["sortBy"] = "price"
        params["sortOrder"] = "asc"
    
    if "best" in text.lower() or "top" in text.lower() or "rated" in text.lower():
        params["sortBy"] = "rating" if search_type != "flights" else "price"
        params["sortOrder"] = "desc"
    
    return {
        "type": search_type,
        "params": params
    }

def extract_make(text: str) -> Optional[str]:
    """Extract car make/brand from text"""
    # Common car brands to look for (expanded list)
    car_brands = [
        "toyota", "honda", "ford", "chevrolet", "nissan", "bmw", "mercedes", "mercedes-benz",
        "audi", "volkswagen", "hyundai", "kia", "mazda", "subaru", "jeep", "dodge", "lexus",
        "acura", "infiniti", "cadillac", "lincoln", "buick", "gmc", "ram", "tesla", "chrysler",
        "volvo", "porsche", "jaguar", "land rover", "mini", "fiat", "alfa romeo", "mitsubishi"
    ]
    text_lower = text.lower()
    
    # Check for exact brand matches (prioritize longer matches first)
    sorted_brands = sorted(car_brands, key=len, reverse=True)
    for brand in sorted_brands:
        if brand in text_lower:
            # Return capitalized version (handle multi-word brands)
            return ' '.join(word.capitalize() for word in brand.split())
    
    return None

