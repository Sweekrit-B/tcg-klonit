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

//Start express on the defined port
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
export default app;
