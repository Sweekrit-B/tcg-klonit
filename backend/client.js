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
app.post("/tool/drive_list", async (req, res) => {
  const { folderId = "root", maxResults = 99 } = req.body;

  try {
    const response = await client.callTool({
      name: "list",
      arguments: { folderId, maxResults },
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
    console.error("Error fetching drive items:", error);
    res.status(500).json({ error: "Failed to fetch drive items" });
  }
});

app.post("/tool/calendar_events", async (req, res) => {
  const { calendarId = "primary", maxResults = 10 } = req.body;

  try {
    const response = await client.callTool({
      name: "listEvents",
      arguments: {
        calendarId,
        maxResults,
      },
    });

    const events = response.content.map((item) => {
      const match = item.text.match(/^(.*?) \((.*?) - (.*?)\) \[ID: (.*?)\]$/);
      if (!match) return null;
    
      const [, title, start, end, id] = match;
      return {
        id,
        title,
        start,
        end,
      };
    }).filter(Boolean); // remove nulls if any don't match
    
    res.status(200).json({ events });
    
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});


//Start express on the defined port
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
export default app;
