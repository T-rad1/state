#!/usr/bin/env python3
"""
Python Chatbot Backend
Processes user messages and returns appropriate responses based on conditions.
"""

import sys
import json
import re

def process_message(user_message):
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

def main():
    """
    Main function to handle command line input and output.
    """
    try:
        # Read input from command line arguments or stdin
        if len(sys.argv) > 1:
            # Get message from command line argument
            user_input = ' '.join(sys.argv[1:])
        else:
            # Read from stdin if no arguments provided
            user_input = input().strip()
        
        # Process the message
        response = process_message(user_input)
        
        # Output the response
        print(response)
        
    except Exception as e:
        # Handle any errors gracefully
        print(f"Error processing message: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()