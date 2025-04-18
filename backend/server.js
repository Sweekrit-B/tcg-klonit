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

// Google Calendar API setup
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const BACKEND_DIR = process.cwd(); // Update this path to your backend directory
const TOKEN_PATH = path.join(BACKEND_DIR, "token.json");
const CREDENTIALS_PATH = path.join(BACKEND_DIR, "credentials.json");

// Cache for the authenticated client
let cachedClient = null;

// Authenticate with Google Calendar
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

// Initialize Google Calendar API client
async function getCalendarClient() {
  const auth = await authorize();
  return google.calendar({ version: "v3", auth });
}

// Existing example tool (keeping this from both implementations)
server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: "text", text: String(a + b) }],
}));

// Existing example resource (keeping this from both implementations)
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
      
      // Set up query parameters
      const params = {
        calendarId,
        maxResults,
        singleEvents: true,
        orderBy: "startTime",
      };
      
      // Add optional time boundaries if provided
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
      const res = await calendar.events.get({
        calendarId,
        eventId,
      });

      const event = res.data;
      const start = event.start.dateTime || event.start.date;
      const end = event.end.dateTime || event.end.date;
      
      // Format output in a readable way
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
      
      // Prepare the event resource
      const event = {
        summary,
        location,
        description,
        start: {
          dateTime: startDateTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'UTC',
        },
      };
      
      // Add attendees if provided
      if (attendees && attendees.length > 0) {
        event.attendees = attendees.map(email => ({ email }));
      }
      
      // Insert the event
      const res = await calendar.events.insert({
        calendarId,
        resource: event,
        sendNotifications: true,
      });

      return {
        content: [
          { 
            type: "text", 
            text: `Event created: ${res.data.htmlLink}` 
          },
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
  async ({ calendarId, eventId, summary, location, description, startDateTime, endDateTime, attendees }) => {
    try {
      const calendar = await getCalendarClient();
      
      // First get the existing event
      const existingEvent = await calendar.events.get({
        calendarId,
        eventId,
      });
      
      // Create the updated event resource
      const updatedEvent = { ...existingEvent.data };
      
      // Update only the fields that were provided
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
      
      // Update the event
      const res = await calendar.events.update({
        calendarId,
        eventId,
        resource: updatedEvent,
        sendNotifications: true,
      });

      return {
        content: [
          { 
            type: "text", 
            text: `Event updated: ${res.data.htmlLink}` 
          },
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
      
      // Delete the event
      await calendar.events.delete({
        calendarId,
        eventId,
      });

      return {
        content: [
          { type: "text", text: `Event successfully deleted.` },
        ],
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
      
      // Use the list endpoint with a query parameter
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

// Define the transport for the server
const transport = new StdioServerTransport();
// Connect the transport to the server
console.log("Connecting server to transport...");
await server.connect(transport);
console.log("Server connected to transport.");