import os
import json
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

# Load tool manifest for help text
with open("tool_manifest.json") as f:
    tool_manifest = json.load(f)

def print_available_tools():
    """Print all available tools and their descriptions."""
    print("\nAvailable Tools:")
    print("---------------")
    for tool in tool_manifest:
        if isinstance(tool, dict):
            print(f"\n{tool['tool']}:")
            print(f"  Description: {tool['description']}")
            print(f"  Parameters: {json.dumps(tool['parameters'], indent=2)}")

def run_tool_demo():
    """Interactive demo to run any available tool."""
    authorize_google()
    
    while True:
        print("\nTool Demonstrator")
        print("1. List available tools")
        print("2. Run a tool")
        print("3. Exit")
        
        choice = input("\nEnter your choice (1-3): ")
        
        if choice == "1":
            print_available_tools()
            
        elif choice == "2":
            print("\nAvailable tools:")
            for tool in tool_manifest:
                if isinstance(tool, dict):
                    print(f"- {tool['tool']}")
            
            tool_name = input("\nEnter tool name: ").strip()
            
            if tool_name not in tool_registry:
                print(f"\nError: Tool '{tool_name}' not found")
                continue
            
            # Find tool parameters from manifest
            tool_info = next((t for t in tool_manifest if isinstance(t, dict) and t['tool'] == tool_name), None)
            if not tool_info:
                print(f"\nError: Tool '{tool_name}' not found in manifest")
                continue
            
            # Get parameters from user
            params = {}
            for param_name, param_info in tool_info['parameters'].items():
                if isinstance(param_info, dict):
                    if param_info.get('required', False):
                        value = input(f"Enter {param_name} (required): ")
                        params[param_name] = value
                    else:
                        value = input(f"Enter {param_name} (optional, press Enter to skip): ")
                        if value:
                            params[param_name] = value
                else:
                    value = input(f"Enter {param_name}: ")
                    if value:
                        params[param_name] = value
            
            try:
                # Call the tool
                print("\nCalling tool...")
                result = tool_registry[tool_name](**params)
                
                # Display results
                print("\nResult:")
                if isinstance(result, dict):
                    if "content" in result:
                        for item in result["content"]:
                            print(item.get("text", ""))
                    elif "htmlLink" in result:
                        print(f"Calendar event created: {result['htmlLink']}")
                    else:
                        print(json.dumps(result, indent=2))
                else:
                    print(result)
                    
            except Exception as e:
                print(f"\nError running tool: {str(e)}")
            
        elif choice == "3":
            print("\nGoodbye!")
            break
        
        else:
            print("\nInvalid choice. Please try again.")

if __name__ == "__main__":
    run_tool_demo() 