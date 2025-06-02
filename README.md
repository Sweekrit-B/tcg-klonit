# MCP Integration Project Part 1 - Full Stack App Integration of MCP

This repository contains a full-stack integration of the Model Context Protocol (MCP) with three major tools:

- Google Drive (read-only access)
- Google Calendar (read/write access)
- PostgreSQL (query and schema inspection)

---

## 🔧 Backend

### Prerequisites

- [Node.js](https://nodejs.org/) installed (version 14 or higher recommended)
- A Google account to access Google Cloud Console

### Google OAuth Setup (For Drive + Calendar Access)

#### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click **New Project**, provide a name, and create it
3. Select your project from the top dropdown

#### 2. Enable APIs

1. Go to **APIs & Services** > **Library**
2. Enable **Google Drive API** and **Google Calendar API**

#### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **Internal** (Google Workspace) or **External** (personal Gmail)
3. Fill out required fields
4. Add scopes:
   - Drive: `https://www.googleapis.com/auth/drive.readonly`
   - Calendar: `https://www.googleapis.com/auth/calendar`
5. For External Testing mode, add your email under test users

#### 4. Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth Client ID**
3. Select **Desktop App** and create

#### 5. Download & Add `credentials.json`

1. Download the JSON
2. Rename it to `credentials.json`
3. Place it in the `/backend` directory

### Install Dependencies

```bash
cd backend
npm install
```

---

## 🗄️ MCP SQL Integration

### Prerequisites

- Node.js (v14+)
- PostgreSQL (v12+)
- npm

### .env Configuration

```
PGHOST=localhost
PGPORT=5432
PGUSER=mcp_user
PGPASSWORD=mcp_password
PGDATABASE=mcp_demo
```

### Setting Up Sample Database

```bash
npm run setup
```

This script creates tables (`users`, `products`) and inserts test data.

### Default Postgres User Setup (if needed)

```sql
psql -U postgres
CREATE USER mcp_user WITH PASSWORD 'mcp_password';
ALTER USER mcp_user WITH SUPERUSER;
```

---

## ▶️ Running the Server

```bash
cd backend
npm start
```

Use `npx @modelcontextprotocol/inspector node server.js` to inspect tools.

---

## 🧪 MCP Tools Overview

### SQL Tools

- `sqlQuery`: Run SQL SELECT queries with optional params
- `listTables`: Show all accessible tables
- `tableSchema`: Return schema for selected table

### Drive Tools

- `list`: List files/folders in a given Drive folder
- `search`: Search files in Drive
- `read`: Read content from supported file types

### Calendar Tools

- `listCalendars`: List all user calendars
- `listEvents`: List events from calendar
- `getEvent`: Show detailed info about one event

---

## 🖥️ Frontend

### Google Drive UI

- Dropdown to filter: files, folders, or all
- Integrated search bar to find Drive items
- File preview via MCP read tool
- External link opens files/folders in Google Drive

### Google Calendar UI

- Button to list all calendars
- Dropdown to select a calendar
- Button to list events from selected calendar
- Toggle to show detailed event metadata

### SQL UI

- Dropdown to select table
- View schema for selected table
- SQL input to run queries
- Live preview of query results

---

## 🔐 Security

- Only allows `SELECT` queries on SQL tool
- All SQL queries are parameterized
- OAuth flow is scoped to read/write only what's necessary
- `token.json` stores sensitive tokens and is gitignored

---

## 🧰 Troubleshooting

- Check `.env` config and credentials.json placement
- Ensure correct scopes in consent screen
- Delete `token.json` and reauthenticate if refresh tokens fail
- Use `console.log` and backend logs to debug request flow

---

## 🏁 First-Time Setup Notes

### Starting the MCP Server for the First Time

1. Open a terminal and navigate to the `backend` directory:

   ```bash
   cd backend
   ```

2. Start the MCP server directly:

   ```bash
   node server.js
   ```

   This step is required the **first time** to trigger the Google OAuth flow for authentication.
   A browser window will open for you to log in and authorize access to your Google Drive and Calendar.

3. After authentication completes and a `token.json` file is generated, you can use (in a new terminal for first time ):
   ```bash
   cd backend
   npm install
   node client.js
   ```
   for subsequent server runs.

---

### Running the Frontend

1. Open a **new terminal tab or window**, and navigate to the `frontend` directory:

   ```bash
   cd frontend
   ```

2. Install frontend dependencies:

   ```bash
   npm install
   ```

3. Start the React frontend app:

   ```bash
   npm start
   ```

4. Open your browser and go to:
   ```
   http://localhost:3000
   ```

This will launch the full frontend interface to interact with Google Drive, Google Calendar, and SQL tools.


# MCP Integration Project Part 2 - Python-based Agentic Communication

A medical appointment scheduling assistant that helps patients find doctors and schedule appointments.

## Prerequisites

- Python 3.9+
- PostgreSQL database
- Google Cloud Platform account (for OAuth)

## Setup

1. Clone the repository and navigate to the agent directory:
```bash
cd backend/mcp-python-agent
```

2. Create and activate a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up Google OAuth:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project
   - Enable the Google Calendar API and Google Drive API
   - Create OAuth 2.0 credentials
   - Download the credentials and save as `token.json` in the project root

5. Check PostgreSQL Status:
```bash
# Check if PostgreSQL server is running
pg_isready

# If not running, start PostgreSQL (commands may vary by OS):
# On Mac (if installed via Homebrew):
brew services start postgresql

# On Linux:
sudo service postgresql start

# On Windows:
# Use Task Manager or Services app to start PostgreSQL service
```

6. Set up the database:
```bash
# Create the medical database and user
psql postgres -c "CREATE DATABASE medical_db;"
psql postgres -c "CREATE USER medical_user WITH PASSWORD 'medical_password';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE medical_db TO medical_user;"

# Verify database exists
psql -l  # Should show medical_db in the list

# Run the setup script
psql -d medical_db -f medical_setup.sql

# Verify tables were created
psql -d medical_db -c "\dt"

# Check sample data
psql -d medical_db -c "SELECT * FROM physicians;"
```

7. Create a `.env` file with the following:
```
GOOGLE_API_KEY=your_api_key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password
```

## Running the Agent

1. Make sure you're in the agent directory:
```bash
cd backend/mcp-python-agent
```

2. Activate the virtual environment if not already active:
```bash
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Run the agent:
```bash
python3 main.py
```

4. On first run, you'll be prompted to authorize via Google OAuth. Follow the URL provided and complete the authorization.

## Troubleshooting Database Issues

If you encounter database errors, check:

1. PostgreSQL Status:
```bash
pg_isready  # Should show "accepting connections"
```

2. Database Existence:
```bash
psql -l  # Should list medical_db
```

3. Table Setup:
```bash
psql -d medical_db -c "\dt"  # Should show physicians, patients, appointments
```

4. Sample Data:
```bash
psql -d medical_db -c "SELECT * FROM physicians;"  # Should show doctors
psql -d medical_db -c "SELECT * FROM patients;"    # Should show patients
```

5. Database Permissions:
```bash
psql -d medical_db -c "\du"  # Should show medical_user with proper privileges
```

## Available Tools

The agent uses the following tools to interact with the database and external services:

### Medical Database Tools
- `medical_query`: Execute read queries on medical database
- `medical_insert`: Insert new records (patients, appointments)
- `medical_update`: Update existing records

### Calendar Tools
- `calendar_check`: Check available appointment slots
- `calendar_create`: Create new calendar events
- `calendar_update`: Update existing appointments

### Drive Tools
- `drive_search`: Search for medical documents
- `drive_upload`: Upload new documents
- `drive_share`: Share documents with patients/doctors

## Example Usage

```
> I need to see a cardiologist
[Shows list of available cardiologists]

> Schedule appointment with Dr. Smith
[Checks availability and guides through scheduling]

> Register as a new patient
[Collects necessary patient information]
```

## Error Handling

Common errors and solutions:
- Database connection issues: Check your `.env` file and database status
- Google OAuth errors: Ensure `token.json` is present and valid
- "Tool not found" errors: Verify all dependencies are installed
