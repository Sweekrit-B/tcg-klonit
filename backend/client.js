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

//mock drive folders until tool implemented (TODO)
app.post("/tool/list_drive", async (req, res) => {
  const { type } = req.body;

  console.log("Received list_drive request with type:", type);

  const allItems = [
    { id: "1", name: "Project Docs", createdAt: "2024-03-01", type: "folder" },
    { id: "2", name: "Specs Sheet", createdAt: "2024-04-02", type: "file", mimeType: "application/vnd.google-docs" },
    { id: "3", name: "Q2 Report.pdf", createdAt: "2024-04-03", type: "file", mimeType: "application/pdf" },
    { id: "4", name: "Slides", createdAt: "2024-04-04", type: "file", mimeType: "application/vnd.google-slides" },
    { id: "5", name: "Photos", createdAt: "2024-04-05", type: "folder" },
  ];

  const filtered =
    type === "all" ? allItems : allItems.filter((item) => item.type === type);

  res.status(200).json({ items: filtered });
});


//Start express on the defined port
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
export default app;
