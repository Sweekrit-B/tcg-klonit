import os
from dotenv import load_dotenv
from mcp_sdk.agent import GeminiToolAgent

# Load environment variables
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

# === Import all tools ===
from tools.sql_tool import sql_tools
from tools.calendar_tool import (
    list_events, get_event, create_event,
    update_event, delete_event, search_events,
    list_calendars
)
from tools.drive_tool import (
    list_files, search_files, read_file
)

# Combine all tools into one list
all_tools = (
    list(sql_tools.values()) +  # SQL tools (already in dict form)
    [
        list_events, get_event, create_event,
        update_event, delete_event, search_events,
        list_calendars,
        list_files, search_files, read_file
    ]
)

# === Build the Gemini agent ===
def build_agent():
    return GeminiToolAgent(
        tools=all_tools,
        description="Healthcare support agent for calendar, files, and patient data",
        api_key=api_key
    )
