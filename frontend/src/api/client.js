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
//TODO add fetchDriveSearch(query) and fetchDriveRead(fileId)

///////////
// SQL Tools
///////////

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








