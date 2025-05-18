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

# Add Drive/SQL later as needed

tool_registry = {
    "listEvents": list_events,
    "getEvent": get_event,
    "createEvent": create_event,
    "updateEvent": update_event,
    "deleteEvent": delete_event,
    "searchEvents": search_events,
}
