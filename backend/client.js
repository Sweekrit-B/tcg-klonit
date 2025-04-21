import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import * as dotenv from "dotenv";

const app = express();
const PORT = 5100;
app.use(bodyParser.json());
app.use(cors());
dotenv.config();

// Define transport
const transport = new StdioClientTransport({
  command: "node",
  args: ["server.js"],
});

// Define the MCP client
const client = new Client({
  name: "Demo Client",
  version: "1.0.0",
});

// Connect the transport to the client
await client.connect(transport);

app.get("/", (req, res) => {
  res.send("Server is running!");
});

//TEMPORARY CODE FOR TESTING TODO; REMOVE AFTER TESTING
app.get("/tool/list_all", (req, res) => {
  const tools = client.listTools();
  res.json({ tools });
});


////////////////////
//Drive Tools
////////////////////
//real implementation tools for drive
// Route to list Google Drive items from a specific folder (default: root)
app.post("/tool/drive_list", async (req, res) => {
  const { folderId = "root", maxResults = 99 } = req.body;

  try {
    // Call the MCP 'list' tool to fetch Google Drive contents
    const response = await client.callTool({
      name: "list",
      arguments: { folderId, maxResults },
    });

    // Format each line of the returned MCP response into a structured object
    const items = response.content.map((item) => {
      // Example item.text: "Specs Sheet (application/vnd.google-docs) [ID: abc123]"
      const match = item.text.match(/^(.+?) \((.+?)\) \[ID: (.+?)\]$/);
      if (!match) return null;

      return {
        id: match[3],         // Google Drive file/folder ID
        name: match[1],       // File or folder name
        mimeType: match[2],   // MIME type from Google
        type: match[2].includes("folder") ? "folder" : "file", // For frontend filtering
      };
    }).filter(Boolean); // Filter out any null matches

    res.status(200).json({ items });
  } catch (error) {
    console.error("Error in /tool/drive_list:", error);
    res.status(500).json({ error: "Failed to fetch Drive items" });
  }
});


// Route to search for Drive items
app.post("/tool/drive_search", async (req, res) => {
  const { query, maxResults = 99 } = req.body;

  try {
    const response = await client.callTool({
      name: "search",
      arguments: { query, maxResults },
    });

    const items = response.content.map((item) => {
      const match = item.text.match(/^(.+?) \((.+?)\) \[ID: (.+?)\]$/);
      if (!match) return null;
      return {
        id: match[3],
        name: match[1],
        mimeType: match[2],
        type: match[2].includes("folder") ? "folder" : "file",
      };
    }).filter(Boolean);

    res.status(200).json({ items });
  } catch (error) {
    console.error("Error in /tool/drive_search:", error);
    res.status(500).json({ error: "Failed to search Drive items" });
  }
});

// Route to read a file's content
app.post("/tool/drive_read", async (req, res) => {
  const { fileId } = req.body;

  try {
    const response = await client.callTool({
      name: "read",
      arguments: { fileId },
    });

    const text = response.content.find(item => item.type === "text")?.text || "";
    res.status(200).json({ text });
  } catch (error) {
    console.error("Error in /tool/drive_read:", error);
    res.status(500).json({ error: "Failed to read Drive file" });
  }
});


////////////////////
//SQL Tools
////////////////////

app.post("/tool/sql_query", async (req, res) => {
  const { query, params = [] } = req.body;

  try {
    const response = await client.callTool({
      name: "sqlQuery",
      arguments: { query, params },
    });

    const textBlock = response.content.find(c => c.type === "text")?.text || "[]";
    const rows = JSON.parse(textBlock); // Converts the stringified JSON result into real JS objects

    res.status(200).json({ rows });
  } catch (error) {
    console.error("Error calling sqlQuery tool:", error);
    res.status(500).json({ error: "Failed to execute SQL query" });
  }
});

//////////////
//Calendar Tools
//////////////

// List all calendars
app.post("/tool/calendar_list", async (req, res) => {
  try {
    const response = await client.callTool({ name: "listCalendars", arguments: {} });

    const calendars = response.content.map((item) => {
      const match = item.text.match(/^(.*?) \[ID: (.*?)\]$/);
      if (!match) return null;
      const [, name, id] = match;
      return { name, id };
    }).filter(Boolean);

    res.status(200).json({ calendars });
  } catch (error) {
    console.error("Error in /tool/calendar_list:", error);
    res.status(500).json({ error: "Failed to list calendars" });
  }
});

// List events from a calendar
app.post("/tool/calendar_list_events", async (req, res) => {
  const { calendarId = "primary", maxResults = 10 } = req.body;

  try {
    const response = await client.callTool({
      name: "listEvents",
      arguments: { calendarId, maxResults },
    });

    const events = response.content.map((item) => {
      const match = item.text.match(/^(.*?) \((.*?) - (.*?)\) \[ID: (.*?)\]$/);
      if (!match) return null;
      const [, summary, start, end, id] = match;
      return { title: summary, start, end, id };
    }).filter(Boolean);

    res.status(200).json({ events });
  } catch (error) {
    console.error("Error in /tool/calendar_list_events:", error);
    res.status(500).json({ error: "Failed to list events" });
  }
});


//Start express on the defined port
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
export default app;
