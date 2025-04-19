import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Import PostgreSQL client
import pg from "pg";
const { Pool } = pg;
// Import dotenv to load environment variables from .env file
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Database connection pool
let pool = null;

// Function to initialize database connection
async function initializeDb(config = {}) {
  // Default PostgreSQL connection config
  const defaultConfig = {
    host: process.env.PGHOST || "localhost",
    port: process.env.PGPORT || 5432,
    user: process.env.PGUSER || "mcp_user",
    password: process.env.PGPASSWORD || "mcp_password",
    database: process.env.PGDATABASE || "mcp_demo",
    max: 20,
    idleTimeoutMillis: 30000,
  };

  // Merge default config with provided config
  const connectionConfig = { ...defaultConfig, ...config };

  // Create a new pool
  pool = new Pool(connectionConfig);

  try {
    // Test connection
    const client = await pool.connect();
    console.error("Successfully connected to PostgreSQL database");

    // For demo purposes, create test tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL
      );
      
      -- Only insert if the table is empty
      INSERT INTO users (name, email)
      SELECT 'Alice', 'alice@example.com'
      WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1);
      
      INSERT INTO users (name, email)
      SELECT 'Bob', 'bob@example.com'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='bob@example.com');
      
      INSERT INTO users (name, email)
      SELECT 'Charlie', 'charlie@example.com'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='charlie@example.com');
      
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL
      );
      
      -- Only insert if the table is empty
      INSERT INTO products (name, price)
      SELECT 'Laptop', 1299.99
      WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);
      
      INSERT INTO products (name, price)
      SELECT 'Smartphone', 699.99
      WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Smartphone');
      
      INSERT INTO products (name, price)
      SELECT 'Headphones', 149.99
      WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Headphones');
    `);

    client.release();
    return pool;
  } catch (error) {
    console.error("Error connecting to the database:", error);
    throw error;
  }
}

// Define the MCP server
const server = new McpServer({
  name: "Demo",
  version: "1.0.0",
});

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

// NOTE: Main SQL Query Tool created 4/12 by Spencer
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
      // Checking if pool is crorrectly initialized
      if (!pool) {
        await initializeDb();
      }

      // Manually parsing the query and finding the actual query
      const normalizedQuery = query.trimStart().toLowerCase();
      const firstWord = normalizedQuery.split(/\s+/)[0];

      // Making sure we only use SELECT queries
      // TODO: add new queries to be allowed: SQL DB INSERT/UPDATE
      if (firstWord !== "select" && firstWord !== "with") {
        throw new Error("Only SELECT queries are allowed for security reasons");
      }

      // Actually do the query using PostgreSQL
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
