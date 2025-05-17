# agent.py
import os
from dotenv import load_dotenv
from mcp_sdk.agent import GeminiToolAgent
from tools.sql_tool import sql_query
from tools.calendar_tool import list_events
from tools.drive_tool import list_drive_files

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

def build_agent():
    return GeminiToolAgent(
        tools=[sql_query, list_events, list_drive_files],
        description="Healthcare support agent for calendar, files, and patient data",
        api_key=api_key  # This line is important
    )
