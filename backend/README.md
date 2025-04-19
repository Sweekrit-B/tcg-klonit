# Backend Server

This is the backend server for the TCG Klonit application.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Set up your environment variables:

   - Copy the `.env.example` file to `.env`:
     ```
     cp .env.example .env
     ```
   - Edit the `.env` file with your database credentials and API keys.

3. Set up PostgreSQL:

   - Make sure PostgreSQL is installed and running
   - Create a database user with the credentials specified in your `.env` file
   - Create the database specified in your `.env` file

4. Start the server:

   ```
   npm start
   ```

   The server will automatically create the necessary tables and insert sample data if they don't already exist.

## PostgreSQL Setup

If you're new to PostgreSQL, here's how to get started:

### Installing PostgreSQL

1. **Download PostgreSQL** from the [official website](https://www.postgresql.org/download/)
2. **Run the installer** and follow the prompts
3. **During installation**:
   - You'll be asked to set a password for the superuser
   - Remember this password - you'll need it to connect to the database
   - Keep the default port (5432)

### Creating the Database User

1. Connect to PostgreSQL as the superuser:

   ```
   psql -U postgres
   ```

   (On macOS with Homebrew, you might need to use your system username instead of "postgres")

2. Create the user and grant privileges:

   ```sql
   CREATE USER mcp_user WITH PASSWORD 'mcp_password';
   ALTER USER mcp_user WITH SUPERUSER;
   ```

3. Create the database:

   ```sql
   CREATE DATABASE mcp_demo;
   ```

4. Grant privileges to the user:

   ```sql
   GRANT ALL PRIVILEGES ON DATABASE mcp_demo TO mcp_user;
   ```

5. Connect to the database and grant schema privileges:
   ```sql
   \c mcp_demo
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mcp_user;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mcp_user;
   ```

## Environment Variables

The following environment variables are used in the application:

- `PGHOST`: PostgreSQL host (default: localhost)
- `PGPORT`: PostgreSQL port (default: 5432)
- `PGUSER`: PostgreSQL username
- `PGPASSWORD`: PostgreSQL password
- `PGDATABASE`: PostgreSQL database name
- `OPENAI_API_KEY`: OpenAI API key (if using OpenAI services)
- `LANGSMITH_API_KEY`: LangSmith API key (if using LangSmith services)

## Troubleshooting

If you encounter connection issues:

1. Make sure PostgreSQL is running
2. Verify your database credentials in the `.env` file
3. Check that the database user has the necessary permissions
4. Try connecting to the database manually using `psql` to verify your credentials
