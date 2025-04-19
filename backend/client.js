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

app.post("/tool/add", async (req, res) => {
  const { a, b } = req.body;
  try {
    const response = await client.callTool({
      name: "add",
      arguments: {
        a: a,
        b: b,
      },
    });
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: "Error calling tool" });
  }
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


//TODO add search routes and tool routes

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


//Start express on the defined port
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
export default app;
