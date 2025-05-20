import os
import json
import re
import warnings
import dotenv
import google.generativeai as genai
from tool_registry import tool_registry

# === Load environment variables and configure Gemini ===
dotenv.load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
warnings.filterwarnings("ignore", category=UserWarning, module="urllib3")

# === Initialize Gemini model ===
model = genai.GenerativeModel("gemini-2.0-flash")

# === Load Tool Manifest ===
# This file defines the tools Gemini can call, including parameters and descriptions.
with open("tool_manifest.json") as f:
    tool_manifest = json.load(f)

# Format tool descriptions for Gemini's routing prompt
tool_docs = "\n\n".join(
    f"{tool['tool']}:\n  {tool['description']}\n  Parameters: {json.dumps(tool['parameters'])}"
    for tool in tool_manifest
)

# === Tool Routing + Execution Logic ===
def run_agent(user_prompt):
    routing_prompt = f"""
You are a tool router that receives a user request and returns ONLY a JSON object.

Supported tools and parameters:
{tool_docs}

Format your output like this:
{{ "tool": "<tool_name>", ...tool parameters... }}
OR
{{ "tool_name": "<tool_name>", "parameters": {{ ... }} }}

Do NOT invent parameter names. Use exact fields above.

User prompt: "{user_prompt}"
"""

    # === 1. Ask Gemini to route the prompt to a tool
    tool_response = model.generate_content(routing_prompt)
    print("\n🤖 Gemini tool routing response:\n", tool_response.text)

    try:
        # === 2. Clean up code block format
        raw = tool_response.text.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw).strip("`").strip()

        tool_call = json.loads(raw)

        # === 3. Normalize format
        tool_name = tool_call.get("tool") or tool_call.get("tool_name")
        tool_args = tool_call.get("parameters", {})

        if not tool_args and tool_name:
            tool_args = {k: v for k, v in tool_call.items() if k not in ["tool", "tool_name"]}

        if tool_name not in tool_registry:
            print(f"⚠️ Tool '{tool_name}' is not supported.")
            return

        print(f"\n⚙️ Calling tool: {tool_name} with args: {tool_args}")
        results = tool_registry[tool_name](**tool_args)

        # === 4. Summarize results with Gemini
        print("\n✅ Tool result:\n", json.dumps(results, indent=2))
        summary_prompt = f"Summarize this output from the tool '{tool_name}':\n{json.dumps(results, indent=2)}"
        summary = model.generate_content(summary_prompt)
        print("\n🗣️ Gemini summary:\n", summary.text)

    except json.JSONDecodeError:
        print("❌ Gemini did not return valid JSON. Try adjusting your prompt format.")
    except Exception as e:
        print("❌ Error during tool execution or parsing:", str(e))

    print("\n====================\n")

# === Run Agent ===
if __name__ == "__main__":
    while True:
        user_input = input("Enter your request: ")
        if(user_input.lower() == "exit"):
            break
        run_agent(user_input)
    
