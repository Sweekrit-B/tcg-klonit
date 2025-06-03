import os
import json
import re
import warnings
import dotenv
import google.generativeai as genai
from datetime import datetime
from tool_registry import tool_registry
from auth import authorize_google

# === Setup ===
dotenv.load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
warnings.filterwarnings("ignore", category=UserWarning, module="urllib3")
model = genai.GenerativeModel("gemini-2.0-flash")

# === Tool manifest ===
with open("tool_manifest.json") as f:
    tool_manifest = json.load(f)

tool_docs = "\n\n".join(
    f"{tool['tool']}:\n  {tool['description']}\n  Parameters: {json.dumps(tool['parameters'])}"
    for tool in tool_manifest if isinstance(tool, dict)
)

conversation_history = []

def get_model_response(prompt, max_retries=2):
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            raw = response.text.strip()
            if raw.startswith("```"):
                raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw).strip("`").strip()
            return json.loads(raw)
        except json.JSONDecodeError:
            if attempt < max_retries - 1:
                continue
            raise

def run_agent(user_prompt):
    conversation_history.append({"role": "user", "content": user_prompt})
    current_datetime = datetime.now().isoformat()

    routing_prompt = f"""
You are a scheduling assistant for a medical office.

Rules:
- Always return valid JSON
- Never invent tool names or parameters
- Ask for clarification if fields like date, time, or patient name are missing
- Use only the tools defined below
- Assume physician/patient names are unique

Tools:
{tool_docs}

Conversation History (last 3):
{json.dumps(conversation_history[-3:], indent=2)}

Current date/time: {current_datetime}

User input: "{user_prompt}"

Return JSON in one of the following forms:

1. Request for clarification:
{{ "needs_info": true, "message": "...", "required_fields": ["field1", "field2"] }}

2. Single tool call:
{{ "tool": "exact_tool_name", ...tool_parameters... }}

3. Multi-step execution:
{{ "multi_step": true, "steps": [{{ "tool": "...", ...params... }}, ...] }}
"""

    try:
        response = get_model_response(routing_prompt)

        if response.get("needs_info"):
            print(f"Missing info: {response['message']}")
            print("Required fields:", ", ".join(response["required_fields"]))
            return

        if response.get("multi_step"):
            for i, step in enumerate(response["steps"], 1):
                tool_name = step.get("tool")
                tool_args = {k: v for k, v in step.items() if k != "tool"}
                if tool_name not in tool_registry:
                    print(f"Tool '{tool_name}' not recognized.")
                    continue
                result = tool_registry[tool_name](**tool_args)
                print(f"Step {i}: {tool_name} -> {result}")
            return

        tool_name = response.get("tool")
        if tool_name not in tool_registry:
            print("Tool not recognized.")
            return
        tool_args = {k: v for k, v in response.items() if k != "tool"}

        result = tool_registry[tool_name](**tool_args)
        print(f"Tool '{tool_name}' executed successfully.")
        if isinstance(result, dict) and "htmlLink" in result:
            print("Calendar link:", result["htmlLink"])
        else:
            print("Result:", result)

    except Exception as e:
        print("Error occurred:", str(e))

# === Entry point ===
if __name__ == "__main__":
    authorize_google()
    print("\nMedical Assistant")
    print("I can help you find doctors, schedule appointments, and view database information.")
    while True:
        user_input = input("\n> ")
        if user_input.lower() == "exit":
            print("Goodbye.")
            break
        run_agent(user_input)
