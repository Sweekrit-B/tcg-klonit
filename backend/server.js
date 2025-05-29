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
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// === MCP Server Setup ===
const server = new McpServer({ name: "Demo", version: "1.0.0" }); // Create MCP server instance

// === PostgreSQL Setup ===
const { Pool } = pg;
const pools = {
  medical: null,
  retail: null,
}; // Will hold the PostgreSQL connection pools

// Load environment variables from .env file if it exists
dotenv.config();

// === Google Auth Setup (Drive + Calendar) ===
const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/calendar",
];

// Get absolute paths for credentials
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CREDENTIALS_PATH = path.resolve(__dirname, "credentials.json");
const TOKEN_PATH = path.resolve(__dirname, "token.json");

let cachedClient = null; // Cache so we don't re-authenticate every time

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
// Medical Database Query Tool
server.tool(
  "medicalQuery",
  {
    query: z.string().min(1).describe("SQL SELECT query with placeholders"),
    params: z
      .array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional()
      .describe("Array of parameters to substitute in the query"),
  },
  async ({ query, params = [] }) => {
    try {
      if (!pools.medical) {
        await initializeMedicalDb();
      }

      const normalizedQuery = query.trimStart().toLowerCase();
      const firstWord = normalizedQuery.split(/\s+/)[0];

      if (firstWord !== "select" && firstWord !== "with") {
        throw new Error("Only SELECT queries are allowed for security reasons");
      }

      const result = await pools.medical.query(query, params);

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

// Retail Database Query Tool
server.tool(
  "retailQuery",
  {
    query: z.string().min(1).describe("SQL SELECT query with placeholders"),
    params: z
      .array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional()
      .describe("Array of parameters to substitute in the query"),
  },
  async ({ query, params = [] }) => {
    try {
      if (!pools.retail) {
        await initializeRetailDb();
      }

      const normalizedQuery = query.trimStart().toLowerCase();
      const firstWord = normalizedQuery.split(/\s+/)[0];

      if (firstWord !== "select" && firstWord !== "with") {
        throw new Error("Only SELECT queries are allowed for security reasons");
      }

      const result = await pools.retail.query(query, params);

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

// List Medical Tables Tool
server.tool("listMedicalTables", {}, async () => {
  try {
    if (!pools.medical) {
      await initializeMedicalDb();
    }

    const result = await pools.medical.query(`
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
              ? `Available medical tables:\n${tableNames.join("\n")}`
              : "No tables found in the medical database.",
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error listing medical tables: ${error.message}`,
        },
      ],
    };
  }
});

// List Retail Tables Tool
server.tool("listRetailTables", {}, async () => {
  try {
    if (!pools.retail) {
      await initializeRetailDb();
    }

    const result = await pools.retail.query(`
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
              ? `Available retail tables:\n${tableNames.join("\n")}`
              : "No tables found in the retail database.",
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error listing retail tables: ${error.message}`,
        },
      ],
    };
  }
});

// Medical Table Schema Tool
server.tool(
  "medicalTableSchema",
  {
    tableName: z
      .string()
      .min(1)
      .describe("Name of the medical table to describe"),
  },
  async ({ tableName }) => {
    try {
      if (!pools.medical) {
        await initializeMedicalDb();
      }

      const result = await pools.medical.query(
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
              text: `Table '${tableName}' not found in the medical database`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Schema for medical table '${tableName}':\n${JSON.stringify(
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
            text: `Error getting medical schema: ${error.message}`,
          },
        ],
      };
    }
  }
);

// Retail Table Schema Tool
server.tool(
  "retailTableSchema",
  {
    tableName: z
      .string()
      .min(1)
      .describe("Name of the retail table to describe"),
  },
  async ({ tableName }) => {
    try {
      if (!pools.retail) {
        await initializeRetailDb();
      }

      const result = await pools.retail.query(
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
              text: `Table '${tableName}' not found in the retail database`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Schema for retail table '${tableName}':\n${JSON.stringify(
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
            text: `Error getting retail schema: ${error.message}`,
          },
        ],
      };
    }
  }
);

// === SQL Write Operations - Medical Database ===
server.tool(
  "medicalInsert",
  {
    tableName: z
      .string()
      .min(1)
      .describe("Name of the medical table to insert into"),
    data: z
      .record(z.any())
      .describe("Object containing column names and values to insert"),
  },
  async ({ tableName, data }) => {
    try {
      if (!pools.medical) {
        await initializeMedicalDb();
      }

      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, index) => `$${index + 1}`);

      const query = `
        INSERT INTO ${tableName} (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
        RETURNING *
      `;

      const result = await pools.medical.query(query, values);

      return {
        content: [
          {
            type: "text",
            text: `Successfully inserted data into medical table ${tableName}:\n${JSON.stringify(
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
            text: `Error inserting data into medical database: ${error.message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "medicalUpdate",
  {
    tableName: z
      .string()
      .min(1)
      .describe("Name of the medical table to update"),
    data: z
      .record(z.any())
      .describe("Object containing column names and values to update"),
    where: z
      .record(z.any())
      .describe("Object containing conditions for the WHERE clause"),
  },
  async ({ tableName, data, where }) => {
    try {
      if (!pools.medical) {
        await initializeMedicalDb();
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

      const result = await pools.medical.query(query, values);

      return {
        content: [
          {
            type: "text",
            text: `Successfully updated data in medical table ${tableName}:\n${JSON.stringify(
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
            text: `Error updating data in medical database: ${error.message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "medicalDelete",
  {
    tableName: z
      .string()
      .min(1)
      .describe("Name of the medical table to delete from"),
    where: z
      .record(z.any())
      .describe("Object containing conditions for the WHERE clause"),
  },
  async ({ tableName, where }) => {
    try {
      if (!pools.medical) {
        await initializeMedicalDb();
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

      const result = await pools.medical.query(query, values);

      return {
        content: [
          {
            type: "text",
            text: `Successfully deleted data from medical table ${tableName}:\n${JSON.stringify(
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
            text: `Error deleting data from medical database: ${error.message}`,
          },
        ],
      };
    }
  }
);

// === SQL Write Operations - Retail Database ===
server.tool(
  "retailInsert",
  {
    tableName: z
      .string()
      .min(1)
      .describe("Name of the retail table to insert into"),
    data: z
      .record(z.any())
      .describe("Object containing column names and values to insert"),
  },
  async ({ tableName, data }) => {
    try {
      if (!pools.retail) {
        await initializeRetailDb();
      }

      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, index) => `$${index + 1}`);

      const query = `
        INSERT INTO ${tableName} (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
        RETURNING *
      `;

      const result = await pools.retail.query(query, values);

      return {
        content: [
          {
            type: "text",
            text: `Successfully inserted data into retail table ${tableName}:\n${JSON.stringify(
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
            text: `Error inserting data into retail database: ${error.message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "retailUpdate",
  {
    tableName: z.string().min(1).describe("Name of the retail table to update"),
    data: z
      .record(z.any())
      .describe("Object containing column names and values to update"),
    where: z
      .record(z.any())
      .describe("Object containing conditions for the WHERE clause"),
  },
  async ({ tableName, data, where }) => {
    try {
      if (!pools.retail) {
        await initializeRetailDb();
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

      const result = await pools.retail.query(query, values);

      return {
        content: [
          {
            type: "text",
            text: `Successfully updated data in retail table ${tableName}:\n${JSON.stringify(
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
            text: `Error updating data in retail database: ${error.message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "retailDelete",
  {
    tableName: z
      .string()
      .min(1)
      .describe("Name of the retail table to delete from"),
    where: z
      .record(z.any())
      .describe("Object containing conditions for the WHERE clause"),
  },
  async ({ tableName, where }) => {
    try {
      if (!pools.retail) {
        await initializeRetailDb();
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

      const result = await pools.retail.query(query, values);

      return {
        content: [
          {
            type: "text",
            text: `Successfully deleted data from retail table ${tableName}:\n${JSON.stringify(
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
            text: `Error deleting data from retail database: ${error.message}`,
          },
        ],
      };
    }
  }
);

// === Transport + Init ===
const transport = new StdioServerTransport();

// Initialize the database and connect to transport
(async () => {
  try {
    console.error("Initializing databases...");

    // Initialize medical database
    console.error("Initializing Medical PostgreSQL database...");
    await initializeMedicalDb();
    console.error("Medical database initialized.");

    // Initialize retail database
    console.error("Initializing Retail PostgreSQL database...");
    await initializeRetailDb();
    console.error("Retail database initialized.");

    // Connect the transport to the server
    console.error("Connecting server to transport...");
    await server.connect(transport);
    console.error("Server connected to transport.");
  } catch (error) {
    console.error("Error during initialization:", error);
    process.exit(1);
  }
})();

async function initializeMedicalDb(config = {}) {
  // Default PostgreSQL connection config for medical database
  const defaultConfig = {
    host: process.env.MEDICAL_DB_HOST || "localhost",
    port: process.env.MEDICAL_DB_PORT || 5432,
    user: process.env.MEDICAL_DB_USER || "medical_user",
    password: process.env.MEDICAL_DB_PASSWORD || "medical_password",
    database: process.env.MEDICAL_DB_NAME || "medical_db",
    max: process.env.PG_MAX_POOL_SIZE || 20,
    idleTimeoutMillis: process.env.PG_IDLE_TIMEOUT || 30000,
  };

  // Merge default config with provided config
  const connectionConfig = { ...defaultConfig, ...config };

  // Create a new pool
  pools.medical = new Pool(connectionConfig);

  try {
    // Test connection
    const client = await pools.medical.connect();
    console.error("Successfully connected to Medical PostgreSQL database");

    // Create medical schema tables if they don't exist
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

    // Insert sample data for medical database
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

    // ... rest of your existing medical data initialization ...

    client.release();
    return pools.medical;
  } catch (error) {
    console.error("Error connecting to the medical database:", error);
    throw error;
  }
}

async function initializeRetailDb(config = {}) {
  // Default PostgreSQL connection config for retail database
  const defaultConfig = {
    host: process.env.RETAIL_DB_HOST || "localhost",
    port: process.env.RETAIL_DB_PORT || 5432,
    user: process.env.RETAIL_DB_USER || "retail_user",
    password: process.env.RETAIL_DB_PASSWORD || "retail_password",
    database: process.env.RETAIL_DB_NAME || "retail_db",
    max: process.env.PG_MAX_POOL_SIZE || 20,
    idleTimeoutMillis: process.env.PG_IDLE_TIMEOUT || 30000,
  };

  // Merge default config with provided config
  const connectionConfig = { ...defaultConfig, ...config };

  // Create a new pool
  pools.retail = new Pool(connectionConfig);

  try {
    // Test connection
    const client = await pools.retail.connect();
    console.error("Successfully connected to Retail PostgreSQL database");

    // Create retail schema tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_profiles (
        customer_id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        phone_number VARCHAR(20),
        address VARCHAR(255),
        account_creation_date DATE
      );

      CREATE TABLE IF NOT EXISTS products (
        product_id SERIAL PRIMARY KEY,
        product_name VARCHAR(255),
        description TEXT,
        price DECIMAL(10, 2)
      );

      CREATE TABLE IF NOT EXISTS sales (
        transaction_id SERIAL PRIMARY KEY,
        customer_id INT REFERENCES customer_profiles(customer_id),
        product_id INT REFERENCES products(product_id),
        order_date TIMESTAMP,
        quantity INT,
        total_amount DECIMAL(10, 2)
      );

      CREATE TABLE IF NOT EXISTS customer_engagement (
        case_id SERIAL PRIMARY KEY,
        customer_id INT REFERENCES customer_profiles(customer_id),
        case_open_date TIMESTAMP,
        case_close_date TIMESTAMP,
        case_description TEXT,
        resolution TEXT,
        agent_id INT
      );
    `);

    // Insert sample data for retail database
    await client.query(`
      INSERT INTO customer_profiles (email, first_name, last_name, phone_number, address, account_creation_date)
      SELECT * FROM (VALUES
        ('customer1@example.com', 'John', 'Smith', '555-0101', '123 Main St', '2023-01-01'::DATE),
        ('customer2@example.com', 'Jane', 'Doe', '555-0102', '456 Oak Ave', '2023-01-02'::DATE),
        ('customer3@example.com', 'Bob', 'Johnson', '555-0103', '789 Pine Rd', '2023-01-03'::DATE),
        ('customer4@example.com', 'Alice', 'Brown', '555-0104', '321 Elm St', '2023-01-04'::DATE),
        ('customer5@example.com', 'Charlie', 'Davis', '555-0105', '654 Maple Dr', '2023-01-05'::DATE),
        ('customer6@example.com', 'Eva', 'Wilson', '555-0106', '987 Cedar Ln', '2023-01-06'::DATE),
        ('customer7@example.com', 'Frank', 'Miller', '555-0107', '147 Birch Rd', '2023-01-07'::DATE),
        ('customer8@example.com', 'Grace', 'Taylor', '555-0108', '258 Spruce Ave', '2023-01-08'::DATE),
        ('customer9@example.com', 'Henry', 'Anderson', '555-0109', '369 Willow St', '2023-01-09'::DATE),
        ('customer10@example.com', 'Ivy', 'Thomas', '555-0110', '741 Pine Ct', '2023-01-10'::DATE)
      ) AS v(email, first_name, last_name, phone_number, address, account_creation_date)
      WHERE NOT EXISTS (SELECT 1 FROM customer_profiles);

      INSERT INTO products (product_name, description, price)
      SELECT * FROM (VALUES
        ('Laptop Pro', 'High-performance laptop', 1299.99),
        ('Smartphone X', 'Latest smartphone model', 899.99),
        ('Wireless Earbuds', 'Premium wireless earbuds', 199.99),
        ('Smart Watch', 'Fitness tracking smartwatch', 299.99),
        ('Tablet Ultra', '12-inch tablet with stylus', 699.99),
        ('Desktop PC', 'Gaming desktop computer', 1499.99),
        ('Camera Pro', 'Professional DSLR camera', 999.99),
        ('Monitor 4K', '32-inch 4K monitor', 499.99),
        ('Printer All-in-One', 'Print, scan, and copy', 249.99),
        ('Gaming Console', 'Latest gaming console', 399.99)
      ) AS v(product_name, description, price)
      WHERE NOT EXISTS (SELECT 1 FROM products);
    `);

    // Insert sample sales data
    await client.query(`
      INSERT INTO sales (customer_id, product_id, order_date, quantity, total_amount)
      SELECT 
        customer_id,
        product_id,
        NOW() - (INTERVAL '1 day' * FLOOR(RANDOM() * 30)),
        FLOOR(RANDOM() * 3) + 1,
        products.price * (FLOOR(RANDOM() * 3) + 1)
      FROM 
        customer_profiles 
        CROSS JOIN products 
      WHERE 
        RANDOM() < 0.3
        AND NOT EXISTS (SELECT 1 FROM sales);
    `);

    // Insert sample customer engagement data
    await client.query(`
      INSERT INTO customer_engagement (
        customer_id, 
        case_open_date, 
        case_close_date, 
        case_description, 
        resolution, 
        agent_id
      )
      SELECT
        customer_id,
        NOW() - (INTERVAL '1 day' * FLOOR(RANDOM() * 30)),
        CASE WHEN RANDOM() < 0.8 
          THEN NOW() - (INTERVAL '1 day' * FLOOR(RANDOM() * 15))
          ELSE NULL 
        END,
        CASE FLOOR(RANDOM() * 3)
          WHEN 0 THEN 'Product inquiry'
          WHEN 1 THEN 'Technical support'
          ELSE 'Billing question'
        END,
        CASE WHEN RANDOM() < 0.8 
          THEN 'Issue resolved'
          ELSE NULL 
        END,
        FLOOR(RANDOM() * 5) + 1
      FROM 
        customer_profiles
      WHERE 
        RANDOM() < 0.5
        AND NOT EXISTS (SELECT 1 FROM customer_engagement);
    `);

    client.release();
    return pools.retail;
  } catch (error) {
    console.error("Error connecting to the retail database:", error);
    throw error;
  }
}

// Main initialization function
async function initializeDb(config = {}) {
  try {
    await initializeMedicalDb(config);
    await initializeRetailDb(config);
    return true;
  } catch (error) {
    console.error("Error initializing databases:", error);
    throw error;
  }
}

/*
 * "Each MCP Server must expose MCP-compliant endpoints/methods to list or query
 * items relevant to the data source in real-time."
 *
 * SQL Database: Allow basic, parameterized SQL SELECT queries. List accessible
 * tables
 */

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
