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
You are an intelligent retail assistant that helps manage a retail store's database.
Your task is to understand user requests and respond with EXACTLY ONE of these JSON formats:

1. When you need more information:
{{
    "needs_info": true,
    "message": "Clear explanation of what information is needed",
    "required_fields": ["specific_field1", "specific_field2"],
    "context": "Why this information is needed"
}}

2. For a single operation:
{{
    "tool": "exact_tool_name",
    "table_name": "table_name if applicable",
    "data": {{"field": "value"}} if updating/inserting,
    "where": {{"field": "value"}} if updating/deleting,
    "query": "SQL query if using retail_query"
}}

3. For complex tasks:
{{
    "multi_step": true,
    "steps": [
        {{"tool": "tool1", "table_name": "...", "data": {{...}}, "where": {{...}}}},
        {{"tool": "tool2", "query": "..."}}
    ],
    "explanation": "Why these steps are needed"
}}

The retail database has these tables:
- products (product_id, product_name, description, price)
- customer_profiles (customer_id, email, first_name, last_name, phone_number, address)
- sales (transaction_id, customer_id, product_id, order_date, quantity, total_amount)
- customer_engagement (case_id, customer_id, case_open_date, case_close_date, case_description, resolution)

Common scenarios and how to handle them:
1. Updating product prices:
   - Use retail_update with table_name="products"
   - Set data={{"price": new_price_value}}
   - Set where={{"product_name": "exact product name"}}
   Example: To update Laptop Pro to $500:
   {{
     "tool": "retail_update",
     "table_name": "products",
     "data": {{"price": 500.00}},
     "where": {{"product_name": "Laptop Pro"}}
   }}
2. Querying products/sales:
   - Use retail_query with appropriate SELECT statement
   Example: To get Laptop Pro's price:
   {{
     "tool": "retail_query",
     "query": "SELECT price FROM products WHERE product_name = 'Laptop Pro'"
   }}
3. Adding new products:
   - Use retail_insert with table_name="products"

Previous conversation:
{json.dumps(conversation_history[-3:], indent=2)}

Available tools and parameters:
{tool_docs}

Current date/time: {datetime.now().isoformat()}

Remember:
1. ALWAYS return valid JSON
2. NEVER invent tool names or parameters
3. ASK for missing information instead of guessing
4. USE exact parameter names from the tool documentation
5. For updates, ALWAYS use retail_update instead of retail_query
6. ALWAYS use product_name (not product_id) when updating products

User prompt: "{user_prompt}"

Return ONLY the JSON response, no other text.
"""

    try:
        print("\nThinking...", end="", flush=True)
        response = get_model_response(routing_prompt)
        print("\r", end="")  # Clear the thinking message

        if response.get("needs_info"):
            print(f"\n{response['message']}")
            print(f"Please provide: {', '.join(response['required_fields'])}")
            return

        if response.get("multi_step"):
            steps = response["steps"]
            results = []
            
            for i, step in enumerate(steps, 1):
                tool_name = step.get("tool")
                tool_args = {k: v for k, v in step.items() if k != "tool"}
                
                if tool_name not in tool_registry:
                    print(f"\nSorry, I can't do that right now.")
                    return

                try:
                    result = tool_registry[tool_name](**tool_args)
                    results.append({"step": i, "result": result})
                except Exception as e:
                    print(f"\nSorry, something went wrong: {str(e)}")
                    return

            conversation_history.append({
                "role": "assistant",
                "multi_step": True,
                "steps": steps,
                "results": results
            })
            
            summary_prompt = f"""
Summarize this retail operation in a friendly, concise way. Focus on what was done and what the user should do next.
Results: {json.dumps(results, indent=2)}
"""
            summary = model.generate_content(summary_prompt)
            print(f"\n{summary.text}")
            
        else:
            tool_name = response.get("tool")
            tool_args = {k: v for k, v in response.items() if k != "tool"}

            if not tool_name or tool_name not in tool_registry:
                print("\nSorry, I can't do that right now.")
                return

            try:
                results = tool_registry[tool_name](**tool_args)
                conversation_history.append({
                    "role": "assistant",
                    "tool": tool_name,
                    "args": tool_args,
                    "result": results
                })

                print(f"\nTool used: {tool_name}")
                print(f"Result: {json.dumps(results, indent=2)}")
                
                # Add a simple summary for retail_update operations
                if tool_name == "retail_update" and tool_args.get("table_name") == "products":
                    print(f"\nUpdated the price to ${tool_args['data']['price']:.2f}.")
                elif tool_name == "retail_query":
                    result_text = results.get("content", [{}])[0].get("text", "[]")
                    if "price" in result_text:
                        print(f"\nThe current price is shown above.")

            except Exception as e:
                print(f"\nSorry, something went wrong: {str(e)}")

    except json.JSONDecodeError:
        print("\nI didn't quite understand that. Could you rephrase your request?")
    except Exception as e:
        print(f"\nSorry, something went wrong: {str(e)}")

def main():
    print("\nRetail Assistant")
    print("\nI can help you with:")
    print("• Checking product information and prices")
    print("• Updating product details")
    print("• Looking up sales and customer information")
    print("• Managing customer support cases")
    
    while True:
        user_input = input("\nHow can I help? (type 'exit' to quit)\n> ")
        if user_input.strip().lower() == "exit":
            print("\nGoodbye!")
            break
        run_agent(user_input)

if __name__ == "__main__":
    main() 