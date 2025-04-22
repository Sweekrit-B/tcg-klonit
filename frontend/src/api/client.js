import axios from "axios";

///////////
// General Tools - Basic arithmetic utility to test server connection
///////////
export async function addNumbers(a, b) {
  try {
    const response = await axios.post("http://localhost:5100/tool/add", { a, b });
    const value = response.data.content[0].text;
    return { success: true, data: value };
  } catch (error) {
    console.error("Error adding numbers: ", error);
    return { success: false };
  }
}

///////////
// Google Drive Tools - Drive integration to list, search, and read files
///////////
export async function fetchDriveItems(type = "all") {
  // Lists files/folders from a specific Drive folder and filters by type
  try {
    const response = await axios.post("http://localhost:5100/tool/drive_list", {
      folderId: "root",
      maxResults: 99,
    });

    const allItems = response.data.items;
    const filtered = type === "all" ? allItems : allItems.filter(item => item.type === type);
    return { success: true, data: filtered };
  } catch (error) {
    console.error("Error fetching drive items:", error);
    return { success: false, data: [] };
  }
}

export async function fetchDriveSearch(query) {
  // Searches Drive for items matching a name query
  try {
    const response = await axios.post("http://localhost:5100/tool/drive_search", { query });
    return { success: true, data: response.data.items };
  } catch (error) {
    console.error("Error searching drive items:", error);
    return { success: false, data: [] };
  }
}

export async function fetchDriveRead(fileId) {
  // Retrieves readable text content from a Drive file
  try {
    const response = await axios.post("http://localhost:5100/tool/drive_read", { fileId });
    return { success: true, data: response.data.text };
  } catch (error) {
    console.error("Error reading drive file:", error);
    return { success: false, data: "" };
  }
}

///////////
// Google Calendar Tools - Fetches calendars, event lists, and expanded event info
///////////
export async function fetchCalendars() {
  // Lists all calendars in the user's Google account
  try {
    const response = await axios.post("http://localhost:5100/tool/calendar_list");
    return { success: true, data: response.data.calendars };
  } catch (error) {
    console.error("Error fetching calendar list:", error);
    return { success: false, data: [] };
  }
}

export async function fetchCalendarEvents(calendarId = "primary") {
  // Gets a list of upcoming events from the selected calendar
  try {
    const response = await axios.post("http://localhost:5100/tool/calendar_list_events", {
      calendarId,
      maxResults: 10,
    });
    return { success: true, data: response.data.events };
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return { success: false, data: [] };
  }
}

export async function fetchCalendarEventDetails(calendarId, eventId) {
  // Fetches expanded event details (location, description, attendees)
  try {
    const response = await axios.post("http://localhost:5100/tool/calendar_get_event", {
      calendarId,
      eventId,
    });

    return {
      success: true,
      data: response.data.details,
    };
  } catch (error) {
    console.error("Error fetching calendar event details:", error);
    return { success: false, data: "" };
  }
}

///////////
// SQL Tools - Query PostgreSQL, get table list, view schema
///////////
export async function runSQLQuery(query, params = []) {
  // Executes a general-purpose SELECT query with optional parameters
  try {
    const response = await axios.post("http://localhost:5100/tool/sql_query", {
      query,
      params,
    });
    return { success: true, data: response.data.rows };
  } catch (error) {
    console.error("Error executing SQL query:", error);
    return { success: false, data: [] };
  }
}

export async function fetchSQLRows() {
  // Shortcut query for SELECT * FROM users
  try {
    const response = await axios.post("http://localhost:5100/tool/sql_query", {
      query: "SELECT * FROM users",
      params: [],
    });
    return { success: true, data: response.data.rows };
  } catch (error) {
    console.error("Error fetching SQL rows:", error);
    return { success: false, data: [] };
  }
}

export async function fetchSQLTableList() {
  // Calls the listTables tool to get all public DB tables
  try {
    const response = await axios.post("http://localhost:5100/tool/sql_list_tables");
    return { success: true, data: response.data.tables };
  } catch (error) {
    console.error("Error fetching SQL tables:", error);
    return { success: false, data: [] };
  }
}

export async function fetchSQLTableSchema(tableName) {
  // Fetches column names, types, and constraints for a table
  try {
    const response = await axios.post("http://localhost:5100/tool/sql_table_schema", {
      tableName,
    });
    return { success: true, data: response.data.schema };
  } catch (error) {
    console.error("Error fetching SQL table schema:", error);
    return { success: false, data: [] };
  }
}
