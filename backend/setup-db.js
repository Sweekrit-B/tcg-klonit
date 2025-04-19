import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from .env file if it exists
dotenv.config();

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default PostgreSQL connection config
const defaultConfig = {
  host: process.env.PGHOST || "localhost",
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || "mcp_user",
  password: process.env.PGPASSWORD || "mcp_password",
  database: process.env.PGDATABASE || "mcp_demo",
};

async function setupDatabase() {
  console.log("Setting up PostgreSQL database...");

  // First, try to connect to the default postgres database to create our database if it doesn't exist
  const postgresPool = new Pool({
    ...defaultConfig,
    database: "postgres", // Connect to the default postgres database
  });

  try {
    // Check if our database exists
    const result = await postgresPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [defaultConfig.database]
    );

    // If database doesn't exist, create it
    if (result.rows.length === 0) {
      console.log(
        `Database '${defaultConfig.database}' does not exist. Creating it...`
      );
      await postgresPool.query(`CREATE DATABASE ${defaultConfig.database}`);
      console.log(`Database '${defaultConfig.database}' created successfully.`);
    } else {
      console.log(`Database '${defaultConfig.database}' already exists.`);
    }

    // Close the postgres connection
    await postgresPool.end();

    // Now connect to our database
    const pool = new Pool(defaultConfig);

    // Test connection
    const client = await pool.connect();
    console.log(
      `Successfully connected to '${defaultConfig.database}' database`
    );

    // Create tables and insert sample data
    console.log("Creating tables and inserting sample data...");

    // Read the SQL setup from a file
    const setupSqlPath = path.join(__dirname, "setup.sql");
    let setupSql;

    if (fs.existsSync(setupSqlPath)) {
      setupSql = fs.readFileSync(setupSqlPath, "utf8");
    } else {
      // Fallback to the SQL in the code if the file doesn't exist
      setupSql = `
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
      `;
    }

    // Execute the setup SQL
    await client.query(setupSql);
    console.log("Database setup completed successfully.");

    client.release();
    await pool.end();

    console.log(
      "\nDatabase setup is complete! You can now run the server with:"
    );
    console.log("node server.js");
  } catch (error) {
    console.error("Error setting up the database:", error);
    process.exit(1);
  }
}

// Run the setup
setupDatabase();
