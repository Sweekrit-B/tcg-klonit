import axios from "axios";

///////////
// General Tools
///////////

export async function addNumbers(a, b) {
  try {
    const response = await axios.post("http://localhost:5100/tool/add", {
      a,
      b,
    });
    const value = response.data.content[0].text;
    return { success: true, data: value };
  } catch (error) {
    console.error("Error adding numbers: ", error);
    return { success: false };
  }
}

///////////
// Google Drive Tools
///////////

export async function fetchDriveItems(type = "all") {
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
  try {
    const response = await axios.post("http://localhost:5100/tool/drive_search", { query });
    return { success: true, data: response.data.items };
  } catch (error) {
    console.error("Error searching drive items:", error);
    return { success: false, data: [] };
  }
}

export async function fetchDriveRead(fileId) {
  try {
    const response = await axios.post("http://localhost:5100/tool/drive_read", { fileId });
    return { success: true, data: response.data.text };
  } catch (error) {
    console.error("Error reading drive file:", error);
    return { success: false, data: "" };
  }
}

///////////
// Google Calendar Tools
///////////

export async function fetchCalendars() {
  try {
    const response = await axios.post("http://localhost:5100/tool/calendar_list");
    return { success: true, data: response.data.calendars };
  } catch (error) {
    console.error("Error fetching calendar list:", error);
    return { success: false, data: [] };
  }
}

export async function fetchCalendarEvents(calendarId = "primary") {
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
// SQL Tools
///////////

export async function runSQLQuery(query, params = []) {
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
  try {
    const response = await axios.post("http://localhost:5100/tool/sql_list_tables");
    return { success: true, data: response.data.tables };
  } catch (error) {
    console.error("Error fetching SQL tables:", error);
    return { success: false, data: [] };
  }
}

export async function fetchSQLTableSchema(tableName) {
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
