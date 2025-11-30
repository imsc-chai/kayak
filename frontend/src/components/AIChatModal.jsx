import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaRobot, FaPaperPlane, FaSpinner } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { aiAgentAPI } from '../services/api';

const AIChatModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your KAYAK AI travel assistant. I can help you find flights, hotels, and car rentals. What are you looking for today?"
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  // Listen for open event
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openAIChat', handleOpen);
    return () => window.removeEventListener('openAIChat', handleOpen);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message to chat
    const newUserMessage = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Prepare conversation history (last 10 messages for context)
      const conversationHistory = [...messages, newUserMessage].slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call AI agent API - use _id (MongoDB ObjectId) instead of userId (SSN format)
      const response = await aiAgentAPI.chat({
        message: userMessage,
        conversation_history: conversationHistory,
        user_id: isAuthenticated && user ? (user._id || user.id) : null
      });

      // Check if response contains an error message
      const isErrorResponse = response.data?.response?.toLowerCase().includes("sorry") && 
                              response.data?.response?.toLowerCase().includes("trouble");
      
      // Add assistant response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response
      }]);

      // Only show search results if response was successful and we have results
      if (!isErrorResponse && response.data && response.data.search_results) {
        const results = response.data.search_results;
        const hasResults = results.flights?.length > 0 || results.hotels?.length > 0 || results.cars?.length > 0;
        
        if (hasResults) {
          setSearchResults({
            type: response.data.search_type,
            data: response.data.search_results
          });
        } else {
          setSearchResults(null);
        }
      } else {
        // Clear search results on error or no results
        setSearchResults(null);
      }

    } catch (error) {
      console.error('Error chatting with AI:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again or rephrase your question."
      }]);
      // Clear search results on error
      setSearchResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatSearchResults = (results) => {
    if (!results || !results.data) return null;

    const { type, data } = results;
    const items = data[type] || data.flights || data.hotels || data.cars || [];

    if (items.length === 0) return null;

    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">
          {type === 'flights' ? '✈️ Flights' : type === 'hotels' ? '🏨 Hotels' : '🚗 Cars'} Found:
        </h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {items.slice(0, 5).map((item, idx) => (
            <div key={idx} className="p-2 bg-white rounded text-sm">
              {type === 'flights' && (
                <div>
                  <div className="font-semibold">
                    {item.airline || 'Unknown Airline'} {item.flightId || item.flightNumber || ''}
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.departureAirport?.city || 'Unknown'} {item.departureAirport?.code ? `(${item.departureAirport.code})` : ''} 
                    → {item.arrivalAirport?.city || 'Unknown'} {item.arrivalAirport?.code ? `(${item.arrivalAirport.code})` : ''}
                  </div>
                  {(item.departureDateTime || item.departureTime) && (
                    <div className="text-xs text-gray-500 mt-1">
                      {item.departureDateTime ? new Date(item.departureDateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : item.departureTime}
                      {item.duration ? ` • ${item.duration}` : ''}
                    </div>
                  )}
                  <div className="text-green-600 font-semibold mt-1">
                    ${(item.ticketPrice || item.price || item.fare || 0).toFixed(2)}
                  </div>
                </div>
              )}
              {type === 'hotels' && (
                <div>
                  <strong>{item.hotelName}</strong> ({item.starRating}★) in {item.city}
                  <span className="text-green-600 font-semibold ml-2">${item.pricePerNight?.toFixed(2)}/night</span>
                </div>
              )}
              {type === 'cars' && (
                <div>
                  <strong>{item.make} {item.model}</strong> in {item.location?.city}
                  <span className="text-green-600 font-semibold ml-2">${item.dailyRentalPrice?.toFixed(2)}/day</span>
                </div>
              )}
            </div>
          ))}
        </div>
        {items.length > 5 && (
          <p className="text-xs text-gray-600 mt-2">Showing top 5 of {items.length} results</p>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-kayak-blue to-blue-600 text-white rounded-t-lg">
              <div className="flex items-center space-x-2">
                <FaRobot className="text-xl" />
                <h3 className="font-semibold">AI Travel Assistant</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-kayak-blue text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {/* Show search results if available */}
              {searchResults && formatSearchResults(searchResults)}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <FaSpinner className="animate-spin text-kayak-blue" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex items-center space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about travel..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-kayak-blue"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !inputMessage.trim()}
                  className="p-2 bg-kayak-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaPaperPlane />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Try: "Find cheap flights to Paris" or "Hotels in New York under $200"
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AIChatModal;

