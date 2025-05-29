# tool_registry.py
# ----------------
# This file maps tool names (as strings) to their actual Python function implementations.
# It's used by the agent to dynamically look up and call the correct tool based on Gemini's output.
#
# Example: If Gemini selects the tool "listEvents", this file tells the agent to call `calendar_tool.list_events`.

from tools.calendar_tool import (
    list_events,
    get_event,
    create_event,
    update_event,
    delete_event,
    search_events
)
from tools.drive_tool import( list_files, search_files, read_file)

# Add Drive/SQL later as needed

tool_registry = {
    "list_events": list_events,
    "get_event": get_event,
    "create_event": create_event,
    "update_event": update_event,
    "delete_event": delete_event,
    "search_events": search_events,
    "list_files": list_files,
    "search_files": search_files,
    "read_file": read_file,
    "medical_query": medical_query,
    "list_medical_tables": list_medical_tables,
    "medical_table_schema": medical_table_schema,
    "medical_insert": medical_insert,
    "medical_update": medical_update,
    "medical_delete": medical_delete,
    "retail_query": retail_query,
    "list_retail_tables": list_retail_tables,
    "retail_table_schema": retail_table_schema,
    "retail_insert": retail_insert,
    "retail_update": retail_update,
    "retail_delete": retail_delete,
}

