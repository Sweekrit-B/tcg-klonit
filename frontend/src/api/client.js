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

// export async function fetchDriveFolders() {
//   try {
//     const response = await axios.post("http://localhost:5100/tool/list_drive_folders");
//     return { success: true, data: response.data.items };
//   } catch (error) {
//     console.error("Error fetching drive folders:", error);
//     return { success: false, data: [] };
//   }
// }




