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

# Initialize conversation history and context
conversation_history = []
current_context = {
    "domain": None,  # medical or retail
    "current_action": None,  # what we're currently doing (e.g. scheduling_appointment)
    "doctor_id": None,  # selected doctor for appointment
    "appointment_date": None  # selected appointment date
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
    # Get current year for appointments
    current_year = datetime.now().year
    
    conversation_history.append({"role": "user", "content": user_prompt})
    
    routing_prompt = f"""
You are a medical assistant that helps patients schedule appointments with doctors and manage their calendar. Keep responses direct and simple.

Your task is to understand user requests and respond with EXACTLY ONE of these JSON formats:

1. For finding cardiologists or any doctors:
{{
    "tool": "medical_query",
    "query": "SELECT id, name, specialty, phone FROM physicians WHERE specialty ILIKE '%Cardiology%' OR name ILIKE '%Smith%'",
    "message": "I found the following doctors:",
    "summary": "Here are the available doctors. Would you like to schedule an appointment?"
}}

2. For scheduling an appointment (ONLY use this after finding a doctor):
{{
    "tool": "medical_insert",
    "table_name": "appointments",
    "data": {{
        "patient_id": 1,
        "physician_id": 1,
        "appointment_date": "{current_year}-06-05 10:00:00",
        "reason": "Cardiology consultation",
        "status": "scheduled"
    }},
    "message": "Scheduling your appointment...",
    "summary": "Your appointment has been scheduled successfully."
}}

3. For adding an appointment to Google Calendar:
{{
    "tool": "create_event",
    "summary": "Appointment with Dr. Smith",
    "start_datetime": "{current_year}-06-05T10:00:00",
    "end_datetime": "{current_year}-06-05T11:00:00",
    "description": "Cardiology consultation",
    "location": "Dr. Smith's Office",
    "message": "Adding to your calendar...",
    "summary_msg": "The appointment has been added to your calendar. You can view it at:"
}}

Current Context:
{json.dumps(current_context, indent=2)}

Previous Messages:
{json.dumps(conversation_history[-3:], indent=2)}

Guidelines:
1. For initial doctor search, use format #1
2. When user confirms scheduling after finding a doctor, use format #2
3. When user asks to add to calendar, use format #3
4. For format #2 and #3, keep all fields exactly as shown, just update the values
5. The appointment_date should be in exact format: YYYY-MM-DD HH:MI:SS
6. For calendar events, use ISO format with T separator (YYYY-MM-DDTHH:MI:SS)
7. Don't modify the JSON structure or field names
8. Always use the current year ({current_year}) for appointments unless explicitly specified otherwise
9. Calendar events will use the user's calendar timezone settings

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
            print("Please try asking to find a doctor first, then schedule an appointment.")
            return

        try:
            # Extract tool arguments based on the tool type
            if tool_name == "medical_query":
                tool_args = {"query": response.get("query")}
            elif tool_name == "medical_insert":
                # Verify we have all required data
                data = response.get("data")
                table_name = response.get("table_name")
                
                if not data or not isinstance(data, dict):
                    raise ValueError("Invalid appointment data format")
                
                if not table_name:
                    raise ValueError("Missing table information")
                
                required_fields = ["patient_id", "physician_id", "appointment_date", "reason", "status"]
                missing_fields = [f for f in required_fields if f not in data]
                
                if missing_fields:
                    raise ValueError(f"Missing required appointment information: {', '.join(missing_fields)}")
                
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
            if tool_name == "medical_query":
                current_context["current_action"] = "finding_doctor"
            elif tool_name == "medical_insert":
                current_context["current_action"] = "scheduling"
                current_context["appointment_date"] = data.get("appointment_date")
            elif tool_name == "create_event":
                current_context["current_action"] = "calendar_added"
            
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
                            # Try to parse as list of dicts for doctor info
                            data = eval(text)
                            if isinstance(data, list):
                                for item in data:
                                    if isinstance(item, dict):
                                        print(f"- Dr. {item.get('name')}, {item.get('specialty')}")
                                        print(f"  Phone: {item.get('phone')}")
                            else:
                                # For appointment confirmations, clean up the output
                                if "Successfully scheduled appointment" in text:
                                    appt_data = json.loads(text.split(": ", 1)[1])
                                    print(f"Appointment Details:")
                                    print(f"  Date: {appt_data['appointment_date']}")
                                    print(f"  Reason: {appt_data['reason']}")
                                    print(f"  Status: {appt_data['status']}")
                                else:
                                    print(text)
                        except:
                            # If not parseable, just print the text
                            print(text)
                # For calendar events, show the link
                elif "htmlLink" in results:
                    print(f"\nView your appointment at: {results['htmlLink']}")
            
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
    
    print("\nMedical Assistant")
    print("I can help you find doctors and schedule appointments.")
    print("Example: 'I need to see a cardiologist' or 'Schedule appointment with Dr. Smith'")
    
    while True:
        user_input = input("\nHow may I assist you? (type 'exit' to quit)\n> ")
        if user_input.strip().lower() == "exit":
            print("\nThank you for using our service. Goodbye.")
            break
        run_agent(user_input)
