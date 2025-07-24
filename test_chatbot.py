#!/usr/bin/env python3
"""
Test script for the Python chatbot
Tests the chatbot functionality with various inputs
"""

import sys
import os

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from chatbot_backend import process_message

def test_chatbot():
    """Test the chatbot with various inputs"""
    
    print("🤖 Testing Python Chatbot Backend")
    print("=" * 40)
    
    # Test cases
    test_cases = [
        ("hello", "goodbye"),
        ("Hello", "goodbye"),
        ("HELLO", "goodbye"),
        ("hello!", "goodbye"),
        ("how are you", "i'm fine"),
        ("How are you?", "i'm fine"),
        ("HOW ARE YOU", "i'm fine"),
        ("bye", "bye bye"),
        ("Bye", "bye bye"),
        ("BYE!", "bye bye"),
        ("random message", None)  # Should return default response
    ]
    
    print("Running test cases:")
    print("-" * 40)
    
    for i, (input_msg, expected) in enumerate(test_cases, 1):
        print(f"\nTest {i}:")
        print(f"Input: '{input_msg}'")
        
        response = process_message(input_msg)
        print(f"Output: '{response}'")
        
        if expected:
            if response == expected:
                print("✅ PASS")
            else:
                print(f"❌ FAIL - Expected: '{expected}'")
        else:
            # For default responses, just check if it contains the input
            if input_msg.lower() in response.lower():
                print("✅ PASS (Default response)")
            else:
                print("❌ FAIL (Default response)")
    
    print("\n" + "=" * 40)
    print("🎉 Chatbot testing completed!")

def interactive_test():
    """Interactive testing mode"""
    print("\n🎮 Interactive Chatbot Test Mode")
    print("Type messages to test the chatbot (type 'quit' to exit)")
    print("-" * 50)
    
    while True:
        try:
            user_input = input("\nYou: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            
            if not user_input:
                continue
            
            response = process_message(user_input)
            print(f"Bot: {response}")
            
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    # Run automated tests
    test_chatbot()
    
    # Ask if user wants interactive mode
    try:
        choice = input("\nWould you like to try interactive mode? (y/n): ").strip().lower()
        if choice in ['y', 'yes']:
            interactive_test()
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")