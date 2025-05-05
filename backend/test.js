import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testSqlMCP() {
  console.log("Starting SQL Connector MCP test...");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["server.js"],
  });

  const client = new Client({
    name: "SQL Test Client",
    version: "1.0.0",
  });

  try {
    console.log("Connecting to MCP server...");
    await client.connect(transport);
    console.log("✅ Connected to MCP server");

    // Test 1: List Tables
    console.log("\nTest 1: List Tables");
    try {
      const response = await client.callTool({
        name: "listTables",
        arguments: {},
      });
      console.log("✅ Tables:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ List Tables Error:", error.message);
    }

    // Test 2: Query users table
    console.log("\nTest 2: SELECT * FROM users");
    try {
      const response = await client.callTool({
        name: "sqlQuery",
        arguments: {
          query: "SELECT * FROM users",
        },
      });
      console.log("✅ Query Result:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ SQL Query Error:", error.message);
    }

    // Test 3: Table Schema
    console.log("\nTest 3: Get Schema for 'products' table");
    try {
      const response = await client.callTool({
        name: "tableSchema",
        arguments: {
          tableName: "products",
        },
      });
      console.log("✅ Schema:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ Table Schema Error:", error.message);
    }

    // Test 4: Insert Data
    console.log("\nTest 4: Insert new user");
    try {
      const response = await client.callTool({
        name: "insertData",
        arguments: {
          tableName: "users",
          data: {
            name: "Test User",
            email: "test@example.com",
          },
        },
      });
      console.log("✅ Insert Result:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ Insert Data Error:", error.message);
    }

    // Test 5: Update Data
    console.log("\nTest 5: Update user email");
    try {
      const response = await client.callTool({
        name: "updateData",
        arguments: {
          tableName: "users",
          data: {
            email: "updated@example.com",
          },
          where: {
            name: "Test User",
          },
        },
      });
      console.log("✅ Update Result:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ Update Data Error:", error.message);
    }

    // Test 6: Delete Data
    console.log("\nTest 6: Delete test user");
    try {
      const response = await client.callTool({
        name: "deleteData",
        arguments: {
          tableName: "users",
          where: {
            email: "updated@example.com",
          },
        },
      });
      console.log("✅ Delete Result:\n", response.content[0].text);
    } catch (error) {
      console.error("❌ Delete Data Error:", error.message);
    }

    console.log("\n✅ All tests completed!");
  } catch (error) {
    console.error("❌ Error connecting to MCP server:", error.message);
  }
}

testSqlMCP();
