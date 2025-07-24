import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { sendToPythonChatbot } from '../utils/pythonChatbot';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface PropertyContext {
  title: string;
  location: string;
  price: number;
  type: string;
  bedrooms: number;
  bathrooms: number;
  size: number;
  year_built: number;
  amenities: string[];
  description: string;
  images: string[];
}

const SmartAssistantPage: React.FC = () => {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [propertyContext, setPropertyContext] = useState<PropertyContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom function with smooth behavior
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  };

  // Force scroll to top on initial load
  useEffect(() => {
    // Scroll to top immediately when component mounts
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Also ensure the messages container starts at top
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0;
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Only scroll if there are messages
    if (messages.length > 0) {
      // Use a small delay to ensure DOM has updated
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages, isTyping]);

  // Check for initial property message from sessionStorage
  useEffect(() => {
    const userMessage = sessionStorage.getItem('smartAssistantUserMessage');
    const propertyData = sessionStorage.getItem('smartAssistantPropertyContext');
    
    if (userMessage && propertyData) {
      // Clear the stored messages
      sessionStorage.removeItem('smartAssistantUserMessage');
      sessionStorage.removeItem('smartAssistantPropertyContext');
      
      // Parse and store property context for AI responses
      try {
        const parsedPropertyData = JSON.parse(propertyData);
        setPropertyContext(parsedPropertyData);
      } catch (error) {
        console.error('Error parsing property data:', error);
      }
      
      // Add the clean user message
      const initialMessage: Message = {
        id: Date.now().toString(),
        text: userMessage,
        sender: 'user',
        timestamp: new Date()
      };

      setMessages([initialMessage]);
      setIsTyping(true);

      // Generate an intelligent AI response about the property
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: generatePropertyResponse(propertyData),
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsTyping(false);
      }, 2000);
    }
  }, []);

  const generatePropertyResponse = (propertyData: string): string => {
    let property: PropertyContext;
    try {
      property = JSON.parse(propertyData);
    } catch (error) {
      return "I'd be happy to help you with this property! Could you tell me more about what you're looking for?";
    }

    // Extract key details from the property for a more intelligent response
    const hasBalcony = property.amenities.some(amenity => amenity.toLowerCase().includes('balcony'));
    const hasGarage = property.amenities.some(amenity => amenity.toLowerCase().includes('garage'));
    const hasPool = property.amenities.some(amenity => amenity.toLowerCase().includes('pool'));
    const hasGym = property.amenities.some(amenity => 
      amenity.toLowerCase().includes('gym') || amenity.toLowerCase().includes('fitness')
    );
    const isPetFriendly = property.amenities.some(amenity => amenity.toLowerCase().includes('pet friendly'));
    const isModern = property.type.toLowerCase().includes('modern') || 
                    property.type.toLowerCase().includes('contemporary') ||
                    property.description.toLowerCase().includes('modern');

    let response = `🏡 Excellent choice! I've reviewed **${property.title}** and I'm excited to help you explore why it could be perfect for you.\n\n`;

    // Add specific selling points based on amenities
    response += "✨ **Key Highlights:**\n";
    
    if (hasBalcony) {
      response += "• The balcony is perfect for morning coffee or evening relaxation with great views\n";
    }
    if (hasGarage) {
      response += "• Having a garage provides secure parking and extra storage space\n";
    }
    if (hasPool) {
      response += "• The pool area is ideal for recreation and adds significant property value\n";
    }
    if (hasGym) {
      response += "• The fitness center means you can maintain your workout routine without leaving home\n";
    }
    if (isPetFriendly) {
      response += "• Being pet-friendly makes this perfect if you have furry family members\n";
    }
    if (isModern) {
      response += "• The modern design ensures you'll have contemporary amenities and efficient layouts\n";
    }

    // Add property-specific highlights
    response += `• At ${property.size} sqft with ${property.bedrooms} bedrooms and ${property.bathrooms} bathrooms, it offers great space\n`;
    response += `• Built in ${property.year_built}, it's well-maintained and ${property.year_built > 2010 ? 'relatively new' : 'has character'}\n`;
    response += `• Located in ${property.location}, offering great convenience and lifestyle benefits\n`;

    response += "\n🤔 **Questions to help you decide:**\n";
    response += "• What's most important to you in your next home - location, space, or specific amenities?\n";
    response += "• Are you planning to move in soon, or are you still in the early research phase?\n";
    response += "• Would you like me to explain more about the neighborhood or nearby amenities?\n\n";

    response += "I'm here to answer any specific questions about this property, the area, financing options, or help you compare it with other listings. What would you like to know more about? 🏠";

    return response;
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userInput = inputText.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: userInput,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Check if this should go to Python chatbot
    const simpleChatbotCommands = ['hello', 'how are you', 'how are you?', 'bye'];
    const cleanInput = userInput.toLowerCase().replace(/[^\w\s]/g, '').trim();
    
    if (simpleChatbotCommands.some(cmd => cleanInput === cmd.replace(/[^\w\s]/g, ''))) {
      // Send to Python chatbot
      try {
        const pythonResponse = await sendToPythonChatbot(userInput);
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: pythonResponse.success ? pythonResponse.response : 'Sorry, I encountered an error processing your message.',
          sender: 'assistant',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setIsTyping(false);
      } catch (error) {
        console.error('Error with Python chatbot:', error);
        
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I encountered an error processing your message.',
          sender: 'assistant',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
        setIsTyping(false);
      }
    } else {
      // Use regular AI response for other messages
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: generateAIResponse(userInput),
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsTyping(false);
      }, 1500);
    }
  };

  const handleSendMessageOld = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: generateAIResponse(inputText),
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    // Check if this is a simple chatbot command that should go to Python
    const simpleChatbotCommands = ['hello', 'how are you', 'how are you?', 'bye'];
    const cleanInput = input.replace(/[^\w\s]/g, '').trim();
    
    if (simpleChatbotCommands.some(cmd => cleanInput === cmd.replace(/[^\w\s]/g, ''))) {
      // This will be handled by the Python chatbot in handleSendMessage
      return '';
    }
    
    // Property-specific responses using context
    if (propertyContext) {
      if (input.includes('garage') || input.includes('parking')) {
        const hasGarage = propertyContext.amenities.some(amenity => amenity.toLowerCase().includes('garage'));
        if (hasGarage) {
          return `Great news! **${propertyContext.title}** includes a garage, which is a huge advantage - you'll have secure parking, weather protection for your vehicle, and additional storage space. This is a valuable feature that many properties in the area don't offer!`;
        } else {
          return `**${propertyContext.title}** doesn't include a garage, but I can help you understand the parking options available. Many properties in ${propertyContext.location} offer street parking or nearby parking facilities. Would you like me to help you find similar properties that do include a garage?`;
        }
      }
      
      if (input.includes('neighborhood') || input.includes('area') || input.includes('location')) {
        return `**${propertyContext.location}** is a fantastic location! This area offers great convenience and lifestyle benefits. I'd be happy to tell you about nearby schools, shopping centers, restaurants, public transportation, and safety ratings. What specific aspects of the neighborhood are most important to you - schools, commute time, entertainment, or something else?`;
      }
      
      if (input.includes('price') || input.includes('cost') || input.includes('afford') || input.includes('budget')) {
        return `At **$${propertyContext.price.toLocaleString()}**, this property is competitively priced for a ${propertyContext.size} sqft ${propertyContext.type} in ${propertyContext.location}. That works out to about $${Math.round(propertyContext.price / propertyContext.size)} per square foot. I can help you understand the total cost of ownership, including potential HOA fees, property taxes, and utilities. Are you looking to buy or rent? Would you like me to explore financing options?`;
      }
      
      if (input.includes('size') || input.includes('space') || input.includes('room')) {
        return `This property offers **${propertyContext.size} sqft** with ${propertyContext.bedrooms} bedrooms and ${propertyContext.bathrooms} bathrooms - that's excellent space! The layout is designed to maximize functionality and give you comfortable living areas. Are you thinking about specific furniture arrangements, or do you need space for a home office, family activities, or storage?`;
      }
    }
    
    // General helpful responses
    if (input.includes('school') || input.includes('education')) {
      return "Education is so important! This area has access to quality schools, and I can provide detailed information about school ratings, districts, and nearby educational facilities. Are you looking for elementary, middle, or high schools? Or perhaps you're interested in colleges and universities in the area?";
    }
    
    if (input.includes('commute') || input.includes('work') || input.includes('transport')) {
      return "Commute convenience can make or break your daily routine! This location offers good transportation access. I can help you understand commute times to major business districts, public transportation options, and traffic patterns. Where would you typically be commuting to? That way I can give you specific travel time estimates.";
    }
    
    if (input.includes('investment') || input.includes('value') || input.includes('appreciate')) {
      return "This is a smart investment question! This property is in an area with strong market fundamentals and good appreciation potential. Factors like location, local development, school districts, and neighborhood trends all contribute to long-term value. Would you like me to explain the market trends in this area or discuss how this property compares to recent sales?";
    }
    
    if (input.includes('move') || input.includes('timeline') || input.includes('when')) {
      return "Timing is everything in real estate! If you're ready to move forward, I can help you understand the process timeline - from making an offer to closing. Properties in this area and price range tend to move quickly, so it's good to be prepared. Are you looking to move in soon, or do you have flexibility with your timeline?";
    }
    
    if (input.includes('compare') || input.includes('similar') || input.includes('other')) {
      return "Smart approach to compare options! I can help you evaluate this property against similar listings in the area. We can compare factors like price per square foot, amenities, location benefits, and overall value. What specific features are most important to you in your comparison? This will help me find the best alternatives to show you.";
    }
    
    if (input.includes('visit') || input.includes('tour') || input.includes('see')) {
      return "Absolutely! Seeing the property in person is the best way to get a feel for it. I can help coordinate a viewing or virtual tour. During the visit, I recommend checking the natural light, storage spaces, neighborhood noise levels, and getting a sense of the community. Would you prefer a private showing or are you comfortable with an open house?";
    }
    
    // Default response
    return "That's a great question! I'm here to help you make the best decision about this property. Whether you want to know more about the specific features, the neighborhood, financing options, or how it compares to other properties, I can provide detailed insights. What specific aspect would you like to explore further? I can also help you schedule a viewing or connect you with additional resources.";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 md:pt-20 transition-colors duration-200">
      {/* Header - positioned below navbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
        <Link 
          to="/"
          className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to home
        </Link>
      </div>

      {/* Main Content Container */}
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Messages Area */}
        {messages.length > 0 ? (
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-4 py-6"
          >
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-3xl rounded-lg px-4 py-3 ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                  } transition-colors duration-200`}>
                    <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 transition-colors duration-200">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          </div>
        ) : (
          /* Welcome Message */
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center">
              <h1 className="text-4xl font-normal text-gray-900 dark:text-white transition-colors duration-200">
                How can I help you?
              </h1>
            </div>
          </div>
        )}

        {/* Input Area - Fixed at bottom */}
        <div className="flex-shrink-0 p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                onClick={handleInputClick}
                placeholder="Type here!"
                className="w-full px-6 py-4 pr-16 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black dark:bg-gray-700 text-white rounded-full flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartAssistantPage;