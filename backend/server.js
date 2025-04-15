import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { google } from "googleapis";
import { authenticate } from "@google-cloud/local-auth";
import fs from "fs/promises";
import path from "path";

// Define the MCP server
const server = new McpServer({
  name: "Demo",
  version: "1.0.0",
});

// Google Drive API setup
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
// const BACKEND_DIR = "/Users/bcan/Desktop/tcg-klonit/backend";
const TOKEN_PATH = path.join("./token.json");
const CREDENTIALS_PATH = path.join("./credentials_drive.json");

// Cache for the authenticated client
let cachedClient = null;

// Authenticate with Google Drive
async function authorize() {
  if (cachedClient) {
    return cachedClient; // Return the cached client if it exists
  }

  let client;

  // Load saved token if it exists
  try {
    const token = await fs.readFile(TOKEN_PATH);
    client = await google.auth.fromJSON(JSON.parse(token));
  } catch (err) {
    // If no token, authenticate and save new token
    client = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
      await fs.writeFile(TOKEN_PATH, JSON.stringify(client.credentials));
    }
  }

  cachedClient = client; // Cache the client for future use
  return client;
}

// Initialize Google Drive API client
async function getDriveClient() {
  const auth = await authorize();
  return google.drive({ version: "v3", auth });
}

// Existing example tool
server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: "text", text: String(a + b) }],
}));

// Existing example resource
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

// Tool to list folders and files
server.tool(
  "list",
  {
    folderId: z.string().optional().default("root"),
    maxResults: z.number().optional().default(99),
  },
  async ({ folderId, maxResults }) => {
    try {
      const drive = await getDriveClient();
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: "files(id, name, mimeType, parents)",
        pageSize: maxResults,
      });

      const files = res.data.files || [];
      const items = files.map((file) => ({
        type: "text",
        text: `${file.name} (${file.mimeType}) [ID: ${file.id}]`,
      }));

      return {
        content: items.length
          ? items
          : [{ type: "text", text: "No items found." }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error listing items: ${error.message}` },
        ],
      };
    }
  }
);

// Tool to search files and folders
server.tool(
  "search",
  {
    query: z.string(),
    maxResults: z.number().optional().default(99),
  },
  async ({ query, maxResults }) => {
    try {
      const drive = await getDriveClient();
      const res = await drive.files.list({
        q: `name contains '${query}' and trashed=false`, // Ensure proper formatting
        fields: "files(id, name, mimeType, parents)",
        pageSize: maxResults,
      });

      const files = res.data.files || [];
      const items = files.map((file) => ({
        type: "text",
        text: `${file.name} (${file.mimeType}) [ID: ${file.id}]`,
      }));

      return {
        content: items.length
          ? items
          : [{ type: "text", text: "No items found." }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error searching items: ${error.message}` },
        ],
      };
    }
  }
);

// Tool to download and return text from a file
server.tool(
  "read",
  {
    fileId: z.string(),
  },
  async ({ fileId }) => {
    try {
      const drive = await getDriveClient();
      // Step 1: Get file metadata to check MIME type
      const metaRes = await drive.files.get({
        fileId,
        fields: "id, name, mimeType",
      });

      const mimeType = metaRes.data.mimeType;
      if (!mimeType) {
        return {
          content: [{ type: "text", text: "Error: File MIME type not found." }],
        };
      }

      // Step 2: Check if the file is text-readable
      const isTextReadable =
        mimeType.includes("text") ||
        mimeType.includes("document") ||
        mimeType.includes("plain");

      if (!isTextReadable) {
        return {
          content: [
            { type: "text", text: "File is not a readable text file." },
          ],
        };
      }

      // Step 3: Download file content
      let content = "";
      if (mimeType.includes("document")) {
        // Handle Google Docs by exporting as plain text
        const exportRes = await drive.files.export(
          {
            fileId,
            mimeType: "text/plain",
          },
          { responseType: "stream" }
        );

        const exportChunks = [];
        for await (const chunk of exportRes.data) {
          exportChunks.push(chunk);
        }
        content = Buffer.concat(exportChunks).toString("utf-8");
      } else {
        // Handle other text files
        const fileRes = await drive.files.get(
          { fileId, alt: "media" },
          { responseType: "stream" }
        );

        const chunks = [];
        for await (const chunk of fileRes.data) {
          chunks.push(chunk);
        }
        content = Buffer.concat(chunks).toString("utf-8");
      }

      return {
        content: content
          ? [{ type: "text", text: content }]
          : [{ type: "text", text: "No text content found." }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error retrieving file: ${error.message}`,
          },
        ],
      };
    }
  }
);

// Define the transport for the server
const transport = new StdioServerTransport();
// Connect the transport to the server
console.log("Connecting server to transport...");
await server.connect(transport);
console.log("Server connected to transport.");
