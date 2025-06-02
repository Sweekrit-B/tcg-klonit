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
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            raw = response.text.strip()

            # Remove any markdown code blocks or language hints
            raw = re.sub(r"^```(json)?\n", "", raw)
            raw = raw.strip("`").strip()

            # Attempt to isolate just the JSON object (first {...} or [...] block)
            match = re.search(r"(\{.*\}|\[.*\])", raw, re.DOTALL)
            if match:
                raw = match.group(1)

            parsed = json.loads(raw)
            return parsed
        except json.JSONDecodeError as e:
            if attempt < max_retries - 1:
                print("\nRetrying due to invalid JSON...")
                continue
            else:
                raise e


# === Core Agent Logic ===
def run_agent(user_prompt: str):
    conversation_history.append({"role": "user", "content": user_prompt})
    
    routing_prompt = f"""
You are a general-purpose assistant that helps route user prompts to backend tools.

Your task is to read the user's intent and output exactly one valid JSON response in one of these formats:

1. When more information is needed:
{{
    "needs_info": true,
    "message": "Describe what's missing",
    "required_fields": ["field1", "field2"],
    "context": "Brief explanation of why"
}}

2. For a single tool call:
{{
    "tool": "exact_tool_name",
    "param1": "value",
    "param2": "value"
}}

3. For multi-step tasks:
{{
    "multi_step": true,
    "steps": [
        {{"tool": "tool1", "paramX": "value"}},
        {{"tool": "tool2", "paramY": "value"}}
    ],
    "explanation": "Why these steps are needed"
}}

You have access to the following tools:
{tool_docs}

Context (last few messages):
{json.dumps(conversation_history[-3:], indent=2)}

Time now: {datetime.now().isoformat()}

Rules:
- Always return valid JSON
- Never invent tools or parameters
- Ask for clarification when fields are missing
- Use the tool docs exactly

User prompt: "{user_prompt}"
"""

    try:
        print("\nThinking...")
        response = get_model_response(routing_prompt)

        if response.get("needs_info"):
            print(f"\nMissing Info: {response['message']}")
            print(f"Required fields: {', '.join(response['required_fields'])}")
            return

        if response.get("multi_step"):
            steps = response["steps"]
            results = []

            for i, step in enumerate(steps, 1):
                tool_name = step.get("tool")
                tool_args = {k: v for k, v in step.items() if k != "tool"}

                if tool_name not in tool_registry:
                    print(f"\nTool '{tool_name}' not recognized.")
                    return

                try:
                    result = tool_registry[tool_name](**tool_args)
                    results.append({"step": i, "result": result})
                except Exception as e:
                    print(f"\nError running tool '{tool_name}': {e}")
                    return

            conversation_history.append({
                "role": "assistant",
                "multi_step": True,
                "steps": steps,
                "results": results
            })

            summary_prompt = f"Summarize this output:\n{json.dumps(results, indent=2)}"
            summary = model.generate_content(summary_prompt)
            print(f"\nSummary:\n{summary.text}")

        else:
            tool_name = response.get("tool")
            tool_args = {k: v for k, v in response.items() if k != "tool"}

            if tool_name not in tool_registry:
                print(f"\nTool '{tool_name}' not recognized.")
                return

            result = tool_registry[tool_name](**tool_args)
            conversation_history.append({
                "role": "assistant",
                "tool": tool_name,
                "args": tool_args,
                "result": result
            })

            summary_prompt = f"Summarize this result:\n{json.dumps(result, indent=2)}"
            summary = model.generate_content(summary_prompt)
            print(f"\nSummary:\n{summary.text}")

    except json.JSONDecodeError:
        print("\nInvalid response format. Please try again.")
    except Exception as e:
        print(f"\nUnexpected error: {e}")

# === Entry Point ===
if __name__ == "__main__":
    authorize_google()

    print("\nGeneral MCP Agent")
    print("\nYou can ask to:")
    print("• Search or read Drive files")
    print("• Query or update SQL data (medical or retail)")
    print("• Access Google Calendar")
    
    while True:
        user_input = input("\nEnter your request (or type 'exit' to quit):\n> ")
        if user_input.strip().lower() == "exit":
            print("\nExiting. Goodbye!")
            break
        run_agent(user_input)
