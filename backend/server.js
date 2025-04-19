import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import pg from "pg";
import { google } from "googleapis";
import { authenticate } from "@google-cloud/local-auth";
import fs from "fs/promises";
import path from "path";

// === MCP Server Setup ===
const server = new McpServer({
  name: "Demo",
  version: "1.0.0",
});

// === PostgreSQL Setup ===
const { Pool } = pg;
let pool = null;

async function initializeDb(config = {}) {
  const defaultConfig = {
    host: process.env.PGHOST || "localhost",
    port: process.env.PGPORT || 5432,
    user: process.env.PGUSER || "mcp_user",
    password: process.env.PGPASSWORD || "mcp_password",
    database: process.env.PGDATABASE || "mcp_demo",
    max: 20,
    idleTimeoutMillis: 30000,
  };

  const connectionConfig = { ...defaultConfig, ...config };
  pool = new Pool(connectionConfig);

  const client = await pool.connect();
  console.log("✅ Connected to PostgreSQL");

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL
    );

    INSERT INTO users (name, email) SELECT 'Alice', 'alice@example.com'
    WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1);

    INSERT INTO users (name, email) SELECT 'Bob', 'bob@example.com'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='bob@example.com');

    INSERT INTO users (name, email) SELECT 'Charlie', 'charlie@example.com'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='charlie@example.com');

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      price DECIMAL(10, 2) NOT NULL
    );

    INSERT INTO products (name, price) SELECT 'Laptop', 1299.99
    WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);

    INSERT INTO products (name, price) SELECT 'Smartphone', 699.99
    WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Smartphone');

    INSERT INTO products (name, price) SELECT 'Headphones', 149.99
    WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Headphones');
  `);

  client.release();
}

// === Google Drive Setup ===
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const BACKEND_DIR = process.cwd();
const TOKEN_PATH = path.join(BACKEND_DIR, "token.json");
const CREDENTIALS_PATH = path.join(BACKEND_DIR, "credentials.json");

let cachedClient = null;

async function authorize() {
  if (cachedClient) return cachedClient;

  try {
    const token = await fs.readFile(TOKEN_PATH);
    cachedClient = await google.auth.fromJSON(JSON.parse(token));
  } catch {
    cachedClient = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });
    if (cachedClient.credentials) {
      await fs.writeFile(TOKEN_PATH, JSON.stringify(cachedClient.credentials));
    }
  }

  return cachedClient;
}

async function getDriveClient() {
  const auth = await authorize();
  return google.drive({ version: "v3", auth });
}

// === Common Tools ===
server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: "text", text: String(a + b) }],
}));

server.resource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  async (uri, { name }) => ({
    contents: [{ uri: uri.href, text: `Hello, ${name}!` }],
  })
);

// === Google Drive Tools ===
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

      const items = (res.data.files || []).map((file) => ({
        type: "text",
        text: `${file.name} (${file.mimeType}) [ID: ${file.id}]`,
      }));

      return { content: items.length ? items : [{ type: "text", text: "No items found." }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error listing items: ${error.message}` }] };
    }
  }
);

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
        q: `name contains '${query}' and trashed=false`,
        fields: "files(id, name, mimeType, parents)",
        pageSize: maxResults,
      });

      const items = (res.data.files || []).map((file) => ({
        type: "text",
        text: `${file.name} (${file.mimeType}) [ID: ${file.id}]`,
      }));

      return { content: items.length ? items : [{ type: "text", text: "No items found." }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error searching items: ${error.message}` }] };
    }
  }
);

server.tool(
  "read",
  { fileId: z.string() },
  async ({ fileId }) => {
    try {
      const drive = await getDriveClient();
      const metaRes = await drive.files.get({ fileId, fields: "id, name, mimeType" });
      const mimeType = metaRes.data.mimeType;

      if (!mimeType) return { content: [{ type: "text", text: "File MIME type not found." }] };
      if (!mimeType.includes("text") && !mimeType.includes("document") && !mimeType.includes("plain"))
        return { content: [{ type: "text", text: "File is not a readable text file." }] };

      let stream;
      if (mimeType.includes("document")) {
        stream = (await drive.files.export({ fileId, mimeType: "text/plain" }, { responseType: "stream" })).data;
      } else {
        stream = (await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" })).data;
      }

      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const content = Buffer.concat(chunks).toString("utf-8");

      return {
        content: content
          ? [{ type: "text", text: content }]
          : [{ type: "text", text: "No text content found." }],
      };
    } catch (error) {
      return { content: [{ type: "text", text: `Error retrieving file: ${error.message}` }] };
    }
  }
);

// === SQL Tools ===
server.tool(
  "sqlQuery",
  {
    query: z.string().min(1).describe("SQL SELECT query"),
    params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  },
  async ({ query, params = [] }) => {
    try {
      if (!pool) await initializeDb();
      const firstWord = query.trim().split(/\s+/)[0].toLowerCase();
      if (!["select", "with"].includes(firstWord)) throw new Error("Only SELECT queries allowed");

      const result = await pool.query(query, params);
      return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error executing SQL query: ${error.message}` }],
      };
    }
  }
);

server.tool("listTables", {}, async () => {
  try {
    if (!pool) await initializeDb();
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);

    const names = result.rows.map((r) => r.table_name);
    return {
      content: [{ type: "text", text: names.length ? names.join("\n") : "No tables found." }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error listing tables: ${error.message}` }],
    };
  }
});

server.tool(
  "tableSchema",
  { tableName: z.string().min(1) },
  async ({ tableName }) => {
    try {
      if (!pool) await initializeDb();
      const result = await pool.query(`
        SELECT column_name, data_type, character_maximum_length,
               column_default, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      if (result.rows.length === 0) {
        return {
          content: [{ type: "text", text: `Table '${tableName}' not found.` }],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error retrieving schema: ${error.message}` }],
      };
    }
  }
);

// === Transport + Init ===
const transport = new StdioServerTransport();

(async () => {
  try {
    console.log("⏳ Initializing PostgreSQL...");
    await initializeDb();
    console.log("✅ PostgreSQL ready.");

    console.log("🚀 Connecting MCP server to transport...");
    await server.connect(transport);
    console.log("✅ MCP server connected.");
  } catch (error) {
    console.error("❌ Initialization failed:", error);
    process.exit(1);
  }
})();
