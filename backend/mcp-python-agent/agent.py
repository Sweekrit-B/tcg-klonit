# agent.py
from mcp_sdk.agent import GeminiToolAgent

# Placeholder imports for tools — teammates will fill these in
from tools.sql_tool import sql_query  # This should exist later
from tools.calendar_tool import list_events  # Later
from tools.drive_tool import list_drive_files  # Later

def build_agent():
    return GeminiToolAgent(
        tools=[sql_query, list_events, list_drive_files],
        description="Healthcare support agent for calendar, files, and patient data"
    )
