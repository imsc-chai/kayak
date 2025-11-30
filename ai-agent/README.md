# KAYAK AI Agent Service

AI-powered travel assistant service for the KAYAK travel booking platform.

## Features

- **Natural Language Search**: Users can search for flights, hotels, and cars using natural language
- **Intelligent Recommendations**: Personalized suggestions based on user preferences and booking history
- **Conversational Interface**: Chat-based interaction with context awareness
- **Real-time Search Integration**: Connects to flight, hotel, and car services

## Setup

### 1. Install Dependencies

```bash
cd ai-agent
pip install -r requirements.txt
```

### 2. Environment Variables

Create a `.env` file in the `ai-agent` directory:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo  # or gpt-4

# Optional - for real-time weather information
WEATHER_API_KEY=your_openweathermap_api_key_here

# Optional - for enhanced travel information
TAVILY_API_KEY=your_tavily_api_key_here

# Service URLs (defaults shown)
USER_SERVICE_URL=http://localhost:5001
FLIGHT_SERVICE_URL=http://localhost:5002
HOTEL_SERVICE_URL=http://localhost:5003
CAR_SERVICE_URL=http://localhost:5004

# Server Configuration
PORT=8000
```

### 3. Get API Keys

1. **OpenAI API Key**: 
   - Sign up at https://platform.openai.com/
   - Create an API key in your account settings
   - Add credits to your account

2. **OpenWeatherMap API Key** (Optional, for weather queries):
   - Sign up for free at https://openweathermap.org/api
   - Get your API key from the dashboard (free tier allows 60 calls/minute)
   - Add to `.env` as `WEATHER_API_KEY=your_key_here`

3. **Tavily API Key** (Optional):
   - Sign up at https://tavily.com/
   - Get your API key from the dashboard

### 4. Run the Service

```bash
cd ai-agent
python -m uvicorn app.main:app --reload --port 8000
```

Or:

```bash
python -m app.main
```

## API Endpoints

### POST `/api/chat`

Main chat endpoint for AI conversations.

**Request:**
```json
{
  "message": "Find me cheap flights to Paris",
  "conversation_history": [],
  "user_id": "optional_user_id"
}
```

**Response:**
```json
{
  "response": "I found several flights to Paris...",
  "search_results": {
    "flights": [...]
  },
  "search_type": "flights"
}
```

### POST `/api/search`

Smart search endpoint that parses natural language.

**Request:**
```json
{
  "message": "Hotels in New York under $200"
}
```

**Response:**
```json
{
  "success": true,
  "type": "hotels",
  "results": [...],
  "params": {...}
}
```

## Usage Examples

### Natural Language Queries

- "Find me a cheap flight to Paris next month"
- "Show hotels in New York under $200 per night"
- "I need a car rental in Miami for 3 days"
- "What are the best hotels in Las Vegas?"
- "Flights from New York to London in December"

## Integration

The AI Agent integrates with:
- **User Service** (port 5001): For user preferences and booking history
- **Flight Service** (port 5002): For flight searches
- **Hotel Service** (port 5003): For hotel searches
- **Car Service** (port 5004): For car rental searches

## Frontend Integration

The AI chat modal is accessible via:
- Clicking the "AI Agent" button in the header
- Triggering the `openAIChat` custom event

## Development

### Testing

Test the service directly:

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Find flights to Paris", "conversation_history": []}'
```

### Debugging

Check logs for:
- API connection issues
- OpenAI API errors
- Service integration problems

## Notes

- The service uses GPT-3.5-turbo by default (configurable via `OPENAI_MODEL`)
- For production, consider using GPT-4 for better accuracy
- Rate limiting should be implemented for production use
- CORS is currently open - restrict in production

