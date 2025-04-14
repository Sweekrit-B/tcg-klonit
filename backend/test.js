import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testCalendarMCP() {
  console.log("Starting Google Calendar MCP test...");
  
  // Define transport
  const transport = new StdioClientTransport({
    command: "node",
    args: ["server.js"],
  });
  
  // Define the MCP client
  const client = new Client({
    name: "Calendar Test Client",
    version: "1.0.0",
  });
  
  try {
    // Connect the transport to the client
    console.log("Connecting to MCP server...");
    await client.connect(transport);
    console.log("✅ Connected to MCP server");
    
    // Test 1: List Calendars
    console.log("\n📅 Test 1: Listing Calendars...");
    try {
      const calendarsResponse = await client.callTool({
        name: "listCalendars",
        arguments: {},
      });
      console.log("✅ Calendars retrieved:");
      console.log(JSON.stringify(calendarsResponse, null, 2));
    } catch (error) {
      console.error("❌ Error listing calendars:", error.message);
    }
    
    // Test 2: List Events
    console.log("\n📅 Test 2: Listing Events...");
    try {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(today.getMonth() + 1);
      
      const eventsResponse = await client.callTool({
        name: "listEvents",
        arguments: {
          calendarId: "primary",
          maxResults: 5,
          timeMin: today.toISOString(),
          timeMax: nextMonth.toISOString(),
        },
      });
      console.log("✅ Events retrieved:");
      console.log(JSON.stringify(eventsResponse, null, 2));
    } catch (error) {
      console.error("❌ Error listing events:", error.message);
    }
    
    // Test 3: Create an Event
    console.log("\n📅 Test 3: Creating Test Event...");
    try {
      // Create a test event that starts 2 hours from now and lasts 1 hour
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 2);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);
      
      const createResponse = await client.callTool({
        name: "createEvent",
        arguments: {
          calendarId: "primary",
          summary: "MCP Test Event",
          description: "This event was created by the MCP test script",
          location: "Virtual",
          startDateTime: startTime.toISOString(),
          endDateTime: endTime.toISOString(),
        },
      });
      console.log("✅ Event created:");
      console.log(JSON.stringify(createResponse, null, 2));
      
      // Save event ID for the next test
      const eventContent = createResponse.content[0].text;
      const eventId = eventContent.match(/ID: ([a-zA-Z0-9_]+)/)?.[1];
      if (eventId) {
        // Test 4: Get Event
        console.log(`\n📅 Test 4: Getting Event Details for ${eventId}...`);
        try {
          const getResponse = await client.callTool({
            name: "getEvent",
            arguments: {
              calendarId: "primary",
              eventId: eventId,
            },
          });
          console.log("✅ Event details retrieved:");
          console.log(JSON.stringify(getResponse, null, 2));
        } catch (error) {
          console.error("❌ Error getting event:", error.message);
        }
      }
    } catch (error) {
      console.error("❌ Error creating event:", error.message);
    }
    
    // Test 5: Search Events
    console.log("\n📅 Test 5: Searching for Events...");
    try {
      const searchResponse = await client.callTool({
        name: "searchEvents",
        arguments: {
          calendarId: "primary",
          query: "Test",
          maxResults: 5,
        },
      });
      console.log("✅ Search results:");
      console.log(JSON.stringify(searchResponse, null, 2));
    } catch (error) {
      console.error("❌ Error searching events:", error.message);
    }
    
    console.log("\n✅ All tests completed!");
  } catch (error) {
    console.error("❌ Error connecting to MCP server:", error.message);
  } finally {
    // Disconnect when done
    try {
      await client.disconnect();
      console.log("Disconnected from MCP server");
    } catch (error) {
      console.error("Error disconnecting:", error.message);
    }
  }
}

// Run the test
testCalendarMCP();