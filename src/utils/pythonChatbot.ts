/**
 * Python Chatbot Integration Utility
 * Handles communication between the frontend and Python chatbot backend
 */

export interface ChatbotResponse {
  success: boolean;
  response: string;
  error?: string;
}

/**
 * Send a message to the Python chatbot backend and get a response
 * @param message - The user's message to send to the chatbot
 * @returns Promise<ChatbotResponse> - The chatbot's response
 */
export async function sendToPythonChatbot(message: string): Promise<ChatbotResponse> {
  try {
    console.log('🐍 Sending message to Python chatbot:', message);
    
    // In a real implementation, this would make an HTTP request to a Python server
    // For this demo, we'll simulate the Python logic in TypeScript
    const response = await simulatePythonChatbot(message);
    
    console.log('✅ Python chatbot response:', response);
    
    return {
      success: true,
      response: response
    };
  } catch (error) {
    console.error('❌ Error communicating with Python chatbot:', error);
    
    return {
      success: false,
      response: 'Sorry, I encountered an error processing your message.',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Simulate the Python chatbot logic in TypeScript
 * This mimics the behavior of the Python script
 * @param userMessage - The user's input message
 * @returns Promise<string> - The chatbot's response
 */
async function simulatePythonChatbot(userMessage: string): Promise<string> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Convert to lowercase for case-insensitive matching
  const message = userMessage.toLowerCase().trim();
  
  // Remove punctuation for better matching
  const cleanMessage = message.replace(/[^\w\s]/g, '');
  
  // Define response conditions (matching the Python logic)
  if (cleanMessage === "hello") {
    return "goodbye";
  } else if (cleanMessage === "how are you") {
    return "i'm fine";
  } else if (cleanMessage === "bye") {
    return "bye bye";
  } else {
    // Default response for unmatched messages
    return `I received your message: '${userMessage}'. I can respond to 'hello', 'how are you?', and 'bye'.`;
  }
}

/**
 * Alternative implementation that would call the actual Python script
 * This would require a backend server to execute Python scripts
 */
export async function callPythonScript(message: string): Promise<ChatbotResponse> {
  try {
    // This would be the actual implementation in a real backend
    const response = await fetch('/api/chatbot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      response: data.response
    };
  } catch (error) {
    return {
      success: false,
      response: 'Sorry, I encountered an error processing your message.',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}