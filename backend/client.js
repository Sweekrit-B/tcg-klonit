// Imports for MCP client communication, Express server, and environment configuration
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

// Initializes the MCP client transport to communicate with the MCP server via stdio
const transport = new StdioClientTransport({
  command: "node",
  args: ["server.js"],
});

// Create the MCP client and connect it to the transport
const client = new Client({
  name: "Demo Client",
  version: "1.0.0",
});
await client.connect(transport);

// Base route for health checking
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// Optional utility to list all available MCP tools
app.get("/tool/list_all", (req, res) => {
  const tools = client.listTools();
  res.json({ tools });
});

////////////////////
// Drive Tools
////////////////////

// Lists Drive files/folders in a folder, defaults to "root"
app.post("/tool/drive_list", async (req, res) => {
  const { folderId = "root", maxResults = 99 } = req.body;

  try {
    const response = await client.callTool({
      name: "list",
      arguments: { folderId, maxResults },
    });

    // Parse each line of response into structured objects
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
    console.error("Error in /tool/drive_list:", error);
    res.status(500).json({ error: "Failed to fetch Drive items" });
  }
});

// Searches for Drive items matching the name query
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

// Retrieves the readable text contents of a Drive file
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
// SQL Tools
////////////////////

// Executes a general SELECT SQL query using the MCP tool
app.post("/tool/sql_query", async (req, res) => {
  const { query, params = [] } = req.body;

  try {
    const response = await client.callTool({
      name: "sqlQuery",
      arguments: { query, params },
    });

    const textBlock = response.content.find(c => c.type === "text")?.text || "[]";
    const rows = JSON.parse(textBlock);
    res.status(200).json({ rows });
  } catch (error) {
    console.error("Error calling sqlQuery tool:", error);
    res.status(500).json({ error: "Failed to execute SQL query" });
  }
});

// Lists all user-accessible SQL tables in the public schema
app.post("/tool/sql_list_tables", async (req, res) => {
  try {
    const response = await client.callTool({
      name: "listTables",
      arguments: {},
    });

    const text = response.content.find((c) => c.type === "text")?.text || "";
    const tableNames = text.split("\n").map((line) => line.trim()).filter(Boolean);

    res.status(200).json({ tables: tableNames });
  } catch (error) {
    console.error("Error in /tool/sql_list_tables:", error);
    res.status(500).json({ error: "Failed to list tables" });
  }
});

// Retrieves schema information (columns, types, constraints) for a specific table
app.post("/tool/sql_table_schema", async (req, res) => {
  const { tableName } = req.body;

  try {
    const response = await client.callTool({
      name: "tableSchema",
      arguments: { tableName },
    });

    const text = response.content.find(c => c.type === "text")?.text || "[]";
    const schema = JSON.parse(text);
    res.status(200).json({ schema });
  } catch (error) {
    console.error("Error calling tableSchema:", error);
    res.status(500).json({ error: "Failed to fetch table schema" });
  }
});

////////////////////
// Calendar Tools
////////////////////

// Lists all Google Calendars accessible to the user
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

// Lists upcoming events from a selected Google Calendar
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

// Retrieves detailed information for a single calendar event (location, attendees, etc.)
app.post("/tool/calendar_get_event", async (req, res) => {
  const { calendarId, eventId } = req.body;

  try {
    const response = await client.callTool({
      name: "getEvent",
      arguments: { calendarId, eventId },
    });

    const text = response.content.find(item => item.type === "text")?.text || "";
    res.status(200).json({ details: text });
  } catch (error) {
    console.error("Error in /tool/calendar_get_event:", error);
    res.status(500).json({ error: "Failed to fetch event details" });
  }
});

// Start the Express server on localhost:5100
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
export default app;
