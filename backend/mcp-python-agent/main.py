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

# === Load tool manifest ===
with open("tool_manifest.json") as f:
    tool_manifest = json.load(f)

# Format tool descriptions into a structured prompt
tool_docs = "\n\n".join(
    f"{tool['tool']}:\n  {tool['description']}\n  Parameters: {json.dumps(tool['parameters'])}"
    for tool in tool_manifest
    if isinstance(tool, dict)
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

# === Core Agent Logic ===
def run_agent(user_prompt: str):
    conversation_history.append({"role": "user", "content": user_prompt})
    
    routing_prompt = f"""
You are an intelligent medical assistant that helps manage a healthcare system's database and calendar scheduling.
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
    "query": "SQL query if applicable",
    ... other exact tool parameters ...
}}

3. For complex tasks:
{{
    "multi_step": true,
    "steps": [
        {{"tool": "tool1", ... exact parameters ...}},
        {{"tool": "tool2", ... exact parameters ...}}
    ],
    "explanation": "Why these steps are needed"
}}

The medical database has these tables:
- physicians (id, name, specialty, phone, email)
- patients (id, first_name, last_name, date_of_birth, phone, email, address)
- appointments (id, patient_id, physician_id, appointment_date, reason, status, created_at)

Common scenarios and how to handle them:
1. Scheduling appointments:
   - First verify physician exists
   - Then verify patient exists
   - Finally create calendar event and database entry
2. Adding new patients:
   - Request all required fields if not provided
   - Use medical_insert with table_name="patients"
3. Queries:
   - Use medical_query for SELECT operations
   - Use appropriate medical_* tools for modifications

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

User prompt: "{user_prompt}"

Return ONLY the JSON response, no other text.
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
                    print(f"\n❌ Sorry, something went wrong.")
                    return

            conversation_history.append({
                "role": "assistant",
                "multi_step": True,
                "steps": steps,
                "results": results
            })
            
            summary_prompt = f"""
Summarize this operation in a friendly, concise way. Focus on what was done and what the user should do next.
Results: {json.dumps(results, indent=2)}
"""
            summary = model.generate_content(summary_prompt)
            print(f"\n✨ {summary.text}")
            
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

                summary_prompt = f"""
Provide a friendly, concise summary of this result. Focus on the key information the user needs.
Result: {json.dumps(results, indent=2)}
"""
                summary = model.generate_content(summary_prompt)
                print(f"\n✨ {summary.text}")

            except Exception as e:
                print("\n❌ Sorry, something went wrong.")

    except json.JSONDecodeError:
        print("\n⚠️  I didn't quite understand that. Could you rephrase your request?")
    except Exception as e:
        print("\n❌ Sorry, something went wrong.")

# === Entry Point ===
if __name__ == "__main__":
    authorize_google()

    print("\n🏥 Medical Assistant")
    print("\nI can help you with:")
    print("• Scheduling and managing appointments")
    print("• Looking up patient and physician information")
    print("• Adding new patients to the system")
    print("• Checking schedules and availability")
    
    while True:
        user_input = input("\n👋 How can I help? (type 'exit' to quit)\n> ")
        if user_input.strip().lower() == "exit":
            print("\n👋 Goodbye!")
            break
        run_agent(user_input)
