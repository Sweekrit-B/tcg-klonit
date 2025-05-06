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
  "https://www.googleapis.com/auth/calendar",
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
// server.resource(
//   "greeting",
//   new ResourceTemplate("greeting://{name}", { list: undefined }),
//   async (uri, { name }) => ({
//     contents: [{ uri: uri.href, text: `Hello, ${name}!` }],
//   });
// );

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
server.tool("listCalendars", {}, async () => {
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
});

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
        `Summary: ${event.summary || "No title"}`,
        `When: ${start} to ${end}`,
        `Location: ${event.location || "No location specified"}`,
        `Description: ${event.description || "No description"}`,
      ].join("\n");

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
  async ({
    calendarId,
    summary,
    location,
    description,
    startDateTime,
    endDateTime,
    attendees,
  }) => {
    try {
      const calendar = await getCalendarClient();
      const event = {
        summary,
        location,
        description,
        start: { dateTime: startDateTime, timeZone: "UTC" },
        end: { dateTime: endDateTime, timeZone: "UTC" },
      };
      if (attendees?.length > 0) {
        event.attendees = attendees.map((email) => ({ email }));
      }

      const res = await calendar.events.insert({
        calendarId,
        resource: event,
        sendNotifications: true,
      });

      return {
        content: [
          { type: "text", text: `Event created: ${res.data.htmlLink}` },
        ],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error creating event: ${error.message}` },
        ],
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
  async ({
    calendarId,
    eventId,
    summary,
    location,
    description,
    startDateTime,
    endDateTime,
    attendees,
  }) => {
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
          timeZone: updatedEvent.start.timeZone || "UTC",
        };
      }
      if (endDateTime) {
        updatedEvent.end = {
          dateTime: endDateTime,
          timeZone: updatedEvent.end.timeZone || "UTC",
        };
      }
      if (attendees) {
        updatedEvent.attendees = attendees.map((email) => ({ email }));
      }

      const res = await calendar.events.update({
        calendarId,
        eventId,
        resource: updatedEvent,
        sendNotifications: true,
      });

      return {
        content: [
          { type: "text", text: `Event updated: ${res.data.htmlLink}` },
        ],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error updating event: ${error.message}` },
        ],
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
        content: [
          { type: "text", text: `Error deleting event: ${error.message}` },
        ],
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
        content: [
          { type: "text", text: `Error searching events: ${error.message}` },
        ],
      };
    }
  }
);

// === SQL Tools ===

server.tool(
  "sqlQuery",
  {
    query: z.string().min(1).describe("SQL SELECT query"),
    params: z
      .array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional(),
  },
  async ({ query, params = [] }) => {
    try {
      if (!pool) await initializeDb();
      const firstWord = query.trim().split(/\s+/)[0].toLowerCase();
      if (!["select", "with"].includes(firstWord))
        throw new Error("Only SELECT queries allowed");

      const result = await pool.query(query, params);
      return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error executing SQL query: ${error.message}` },
        ],
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
      content: [
        {
          type: "text",
          text: names.length ? names.join("\n") : "No tables found.",
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        { type: "text", text: `Error listing tables: ${error.message}` },
      ],
    };
  }
});

server.tool(
  "tableSchema",
  { tableName: z.string().min(1) },
  async ({ tableName }) => {
    try {
      if (!pool) await initializeDb();
      const result = await pool.query(
        `
        SELECT column_name, data_type, character_maximum_length,
               column_default, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `,
        [tableName]
      );

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
        content: [
          { type: "text", text: `Error retrieving schema: ${error.message}` },
        ],
      };
    }
  }
);

// === Transport + Init ===
// Removed duplicate declaration of transport

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
  }});

// Merge default config with provided config
const connectionConfig = { ...defaultConfig, ...config };

// Create a new pool
pool = new Pool(connectionConfig);

try {
  // Test connection
  const client = await pool.connect();
  console.error("Successfully connected to PostgreSQL database");

  // --- Remove old demo tables if they exist ---
  await client.query(`
    DROP TABLE IF EXISTS appointments;
    DROP TABLE IF EXISTS treatments;
    DROP TABLE IF EXISTS patients;
    DROP TABLE IF EXISTS physicians;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS products;
  `);

  // --- Create new schema tables if they don't exist ---
  await client.query(`
    CREATE TABLE IF NOT EXISTS physicians (
      physician_id SERIAL PRIMARY KEY,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      specialty VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS patients (
      patient_id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      phone_number VARCHAR(20),
      date_of_birth DATE,
      pin VARCHAR(8)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      appointment_id SERIAL PRIMARY KEY,
      patient_id INT REFERENCES patients(patient_id),
      physician_id INT REFERENCES physicians(physician_id),
      appointment_datetime TIMESTAMP,
      appointment_type VARCHAR(255),
      notes TEXT,
      google_calendar_event_id VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS treatments (
      treatment_id SERIAL PRIMARY KEY,
      patient_id INT REFERENCES patients(patient_id),
      problem VARCHAR(255),
      treatment TEXT,
      physician_id INT REFERENCES physicians(physician_id)
    );
  `);

  // --- Insert sample/mock data if tables are empty ---
  // Physicians
  await client.query(`
    INSERT INTO physicians (first_name, last_name, specialty)
    SELECT * FROM (VALUES
      ('Alice', 'Smith', 'Cardiology'),
      ('Bob', 'Jones', 'Dermatology'),
      ('Carol', 'Taylor', 'Pediatrics'),
      ('David', 'Brown', 'Neurology')
    ) AS v(first_name, last_name, specialty)
    WHERE NOT EXISTS (SELECT 1 FROM physicians);
  `);

  // Patients
  await client.query(`
    INSERT INTO patients (email, first_name, last_name, phone_number, date_of_birth, pin)
    SELECT * FROM (VALUES
      ('patient1@example.com', 'John', 'Doe', '555-0001', '1980-01-01'::DATE, '12345678'),
      ('patient2@example.com', 'Jane', 'Smith', '555-0002', '1985-02-02'::DATE, '23456789'),
      ('patient3@example.com', 'Jim', 'Brown', '555-0003', '1990-03-03'::DATE, '34567890'),
      ('patient4@example.com', 'Jill', 'White', '555-0004', '1975-04-04'::DATE, '45678901'),
      ('patient5@example.com', 'Jack', 'Black', '555-0005', '2000-05-05'::DATE, '56789012'),
      ('patient6@example.com', 'Jenny', 'Green', '555-0006', '1995-06-06'::DATE, '67890123'),
      ('patient7@example.com', 'Joe', 'Blue', '555-0007', '1988-07-07'::DATE, '78901234'),
      ('patient8@example.com', 'Jess', 'Red', '555-0008', '1992-08-08'::DATE, '89012345'),
      ('patient9@example.com', 'Jerry', 'Yellow', '555-0009', '1983-09-09'::DATE, '90123456'),
      ('patient10@example.com', 'Jordan', 'Purple', '555-0010', '1978-10-10'::DATE, '01234567')
    ) AS v(email, first_name, last_name, phone_number, date_of_birth, pin)
    WHERE NOT EXISTS (SELECT 1 FROM patients);
  `);

  // Appointments
  await client.query(`
    INSERT INTO appointments (patient_id, physician_id, appointment_datetime, appointment_type, notes, google_calendar_event_id)
    SELECT * FROM (VALUES
      (1, 1, '2024-05-01 09:00:00'::TIMESTAMP, 'Checkup', 'Routine checkup', 'evt1'),
      (2, 2, '2024-05-02 10:00:00'::TIMESTAMP, 'Consultation', 'Discuss symptoms', 'evt2'),
      (3, 3, '2024-05-03 11:00:00'::TIMESTAMP, 'Follow-up', 'Review test results', 'evt3'),
      (4, 4, '2024-05-04 12:00:00'::TIMESTAMP, 'Checkup', 'Annual physical', 'evt4'),
      (5, 1, '2024-05-05 13:00:00'::TIMESTAMP, 'Consultation', 'New issue', 'evt5'),
      (6, 2, '2024-05-06 14:00:00'::TIMESTAMP, 'Checkup', 'Routine checkup', 'evt6'),
      (7, 3, '2024-05-07 15:00:00'::TIMESTAMP, 'Consultation', 'Discuss medication', 'evt7'),
      (8, 4, '2024-05-08 16:00:00'::TIMESTAMP, 'Follow-up', 'Post-surgery', 'evt8'),
      (9, 1, '2024-05-09 17:00:00'::TIMESTAMP, 'Checkup', 'Routine checkup', 'evt9'),
      (10, 2, '2024-05-10 18:00:00'::TIMESTAMP, 'Consultation', 'Discuss results', 'evt10')
    ) AS v(patient_id, physician_id, appointment_datetime, appointment_type, notes, google_calendar_event_id)
    WHERE NOT EXISTS (SELECT 1 FROM appointments);
  `);

  // Treatments
  await client.query(`
    INSERT INTO treatments (patient_id, problem, treatment, physician_id)
    SELECT * FROM (VALUES
      (1, 'Hypertension', 'Medication A', 1),
      (2, 'Diabetes', 'Medication B', 2),
      (3, 'Asthma', 'Inhaler', 3),
      (4, 'Migraine', 'Painkillers', 4),
      (5, 'Allergy', 'Antihistamines', 1),
      (6, 'Flu', 'Rest and fluids', 2),
      (7, 'Back Pain', 'Physical therapy', 3),
      (8, 'Depression', 'Therapy', 4),
      (9, 'High Cholesterol', 'Diet change', 1),
      (10, 'Anxiety', 'Counseling', 2)
    ) AS v(patient_id, problem, treatment, physician_id)
    WHERE NOT EXISTS (SELECT 1 FROM treatments);
  `);

  client.release();
  return pool;
} catch (error) {
  console.error("Error connecting to the database:", error);
  throw error;
}

// Define the MCP server
// Removed duplicate declaration of server

// Define an example tool
server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: "text", text: String(a + b) }],
}));

/*
 * "Each MCP Server must expose MCP-compliant endpoints/methods to list or query
 * items relevant to the data source in real-time."
 *
 * SQL Database: Allow basic, parameterized SQL SELECT queries. List accessible
 * tables
 */

// NOTE: Main SQL Query Tool created 4/12
server.tool(
  "sqlQuery",
  {
    // Takes in our query and types it to a string
    query: z.string().min(1).describe("SQL SELECT query with placeholders"),

    // Takes in the list of parameters and checks all types and allows
    // strings, numbers, booleans, and nulls and creates an array of them
    params: z
      .array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional()
      .describe("Array of parameters to substitute in the query"),
  },
  async ({ query, params = [] }) => {
    try {
      if (!pool) {
        await initializeDb();
      }

      // Manually parsing the query and finding the actual query
      const normalizedQuery = query.trimStart().toLowerCase();
      const firstWord = normalizedQuery.split(/\s+/)[0];

      // Making sure we only use SELECT queries
      if (firstWord !== "select" && firstWord !== "with") {
        throw new Error("Only SELECT queries are allowed for security reasons");
      }

      const result = await pool.query(query, params);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.rows, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error executing SQL query: ${error.message}`,
          },
        ],
      };
    }
  }
);

// NOTE: Insert Data Tool - Basic implementation (5/4)
// TODO: Add support for batch operations (potentially based off client feedback)
// TODO: Add audit logging (potentially based off client feedback)
// Example usage:
// {
//   "tableName": "users",
//   "data": {
//     "name": "John Doe",
//     "email": "john@example.com"
//   }
// }
server.tool(
  "insertData",
  {
    tableName: z.string().min(1).describe("Name of the table to insert into"),
    data: z
      .record(z.any())
      .describe("Object containing column names and values to insert"),
  },
  async ({ tableName, data }) => {
    try {
      if (!pool) {
        await initializeDb();
      }

      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, index) => `$${index + 1}`);

      const query = `
        INSERT INTO ${tableName} (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
        RETURNING *
      `;

      const result = await pool.query(query, values);

      return {
        content: [
          {
            type: "text",
            text: `Successfully inserted data into ${tableName}:\n${JSON.stringify(
              result.rows[0],
              null,
              2
            )}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error inserting data: ${error.message}`,
          },
        ],
      };
    }
  }
);

// NOTE: Update Data Tool - Basic implementation (5/4)
// TODO: Add support for batch operations (potentially based off client feedback)
// TODO: Add audit logging (potentially based off client feedback)
// Example usage:
// {
//   "tableName": "users",
//   "data": {
//     "email": "newemail@example.com"
//   },
//   "where": {
//     "id": 1
//   }
// }
server.tool(
  "updateData",
  {
    tableName: z.string().min(1).describe("Name of the table to update"),
    data: z
      .record(z.any())
      .describe("Object containing column names and values to update"),
    where: z
      .record(z.any())
      .describe("Object containing conditions for the WHERE clause"),
  },
  async ({ tableName, data, where }) => {
    try {
      if (!pool) {
        await initializeDb();
      }

      const setClause = Object.keys(data)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(", ");

      const whereClause = Object.keys(where)
        .map(
          (key, index) => `${key} = $${Object.keys(data).length + index + 1}`
        )
        .join(" AND ");

      const values = [...Object.values(data), ...Object.values(where)];

      const query = `
        UPDATE ${tableName}
        SET ${setClause}
        WHERE ${whereClause}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      return {
        content: [
          {
            type: "text",
            text: `Successfully updated data in ${tableName}:\n${JSON.stringify(
              result.rows,
              null,
              2
            )}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error updating data: ${error.message}`,
          },
        ],
      };
    }
  }
);

// NOTE: Delete Data Tool - Basic implementation (5/4)
// TODO: Add support for batch operations (potentially based off client feedback)
// TODO: Add audit logging (potentially based off client feedback)
// Example usage:
// {
//   "tableName": "users",
//   "where": {
//     "id": 1
//   }
// }
server.tool(
  "deleteData",
  {
    tableName: z.string().min(1).describe("Name of the table to delete from"),
    where: z
      .record(z.any())
      .describe("Object containing conditions for the WHERE clause"),
  },
  async ({ tableName, where }) => {
    try {
      if (!pool) {
        await initializeDb();
      }

      const whereClause = Object.keys(where)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(" AND ");

      const values = Object.values(where);

      const query = `
        DELETE FROM ${tableName}
        WHERE ${whereClause}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      return {
        content: [
          {
            type: "text",
            text: `Successfully deleted data from ${tableName}:\n${JSON.stringify(
              result.rows,
              null,
              2
            )}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error deleting data: ${error.message}`,
          },
        ],
      };
    }
  }
);

// NOTE: List Tables Tool: uses query tool to simply show all tables in our database,
// this can be done using just the query tool but it is easier to just click the button.
// Can be removed easily

// Takes in no parameters, just prints the tables
server.tool("listTables", {}, async () => {
  try {
    // Checking if pool is crorrectly initialized
    if (!pool) {
      await initializeDb();
    }

    // PostgreSQL query to list tables in the current schema
    const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);

    const tableNames = result.rows.map((row) => row.table_name);

    return {
      content: [
        {
          type: "text",
          text:
            tableNames.length > 0
              ? `Available tables:\n${tableNames.join("\n")}`
              : "No tables found in the public schema.",
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error listing tables: ${error.message}`,
        },
      ],
    };
  }
});

// NOTE: Table Schema Tool: this isn't super necessary, but it is nice to
// be able to view data about the table, we can remove this easily

// Takes in a table name and returns the schema of that table
server.tool(
  "tableSchema",
  {
    tableName: z.string().min(1).describe("Name of the table to describe"),
  },
  async ({ tableName }) => {
    try {
      // Checking if pool is crorrectly initialized
      if (!pool) {
        await initializeDb();
      }

      // Get table schema from PostgreSQL information_schema
      const result = await pool.query(
        `
        SELECT 
          column_name, 
          data_type, 
          character_maximum_length,
          column_default,
          is_nullable
        FROM 
          information_schema.columns
        WHERE 
          table_schema = 'public' AND 
          table_name = $1
        ORDER BY 
          ordinal_position
      `,
        [tableName]
      );

      if (result.rows.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Table '${tableName}' not found in the public schema`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Schema for table '${tableName}':\n${JSON.stringify(
              result.rows,
              null,
              2
            )}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting schema: ${error.message}`,
          },
        ],
      };
    }
  }
);

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
// Retain this declaration of transport
const transport = new StdioServerTransport();

// Initialize the database and connect to transport
(async () => {
  try {
    console.error("Initializing PostgreSQL database connection...");
    await initializeDb();
    console.error("Database connection initialized.");

    // Connect the transport to the server
    console.error("Connecting server to transport...");
    await server.connect(transport);
    console.error("Server connected to transport.");
  } catch (error) {
    console.error("Error during initialization:", error);
    process.exit(1);
  }
})();
