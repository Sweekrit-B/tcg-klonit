from tools.calendar_tool import (
    list_events,
    get_event,
    create_event,
    update_event,
    delete_event,
    search_events,
    list_calendars
)

from tools.drive_tool import (
    list_files,
    search_files,
    read_file
)

from tools.sql_tool import (
    medical_query,
    list_medical_tables,
    medical_table_schema,
    medical_insert,
    medical_update,
    medical_delete,
    retail_query,
    list_retail_tables,
    retail_table_schema,
    retail_insert,
    retail_update,
    retail_delete
)

tool_registry = {
    # Calendar
    "list_events": list_events,
    "get_event": get_event,
    "create_event": create_event,
    "update_event": update_event,
    "delete_event": delete_event,
    "search_events": search_events,
    "list_calendars": list_calendars,

    # Drive
    "list_files": list_files,
    "search_files": search_files,
    "read_file": read_file,

    # Medical SQL
    "medical_query": medical_query,
    "list_medical_tables": list_medical_tables,
    "medical_table_schema": medical_table_schema,
    "medical_insert": medical_insert,
    "medical_update": medical_update,
    "medical_delete": medical_delete,

    # Retail SQL
    "retail_query": retail_query,
    "list_retail_tables": list_retail_tables,
    "retail_table_schema": retail_table_schema,
    "retail_insert": retail_insert,
    "retail_update": retail_update,
    "retail_delete": retail_delete
}
