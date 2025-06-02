# 📚 Table of Contents

## Part 1 – Full Stack App Integration of MCP

1. [🔧 Backend](#-backend)  
   - [Prerequisites](#prerequisites)  
   - [Google OAuth Setup (For Drive + Calendar Access)](#google-oauth-setup-for-drive--calendar-access)  
   - [Install Dependencies](#install-dependencies)  

2. [🗄️ MCP SQL Integration](#️-mcp-sql-integration)  
   - [Prerequisites](#prerequisites-1)  
   - [.env Configuration](#env-configuration)  
   - [Setting Up Sample Database](#setting-up-sample-database)  
   - [Default Postgres User Setup (if needed)](#default-postgres-user-setup-if-needed)  

3. [▶️ Running the Server](#️-running-the-server)

4. [🧪 MCP Tools Overview](#-mcp-tools-overview)  
   - [SQL Tools](#sql-tools)  
   - [Drive Tools](#drive-tools)  
   - [Calendar Tools](#calendar-tools)  

5. [🖥️ Frontend](#️-frontend)  
   - [Google Drive UI](#google-drive-ui)  
   - [Google Calendar UI](#google-calendar-ui)  
   - [SQL UI](#sql-ui)  

6. [🔐 Security](#-security)

7. [🧰 Troubleshooting](#-troubleshooting)

8. [🏁 First-Time Setup Notes](#-first-time-setup-notes)  
   - [Starting the MCP Server for the First Time](#starting-the-mcp-server-for-the-first-time)  
   - [Running the Frontend](#running-the-frontend)

---

## Part 2 – Python-Based Agentic Communication

9. [⚙️ Prerequisites](#️-prerequisites)

10. [🚀 Setup Instructions](#-setup)  
    - [Clone and Navigate](#1-clone-the-repository-and-navigate-to-the-agent-directory)  
    - [Create Virtual Environment](#2-create-and-activate-a-virtual-environment)  
    - [Install Dependencies](#3-install-dependencies)  
    - [Google OAuth](#4-set-up-google-oauth)  
    - [PostgreSQL Status](#5-check-postgresql-status)  
    - [Database Setup](#6-set-up-the-database)  
    - [.env File Configuration](#7-create-a-env-file-with-the-following)

11. [🏃 Running the Agent](#-running-the-agent)

12. [🐛 Troubleshooting Database Issues](#-troubleshooting-database-issues)

13. [🛠️ Available Tools](#️-available-tools)  
    - [Medical Database Tools](#medical-database-tools)  
    - [Calendar Tools](#calendar-tools-1)  
    - [Drive Tools](#drive-tools-1)

14. [💡 Example Usage](#-example-usage)

15. [❗ Error Handling](#-error-handling)


# 🚀 MCP Integration Project Part 1 - Full Stack App Integration of MCP

This repository contains a full-stack integration of the Model Context Protocol (MCP) with three major tools:

- 📁 Google Drive (read-only access)
- 📅 Google Calendar (read/write access)
- 🗄️ PostgreSQL (query and schema inspection)

---

## 🔧 Backend

### ⚙️ Prerequisites

- [Node.js](https://nodejs.org/) installed (version 14 or higher recommended)
- A Google account to access Google Cloud Console

### 🪪 Google OAuth Setup (For Drive + Calendar Access)

#### 🏗️ 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click **New Project**, provide a name, and create it
3. Select your project from the top dropdown

#### ✅ 2. Enable APIs

1. Go to **APIs & Services** > **Library**
2. Enable **Google Drive API** and **Google Calendar API**

#### 📋 3. Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **Internal** (Google Workspace) or **External** (personal Gmail)
3. Fill out required fields
4. Add scopes:
   - Drive: `https://www.googleapis.com/auth/drive.readonly`
   - Calendar: `https://www.googleapis.com/auth/calendar`
5. For External Testing mode, add your email under test users

#### 🔑 4. Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth Client ID**
3. Select **Desktop App** and create

#### 🧾 5. Download & Add `credentials.json`

1. Download the JSON
2. Rename it to `credentials.json`
3. Place it in the `/backend` directory

### 📦 Install Dependencies

```bash
cd backend
npm install
```

---

## 🗄️ MCP SQL Integration

### ⚙️ Prerequisites

- Node.js (v14+)
- PostgreSQL (v12+)
- npm

### 🧪 .env Configuration

```
PGHOST=localhost
PGPORT=5432
PGUSER=mcp_user
PGPASSWORD=mcp_password
PGDATABASE=mcp_demo
```

### 🏗️ Setting Up Sample Database

```bash
npm run setup
```

This script creates tables (`users`, `products`) and inserts test data.

### 🧑‍💻 Default Postgres User Setup (if needed)

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

### 📊 SQL Tools

- `sqlQuery`: Run SQL SELECT queries with optional params
- `listTables`: Show all accessible tables
- `tableSchema`: Return schema for selected table

### 📁 Drive Tools

- `list`: List files/folders in a given Drive folder
- `search`: Search files in Drive
- `read`: Read content from supported file types

### 📅 Calendar Tools

- `listCalendars`: List all user calendars
- `listEvents`: List events from calendar
- `getEvent`: Show detailed info about one event

---

## 🖥️ Frontend

### 📁 Google Drive UI

- Dropdown to filter: files, folders, or all
- Integrated search bar to find Drive items
- File preview via MCP read tool
- External link opens files/folders in Google Drive

### 📅 Google Calendar UI

- Button to list all calendars
- Dropdown to select a calendar
- Button to list events from selected calendar
- Toggle to show detailed event metadata

### 🗃️ SQL UI

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

### 🟢 Starting the MCP Server for the First Time

1. Open a terminal and navigate to the `backend` directory:

```bash
cd backend
```

2. Start the MCP server directly:

```bash
node server.js
```

This step is required the **first time** to trigger the Google OAuth flow for authentication.

3. After authentication completes and a `token.json` file is generated:

```bash
cd backend
npm install
node client.js
```

---

### 🖼️ Running the Frontend

```bash
cd frontend
npm install
npm start
```

Visit: `http://localhost:3000`

---

# 🤖 MCP Integration Project Part 2 - Python-based Agentic Communication

## ⚙️ Prerequisites

- Python 3.9+
- PostgreSQL database
- Google Cloud Platform account (for OAuth)

## 🔧 Setup

```bash
cd backend/mcp-python-agent
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 🔑 Set up Google OAuth

- Enable Google Calendar and Drive APIs
- Create OAuth credentials
- Save the credentials as `token.json` in project root

### 🗄️ Database Setup

```bash
psql postgres -c "CREATE DATABASE medical_db;"
psql postgres -c "CREATE USER medical_user WITH PASSWORD 'medical_password';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE medical_db TO medical_user;"
psql -d medical_db -f medical_setup.sql
```

### 🧪 .env File

```
GOOGLE_API_KEY=your_api_key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medical_db
DB_USER=medical_user
DB_PASSWORD=medical_password
```

---

## ▶️ Running the Agent

```bash
cd backend/mcp-python-agent
source .venv/bin/activate
python3 main.py
```

---

## 🛠️ Available Tools

### 🏥 Medical Database Tools

- `medical_query`
- `medical_insert`
- `medical_update`

### 📅 Calendar Tools

- `calendar_check`
- `calendar_create`
- `calendar_update`

### 📁 Drive Tools

- `drive_search`
- `drive_upload`
- `drive_share`

---

## 💡 Example Usage

```
> I need to see a cardiologist
> Schedule appointment with Dr. Smith
> Register as a new patient
```

---

## ❗ Error Handling

- Check `.env` configuration and DB connectivity
- Ensure `token.json` is valid
- Verify dependencies are installed
