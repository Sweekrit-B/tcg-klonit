# MCP Integration Project

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
