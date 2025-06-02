import os
import json
import re
import warnings
import dotenv
import google.generativeai as genai
from tool_registry import tool_registry
from datetime import datetime

# === Load environment variables and configure Gemini ===
dotenv.load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
warnings.filterwarnings("ignore", category=UserWarning, module="urllib3")

# === Initialize Gemini model ===
model = genai.GenerativeModel("gemini-2.0-flash")

# === Load tool manifest ===
with open("tool_manifest.json") as f:
    tool_manifest = json.load(f)

# Format tool descriptions into a structured prompt
tool_docs = "\n\n".join(
    f"{tool['tool']}:\n  {tool['description']}\n  Parameters: {json.dumps(tool['parameters'])}"
    for tool in tool_manifest
    if isinstance(tool, dict) and tool['tool'].startswith('retail_')  # Only include retail tools
)

# Initialize conversation history
conversation_history = []

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
                print("\n⚠️  Let me try that again...")
                continue
            else:
                raise e

def run_agent(user_prompt: str):
    conversation_history.append({"role": "user", "content": user_prompt})
    
    routing_prompt = f"""
You are a database assistant that executes SQL operations on a retail database.
Your task is to convert user requests into database operations.

When the user asks to update a price (e.g. "update price of X to $Y" or "change price of X to $Y"),
you MUST return this EXACT format with the price as a decimal number (no $ symbol):
{{
    "tool": "retail_update",
    "table_name": "products",
    "data": {{"price": Y}},
    "where": {{"product_name": "X"}}
}}

When the user asks for a price (e.g. "what is the price of X" or "how much is X"),
you MUST return this EXACT format:
{{
    "tool": "retail_query",
    "query": "SELECT product_name, price FROM products WHERE product_name = 'X'"
}}

Available tables:
- products (product_id, product_name, description, price)
- customer_profiles (customer_id, email, first_name, last_name, phone_number, address)
- sales (transaction_id, customer_id, product_id, order_date, quantity, total_amount)
- customer_engagement (case_id, customer_id, case_open_date, case_close_date, case_description, resolution)

Available tools and their parameters:
{tool_docs}

Previous conversation:
{json.dumps(conversation_history[-3:], indent=2)}

Remember:
1. For price updates, remove any currency symbols ($ or others) and convert to decimal
2. Use exact table and column names as shown above
3. For product updates, always use product_name in the where clause
4. Return ONLY the JSON response, no other text

User prompt: "{user_prompt}"
"""

    try:
        print("\n🤔 Thinking...", end="", flush=True)
        response = get_model_response(routing_prompt)
        print("\r", end="")  # Clear the thinking message

        if response.get("needs_info"):
            print(f"\n❓ {response['message']}")
            print(f"Please provide: {', '.join(response['required_fields'])}")
            return

        if response.get("multi_step"):
            steps = response["steps"]
            results = []
            
            for i, step in enumerate(steps, 1):
                tool_name = step.get("tool")
                tool_args = {k: v for k, v in step.items() if k != "tool"}
                
                if tool_name not in tool_registry:
                    print(f"\n⚠️  Sorry, I can't do that right now.")
                    return

                try:
                    result = tool_registry[tool_name](**tool_args)
                    results.append({"step": i, "result": result})
                except Exception as e:
                    print(f"\n❌ Sorry, something went wrong: {str(e)}")
                    return

            conversation_history.append({
                "role": "assistant",
                "multi_step": True,
                "steps": steps,
                "results": results
            })
            
            # For multi-step operations, just list the tools called and their results
            print("\n✨ Operations performed:")
            for i, result in enumerate(results, 1):
                print(f"Step {i}: {result['result']['content'][0]['text']}")
            
        else:
            tool_name = response.get("tool")
            tool_args = {k: v for k, v in response.items() if k != "tool"}

            if not tool_name or tool_name not in tool_registry:
                print("\n⚠️  Sorry, I can't do that right now.")
                return

            try:
                results = tool_registry[tool_name](**tool_args)
                conversation_history.append({
                    "role": "assistant",
                    "tool": tool_name,
                    "args": tool_args,
                    "result": results
                })

                # Simply print which tool was called and its result
                print(f"\n✨ {results['content'][0]['text']}")

            except Exception as e:
                print(f"\n❌ Sorry, something went wrong: {str(e)}")

    except json.JSONDecodeError:
        print("\n⚠️  I didn't quite understand that. Could you rephrase your request?")
    except Exception as e:
        print(f"\n❌ Sorry, something went wrong: {str(e)}")

def main():
    print("\n🛍️  Retail Assistant")
    print("\nI can help you with:")
    print("• Checking product information and prices")
    print("• Updating product details")
    print("• Looking up sales and customer information")
    print("• Managing customer support cases")
    
    while True:
        user_input = input("\n👋 How can I help? (type 'exit' to quit)\n> ")
        if user_input.strip().lower() == "exit":
            print("\n👋 Goodbye!")
            break
        run_agent(user_input)

if __name__ == "__main__":
    main() 