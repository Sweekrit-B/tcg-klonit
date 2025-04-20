// === Imports ===
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js"; // MCP server core imports
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"; // For stdin/stdout communication
import { z } from "zod"; // Schema validation
import pg from "pg"; // PostgreSQL client
import { google } from "googleapis"; // Google API clients
import { authenticate } from "@google-cloud/local-auth"; // For local OAuth flow
import fs from "fs/promises"; // Async file system access
import path from "path"; // File path handling
import dotenv from "dotenv";

// === MCP Server Setup ===
const server = new McpServer({ name: "Demo", version: "1.0.0" }); // Create MCP server instance

// === PostgreSQL Setup ===
const { Pool } = pg;
let pool = null; // Will hold the PostgreSQL connection pool

// Load environment variables from .env file if it exists
dotenv.config();

// Function to initialize DB connection and setup default data
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

  const connectionConfig = { ...defaultConfig, ...config }; // Merge config with defaults
  pool = new Pool(connectionConfig); // Create pool instance

  const client = await pool.connect(); // Connect to DB
  console.log("✅ Connected to PostgreSQL");

  // Create example tables and insert dummy data if needed
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

  client.release(); // Release connection back to pool
}

// === Google Auth Setup (Drive + Calendar) ===
const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/calendar"
];
const BACKEND_DIR = process.cwd(); // Current working directory
const TOKEN_PATH = path.join(BACKEND_DIR, "token.json"); // Path to saved user token
const CREDENTIALS_PATH = path.join(BACKEND_DIR, "credentials.json"); // Path to client secrets

let cachedClient = null; // Cache so we don’t re-authenticate every time

// Auth function shared by Google Drive and Calendar tools
async function authorize() {
  if (cachedClient) return cachedClient; // Use cached client if available

  try {
    const token = await fs.readFile(TOKEN_PATH); // Try loading saved token
    cachedClient = await google.auth.fromJSON(JSON.parse(token));
  } catch {
    // If no token exists, go through OAuth flow and save it
    cachedClient = await authenticate({ scopes: SCOPES, keyfilePath: CREDENTIALS_PATH });
    if (cachedClient.credentials) {
      await fs.writeFile(TOKEN_PATH, JSON.stringify(cachedClient.credentials));
    }
  }

  return cachedClient;
}

// Create an authenticated Google Drive client
async function getDriveClient() {
  const auth = await authorize();
  return google.drive({ version: "v3", auth });
}

// Create an authenticated Google Calendar client
async function getCalendarClient() {
  const auth = await authorize();
  return google.calendar({ version: "v3", auth });
}

// === Common Tools ===
// Greeting resource that returns a hello message with the provided name
server.resource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  async (uri, { name }) => ({
    contents: [{ uri: uri.href, text: `Hello, ${name}!` }],
  })
);

// === Google Drive Tools ===
// (list, search, read) to be implemented

// === Google Calendar Tools ===
// (listCalendars, listEvents, getEvent, createEvent, updateEvent, deleteEvent, searchEvents) to be implemented

// === SQL Tools ===
// (sqlQuery, listTables, tableSchema) to be implemented

// === Transport + Init ===
const transport = new StdioServerTransport(); // Create transport for communication with MCP client

(async () => {
  try {
    console.log("⏳ Initializing PostgreSQL...");
    await initializeDb(); // Setup and seed DB
    console.log("✅ PostgreSQL ready.");

    console.log("🚀 Connecting MCP server to transport...");
    await server.connect(transport); // Bind MCP server to transport
    console.log("✅ MCP server connected.");
  } catch (error) {
    console.error("❌ Initialization failed:", error); // Log errors if any occur
    process.exit(1); // Exit with failure code
  }
})();
