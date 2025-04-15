# Backend

Contains server and client setup for MCP, as well as package.json/package-lock.json.

# Frontend

Contains base frontend setup meant offering base functionality after connecting to MCP.

# MCP SQL Integration

This project provides a Model Context Protocol (MCP) server that integrates with a PostgreSQL database, allowing you to query and inspect database tables through the MCP protocol.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Clone this repository:

   ```
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Configure the database connection:
   - The `.env` file in the backend directory contains the database configuration
   - Edit the `.env` file with your PostgreSQL connection details:
     ```
     PGHOST=your-database-host
     PGPORT=5432
     PGUSER=your-username
     PGPASSWORD=your-secure-password
     PGDATABASE=your-database-name
     ```

## Database Setup

Before running the server, you need to set up the database:

1. Make sure PostgreSQL is running on your machine
2. Run the setup script:
   ```
   cd backend
   npm run setup
   ```

This script will:

- Create the database if it doesn't exist
- Create the necessary tables (users and products)
- Insert sample data

### PostgreSQL Installation and Configuration

If you're new to PostgreSQL, here's how to get started:

#### Installing PostgreSQL

1. **Download PostgreSQL** from the [official website](https://www.postgresql.org/download/)
2. **Run the installer** and follow the prompts
3. **During installation**:
   - You'll be asked to set a password for the `postgres` superuser
   - Remember this password - you'll need it to connect to the database
   - Keep the default port (5432)

#### Using the Default Configuration

The application includes default database configuration values:

To use these default values, you need to:

1. **Create the `mcp_user` in PostgreSQL**:

   - Open a terminal/command prompt
   - Connect to PostgreSQL as the superuser:
     ```
     psql -U postgres
     ```
   - When prompted, enter the password you set during installation
   - Create the user and grant privileges:
     ```sql
     CREATE USER mcp_user WITH PASSWORD 'mcp_password';
     ALTER USER mcp_user WITH SUPERUSER;
     ```
   - Exit psql by typing `\q` and pressing Enter

2. **Edit the `.env` file** to use these default values (or keep them as they are)

## Running the Server

Start the MCP server:

```
cd backend
npm start
```

## Using the MCP Inspector

The [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) is a powerful developer tool for testing and debugging MCP servers. It provides a visual interface to interact with your MCP server and test its tools and resources.

### Installing the MCP Inspector

You can run the MCP Inspector directly using npx without installation:

```bash
npx @modelcontextprotocol/inspector <command>
```

### Inspecting Your SQL MCP Server

To inspect your SQL MCP server:

```bash
cd backend
npx @modelcontextprotocol/inspector node server.js
```

This will:

1. Start the MCP Inspector client UI (default port 6274)
2. Start the MCP Proxy server (default port 6277)
3. Launch your SQL MCP server

Open the MCP Inspector client UI in your browser to interact with your server.

### Features of the MCP Inspector

The MCP Inspector provides several features for testing your SQL MCP integration:

- **Tools Tab**: Test your SQL tools (`sqlQuery`, `listTables`, `tableSchema`) with custom inputs
- **Resources Tab**: Inspect available resources
- **Notifications Pane**: View server logs and notifications
- **Server Connection Pane**: Configure connection settings

### Example: Testing SQL Queries

Using the MCP Inspector, you can easily test SQL queries:

1. Open the MCP Inspector in your browser
2. Navigate to the "Tools" tab
3. Select the "sqlQuery" tool
4. Enter a query like `SELECT * FROM users`
5. Click "Execute" to see the results

### Customizing the Inspector

You can customize the MCP Inspector with environment variables:

```bash
CLIENT_PORT=8080 SERVER_PORT=9000 npx @modelcontextprotocol/inspector node server.js
```

For more details on using the MCP Inspector, see the [official documentation](https://modelcontextprotocol.io/docs/tools/inspector) or the [GitHub repository](https://github.com/modelcontextprotocol/inspector).

## Available MCP Tools

The server provides the following MCP tools:

1. **sqlQuery**: Execute SQL SELECT queries

   - Parameters:
     - `query`: SQL SELECT query with placeholders
     - `params`: Array of parameters to substitute in the query (optional)

2. **listTables**: List all tables in the database

   - No parameters required

3. **tableSchema**: Get the schema of a specific table
   - Parameters:
     - `tableName`: Name of the table to describe

## Example Usage

### Using the sqlQuery Tool

```javascript
// Example query to get all users
const result = await mcpClient.tool("sqlQuery", {
  query: "SELECT * FROM users",
  params: [],
});

// Example parameterized query
const result = await mcpClient.tool("sqlQuery", {
  query: "SELECT * FROM products WHERE price > $1",
  params: [500],
});
```

### Using the listTables Tool

```javascript
const result = await mcpClient.tool("listTables", {});
```

### Using the tableSchema Tool

```javascript
const result = await mcpClient.tool("tableSchema", {
  tableName: "users",
});
```

## Security Notes

- The server only allows SELECT queries for security reasons
- All queries are parameterized to prevent SQL injection
- Consider using a dedicated database user with limited permissions
- The `.env` file contains sensitive information and is excluded from version control

## Troubleshooting

If you encounter issues:

1. Check that PostgreSQL is running
2. Verify your database connection settings in the `.env` file
3. Ensure the database user has the necessary permissions
4. Check the server logs for error messages

## License

[Your License]
