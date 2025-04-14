import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Define the MCP server
const server = new McpServer({
  name: "Demo",
  version: "1.0.0",
});

// Define an example tool
server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: "text", text: String(a + b) }],
}));

// Define an example resource
server.resource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  async (uri, { name }) => ({
    contents: [
      {
        uri: uri.href,
        text: `Hello, ${name}!`,
      },
    ],
  })
);

// Define the transport for the server
const transport = new StdioServerTransport();
// Connect the transport to the server
console.log("Connecting server to transport...");
await server.connect(transport);
console.log("Server connected to transport.");
