# MCP Python Agent

A medical appointment scheduling assistant that helps patients find doctors and schedule appointments.

## Prerequisites

- Python 3.9+
- PostgreSQL database
- Google Cloud Platform account (for OAuth)

## Setup

1. Clone the repository and navigate to the agent directory:
```bash
cd Local-Agent
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
GOOGLE_API_KEY=your_google_gemini_api_key
CREDENTIALS_PATH=credentials.json
TOKEN_PATH=token.json

MEDICAL_DB_HOST=localhost
MEDICAL_DB_PORT=5432
MEDICAL_DB_USER=medical_user
MEDICAL_DB_PASSWORD=medical_password
MEDICAL_DB_NAME=medical_db

RETAIL_DB_HOST=localhost
RETAIL_DB_PORT=5432
RETAIL_DB_USER=retail_user
RETAIL_DB_PASSWORD=retail_password
RETAIL_DB_NAME=retail_db
```

## Running the Agent

1. Make sure you're in the agent directory:
```bash
cd Local-Agent
```

2. Activate the virtual environment if not already active:
```bash
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Run the agent of choice:
```bash
python3 main.py
python3 retail_agent.py
python3 medical_agent.py
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
