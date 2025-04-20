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
// === Google Drive Tools ===

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
        q: `name contains '${query}' and trashed=false`,
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

      let content = "";
      if (mimeType.includes("document")) {
        const exportRes = await drive.files.export(
          { fileId, mimeType: "text/plain" },
          { responseType: "stream" }
        );

        const exportChunks = [];
        for await (const chunk of exportRes.data) exportChunks.push(chunk);
        content = Buffer.concat(exportChunks).toString("utf-8");
      } else {
        const fileRes = await drive.files.get(
          { fileId, alt: "media" },
          { responseType: "stream" }
        );

        const chunks = [];
        for await (const chunk of fileRes.data) chunks.push(chunk);
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


// === Google Calendar Tools ===
// (listCalendars, listEvents, getEvent, createEvent, updateEvent, deleteEvent, searchEvents) to be implemented
// === Google Calendar Tools ===

// Tool to list all calendars
server.tool(
  "listCalendars",
  {},
  async () => {
    try {
      const calendar = await getCalendarClient();
      const res = await calendar.calendarList.list();

      const calendarItems = res.data.items || [];
      const items = calendarItems.map((cal) => ({
        type: "text",
        text: `${cal.summary} [ID: ${cal.id}]`,
      }));

      return {
        content: items.length
          ? items
          : [{ type: "text", text: "No calendars found." }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error listing calendars: ${error.message}` },
        ],
      };
    }
  }
);

// Tool to list events from a calendar
server.tool(
  "listEvents",
  {
    calendarId: z.string().optional().default("primary"),
    maxResults: z.number().optional().default(10),
    timeMin: z.string().optional(),
    timeMax: z.string().optional(),
  },
  async ({ calendarId, maxResults, timeMin, timeMax }) => {
    try {
      const calendar = await getCalendarClient();
      const params = {
        calendarId,
        maxResults,
        singleEvents: true,
        orderBy: "startTime",
      };
      if (timeMin) params.timeMin = timeMin;
      if (timeMax) params.timeMax = timeMax;

      const res = await calendar.events.list(params);

      const events = res.data.items || [];
      const items = events.map((event) => {
        const start = event.start.dateTime || event.start.date;
        const end = event.end.dateTime || event.end.date;
        return {
          type: "text",
          text: `${event.summary} (${start} - ${end}) [ID: ${event.id}]`,
        };
      });

      return {
        content: items.length
          ? items
          : [{ type: "text", text: "No events found." }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error listing events: ${error.message}` },
        ],
      };
    }
  }
);

// Tool to get a specific event
server.tool(
  "getEvent",
  {
    calendarId: z.string().optional().default("primary"),
    eventId: z.string(),
  },
  async ({ calendarId, eventId }) => {
    try {
      const calendar = await getCalendarClient();
      const res = await calendar.events.get({ calendarId, eventId });

      const event = res.data;
      const start = event.start.dateTime || event.start.date;
      const end = event.end.dateTime || event.end.date;

      const eventDetails = [
        `Summary: ${event.summary || 'No title'}`,
        `When: ${start} to ${end}`,
        `Location: ${event.location || 'No location specified'}`,
        `Description: ${event.description || 'No description'}`
      ].join('\n');

      return {
        content: [{ type: "text", text: eventDetails }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error getting event: ${error.message}` },
        ],
      };
    }
  }
);

// Tool to create a new event
server.tool(
  "createEvent",
  {
    calendarId: z.string().optional().default("primary"),
    summary: z.string(),
    location: z.string().optional(),
    description: z.string().optional(),
    startDateTime: z.string(),
    endDateTime: z.string(),
    attendees: z.array(z.string()).optional(),
  },
  async ({ calendarId, summary, location, description, startDateTime, endDateTime, attendees }) => {
    try {
      const calendar = await getCalendarClient();
      const event = {
        summary,
        location,
        description,
        start: { dateTime: startDateTime, timeZone: 'UTC' },
        end: { dateTime: endDateTime, timeZone: 'UTC' },
      };
      if (attendees?.length > 0) {
        event.attendees = attendees.map(email => ({ email }));
      }

      const res = await calendar.events.insert({
        calendarId,
        resource: event,
        sendNotifications: true,
      });

      return {
        content: [{ type: "text", text: `Event created: ${res.data.htmlLink}` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error creating event: ${error.message}` }],
      };
    }
  }
);

// Tool to update an existing event
server.tool(
  "updateEvent",
  {
    calendarId: z.string().optional().default("primary"),
    eventId: z.string(),
    summary: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    startDateTime: z.string().optional(),
    endDateTime: z.string().optional(),
    attendees: z.array(z.string()).optional(),
  },
  async ({ calendarId, eventId, summary, location, description, startDateTime, endDateTime, attendees }) => {
    try {
      const calendar = await getCalendarClient();
      const existingEvent = await calendar.events.get({ calendarId, eventId });
      const updatedEvent = { ...existingEvent.data };

      if (summary !== undefined) updatedEvent.summary = summary;
      if (location !== undefined) updatedEvent.location = location;
      if (description !== undefined) updatedEvent.description = description;
      if (startDateTime) {
        updatedEvent.start = {
          dateTime: startDateTime,
          timeZone: updatedEvent.start.timeZone || 'UTC',
        };
      }
      if (endDateTime) {
        updatedEvent.end = {
          dateTime: endDateTime,
          timeZone: updatedEvent.end.timeZone || 'UTC',
        };
      }
      if (attendees) {
        updatedEvent.attendees = attendees.map(email => ({ email }));
      }

      const res = await calendar.events.update({
        calendarId,
        eventId,
        resource: updatedEvent,
        sendNotifications: true,
      });

      return {
        content: [{ type: "text", text: `Event updated: ${res.data.htmlLink}` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error updating event: ${error.message}` }],
      };
    }
  }
);

// Tool to delete an event
server.tool(
  "deleteEvent",
  {
    calendarId: z.string().optional().default("primary"),
    eventId: z.string(),
  },
  async ({ calendarId, eventId }) => {
    try {
      const calendar = await getCalendarClient();
      await calendar.events.delete({ calendarId, eventId });

      return {
        content: [{ type: "text", text: `Event successfully deleted.` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error deleting event: ${error.message}` }],
      };
    }
  }
);

// Tool to search for events
server.tool(
  "searchEvents",
  {
    calendarId: z.string().optional().default("primary"),
    query: z.string(),
    maxResults: z.number().optional().default(10),
  },
  async ({ calendarId, query, maxResults }) => {
    try {
      const calendar = await getCalendarClient();
      const res = await calendar.events.list({
        calendarId,
        q: query,
        maxResults,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = res.data.items || [];
      const items = events.map((event) => {
        const start = event.start.dateTime || event.start.date;
        const end = event.end.dateTime || event.end.date;
        return {
          type: "text",
          text: `${event.summary} (${start} - ${end}) [ID: ${event.id}]`,
        };
      });

      return {
        content: items.length
          ? items
          : [{ type: "text", text: `No events found matching "${query}".` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error searching events: ${error.message}` }],
      };
    }
  }
);

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
