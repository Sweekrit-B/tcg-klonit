import axios from "axios";

export async function addNumbers(a, b) {
  try {
    const response = await axios.post("http://localhost:5100/tool/add", {
      a,
      b,
    });
    console.log("Response from server: ", response);
    const value = response.data.content[0].text;
    return { success: true, data: value };
  } catch (error) {
    console.error("Error adding numbers: ", error);
    return { success: false };
  }
}

export async function fetchDriveItems(type = "all") {
  try {
    const response = await axios.post("http://localhost:5100/tool/list_drive", { type });
    return { success: true, data: response.data.items };
  } catch (error) {
    console.error("Error fetching drive items:", error);
    return { success: false, data: [] };
  }
}

export async function fetchCalendarEvents() {
  try {
    const response = await axios.post("http://localhost:5100/tool/calendar_events", {
      calendarId: "60d060abc272435ca823a4c35ee3d37fba57e24e27ff8cdc5f1d2cb48185c797@group.calendar.google.com",
      maxResults: 10,
    });
    return { success: true, data: response.data.events };
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return { success: false, data: [] };
  }
}
