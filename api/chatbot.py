#!/usr/bin/env python3
"""
API endpoint for Python chatbot integration
This would be used in a real backend implementation
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import re
from urllib.parse import urlparse, parse_qs

class ChatbotHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle POST requests to the chatbot endpoint"""
        try:
            # Parse the request
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Get the user message
            user_message = data.get('message', '')
            
            # Process the message
            response = self.process_message(user_message)
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            response_data = {
                'success': True,
                'response': response
            }
            
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        except Exception as e:
            # Handle errors
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = {
                'success': False,
                'response': 'Sorry, I encountered an error processing your message.',
                'error': str(e)
            }
            
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def process_message(self, user_message):
        """
        Process user message and return appropriate response based on conditions.
        
        Args:
            user_message (str): The user's input message
            
        Returns:
            str: The chatbot's response
        """
        # Convert to lowercase for case-insensitive matching
        message = user_message.lower().strip()
        
        # Remove punctuation for better matching
        message = re.sub(r'[^\w\s]', '', message)
        
        # Define response conditions
        if message == "hello":
            return "goodbye"
        elif message == "how are you":
            return "i'm fine"
        elif message == "bye":
            return "bye bye"
        else:
            # Default response for unmatched messages
            return f"I received your message: '{user_message}'. I can respond to 'hello', 'how are you?', and 'bye'."

def run_server(port=8080):
    """Run the chatbot server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, ChatbotHandler)
    print(f"🤖 Python Chatbot Server running on port {port}")
    print(f"📡 Endpoint: http://localhost:{port}/api/chatbot")
    print("🔄 Ready to process chatbot requests...")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Shutting down chatbot server...")
        httpd.shutdown()

if __name__ == "__main__":
    run_server()