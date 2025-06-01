import os
import json
import re
import warnings
import dotenv
import google.generativeai as genai
from tool_registry import tool_registry
from auth import authorize_google
from datetime import datetime

# === Load environment variables and configure Gemini ===
dotenv.load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
warnings.filterwarnings("ignore", category=UserWarning, module="urllib3")

# === Initialize Gemini model ===
model = genai.GenerativeModel("gemini-2.0-flash")

# Initialize conversation history and context
conversation_history = []
current_context = {
    "current_action": None,  # what we're currently doing
    "product_id": None,      # selected product
    "customer_id": None      # current customer
}

def get_model_response(prompt: str, max_retries=2):
    """Get a valid JSON response from the model with retries."""
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            raw = response.text.strip()
            if raw.startswith("```"):
                raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw).strip("`").strip()
            parsed = json.loads(raw)
            return parsed
        except json.JSONDecodeError as e:
            if attempt < max_retries - 1:
                print("\nRetrying...")
                continue
            else:
                raise e

def run_agent(user_prompt: str):
    conversation_history.append({"role": "user", "content": user_prompt})
    
    routing_prompt = f"""
You are a retail assistant that helps customers find products and manage their orders. Keep responses direct and simple.

Your task is to understand user requests and respond with EXACTLY ONE of these JSON formats:

1. For finding products:
{{
    "tool": "retail_query",
    "query": "SELECT product_id, product_name, description, price FROM products WHERE product_name ILIKE '%keyword%' OR description ILIKE '%keyword%'",
    "message": "I found the following products:",
    "summary": "Here are the available products. Would you like to place an order?"
}}

2. For checking inventory:
{{
    "tool": "retail_query",
    "query": "SELECT p.product_id, p.product_name, p.description, p.price FROM products p",
    "message": "Here's our current inventory:",
    "summary": "These items are in stock. Would you like to know more about any product?"
}}

3. For placing an order:
{{
    "tool": "retail_insert",
    "table_name": "sales",
    "data": {{
        "customer_id": 1,
        "product_id": 1,
        "quantity": 2,
        "order_date": "NOW()",
        "total_amount": 0
    }},
    "message": "Processing your order...",
    "summary": "Your order has been placed successfully."
}}

4. For adding to Google Calendar (delivery schedule):
{{
    "tool": "create_event",
    "summary": "Product Delivery",
    "start_datetime": "{datetime.now().strftime('%Y-%m-%d')}T14:00:00",
    "end_datetime": "{datetime.now().strftime('%Y-%m-%d')}T15:00:00",
    "description": "Your order delivery window",
    "location": "Customer Address",
    "message": "Scheduling your delivery...",
    "summary_msg": "Delivery has been scheduled. You can view the details at:"
}}

Current Context:
{json.dumps(current_context, indent=2)}

Previous Messages:
{json.dumps(conversation_history[-3:], indent=2)}

Guidelines:
1. For initial product search, use format #1
2. For inventory check, use format #2
3. When user confirms order, use format #3
4. For delivery scheduling, use format #4
5. For calendar events, use ISO format with T separator (YYYY-MM-DDTHH:MI:SS)
6. Don't modify the JSON structure or field names
7. Calendar events will use the user's calendar timezone settings

User prompt: "{user_prompt}"

Return ONLY the JSON response, no other text.
"""

    try:
        print("\nProcessing your request...", end="", flush=True)
        response = get_model_response(routing_prompt)
        print("\r" + " " * 25 + "\r", end="")  # Clear the processing message
        
        tool_name = response.get("tool")
        if not tool_name or tool_name not in tool_registry:
            print("\nI apologize, I couldn't process that request.")
            print("Please try asking about products or inventory first.")
            return

        try:
            # Extract tool arguments based on the tool type
            if tool_name == "retail_query":
                tool_args = {"query": response.get("query")}
            elif tool_name == "retail_insert":
                # Verify we have all required data
                data = response.get("data")
                table_name = response.get("table_name")
                
                if not data or not isinstance(data, dict):
                    raise ValueError("Invalid order data format")
                
                if not table_name:
                    raise ValueError("Missing table information")
                
                required_fields = ["customer_id", "product_id", "quantity", "status"]
                missing_fields = [f for f in required_fields if f not in data]
                
                if missing_fields:
                    raise ValueError(f"Missing required order information: {', '.join(missing_fields)}")
                
                tool_args = {
                    "table_name": table_name,
                    "data": data
                }
            elif tool_name == "create_event":
                # Extract calendar event arguments
                tool_args = {
                    "summary": response.get("summary"),
                    "start_datetime": response.get("start_datetime"),
                    "end_datetime": response.get("end_datetime"),
                    "description": response.get("description"),
                    "location": response.get("location")
                }
                # Store the message and summary separately
                response["message"] = response.get("message")
                response["summary"] = response.get("summary_msg")
            else:
                tool_args = {k: v for k, v in response.items() if k not in ["tool", "message", "summary", "summary_msg"]}
            
            # Call the tool with the extracted arguments
            results = tool_registry[tool_name](**tool_args)
            
            # Update context based on the response
            if tool_name == "retail_query":
                current_context["current_action"] = "browsing"
            elif tool_name == "retail_insert":
                current_context["current_action"] = "ordering"
                current_context["product_id"] = data.get("product_id")
            elif tool_name == "create_event":
                current_context["current_action"] = "delivery_scheduled"
            
            # Check if there was an error in the results
            if isinstance(results, dict) and "content" in results:
                content = results["content"]
                if isinstance(content, list) and content:
                    text = content[0].get("text", "")
                    if "error" in text.lower():
                        print(f"\n{text}")
                        return
            
            # If no error, display the success messages
            if response.get("message"):
                print(f"\n{response['message']}")
            
            # Display results in a clean format
            if isinstance(results, dict):
                if "content" in results:
                    content = results["content"]
                    if isinstance(content, list) and content:
                        text = content[0].get("text", "")
                        try:
                            # Try to parse as list of dicts for product info
                            data = eval(text)
                            if isinstance(data, list):
                                for item in data:
                                    if isinstance(item, dict):
                                        if "price" in item:  # Product listing
                                            print(f"- {item.get('product_name')}")
                                            print(f"  Price: ${item.get('price'):.2f}")
                                            print(f"  Description: {item.get('description')}")
                                            if "category" in item:
                                                print(f"  Category: {item.get('category')}")
                            else:
                                # For order confirmations, clean up the output
                                if "status" in str(data):
                                    order_data = json.loads(text.split(": ", 1)[1])
                                    print(f"Order Details:")
                                    print(f"  Order ID: {order_data.get('id')}")
                                    print(f"  Status: {order_data.get('status')}")
                                    print(f"  Quantity: {order_data.get('quantity')}")
                                else:
                                    print(text)
                        except:
                            # If not parseable, just print the text
                            print(text)
                # For calendar events, show the link
                elif "htmlLink" in results:
                    print(f"\nView your delivery schedule at: {results['htmlLink']}")
            
            # Display the summary only if no error occurred
            if response.get("summary"):
                print(f"\n{response['summary']}")

        except Exception as e:
            print("\nError:", str(e))
            print("Please try again with clearer instructions.")

    except Exception as e:
        print("\nError:", str(e))
        print("Please try again with a different request format.")

# === Entry Point ===
if __name__ == "__main__":
    authorize_google()
    
    print("\nRetail Assistant")
    print("I can help you find products, check inventory, and place orders.")
    print("Example: 'Show me all products in stock' or 'I want to buy a laptop'")
    
    while True:
        user_input = input("\nHow may I assist you? (type 'exit' to quit)\n> ")
        if user_input.strip().lower() == "exit":
            print("\nThank you for shopping with us. Goodbye!")
            break
        run_agent(user_input) 