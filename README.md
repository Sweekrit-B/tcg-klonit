# Google Calendar MCP Connector

This repository contains a Model Context Protocol (MCP) connector for Google Calendar, allowing AI assistants to interact with Google Calendar data through standardized interfaces.

## Features

- List all calendars in your Google account
- List events with filters for time ranges
- Create new calendar events
- Get event details
- Update existing events
- Delete events
- Search for events by query

## Backend

### Prerequisites
* Node.js installed (version 14 or higher recommended)
* A Google account to access Google Cloud Console

### Getting Started

Before the MCP server can access data from Google Calendar, it needs to be authenticated through Google Cloud using OAuth 2.0.

#### 1. Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click **New Project**, provide a project name, and create it.
3. Select the project from the top dropdown.

#### 2. Enable Google Calendar API
1. In the Google Cloud Console, navigate to **APIs & Services** > **Library**.
2. Search for **Google Calendar API**.
3. Click **Enable**.

#### 3. Configure OAuth Consent Screen

When configuring the OAuth consent screen, you'll need to choose between **Internal** or **External** user types:

##### Internal OAuth Consent Screen
- **Only available for Google Workspace (formerly G Suite) accounts**
- Limited to users within your organization (same domain)
- Won't work with personal Gmail accounts
- No verification required by Google
- No expiration of refresh tokens

##### External OAuth Consent Screen
- Available for all Google accounts (including free Gmail accounts)
- Has two modes:
  - **Testing Mode**: Limited to 100 explicitly added test users, tokens expire after 7 days
  - **Production Mode**: Available to all users but requires verification

##### Setup Steps:
1. Go to **APIs & Services** > **OAuth consent screen**.
2. Select **Internal** (if using a Google Workspace account and only need access within your organization) or **External** (for personal Gmail accounts or broader access).
3. Fill in required fields (e.g., App name, User support email).
4. Add the scope: `https://www.googleapis.com/auth/calendar`.
5. Save and continue through the remaining steps.
6. For External type in Testing mode, add yourself as a test user.

#### 4. Create OAuth Client ID
1. Navigate to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth Client ID**.
3. Choose **Desktop App** as the application type.
4. Provide a name and click **Create**.

#### 5. Download OAuth Credentials
1. From the **Credentials** page, locate your new OAuth Client ID.
2. Click the download button to get the JSON file.
3. Rename the file to `credentials.json`.

#### 6. Place Credentials in Project
1. Move `credentials.json` to the backend directory.

### Dependencies

Install the necessary packages:

```bash
npm install @modelcontextprotocol/sdk googleapis @google-cloud/local-auth zod express body-parser cors dotenv
```

### Project Setup

1. Make sure your `server.js` file has the correct path to your `credentials.json` file:

```javascript
const BACKEND_DIR = "/path/to/your/backend"; // Update this path to your backend directory
```

### Running the Server

To start the server directly:

```bash
node server.js
```

The first time you run it, a browser window will open for Google authentication. After authentication, a token is stored for future use.

**Note for External OAuth in Testing mode**: You'll need to re-authenticate every 7 days as tokens expire.

### Testing and Debugging

To test the MCP server, you can use the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node server.js
```

Or use the provided test script:

```bash
node test.js
```

## Frontend

The project includes a simple web frontend to interact with the Google Calendar MCP connector.

### Running the Frontend

1. Start the client server:

```bash
node client.js
```

2. Open a browser and navigate to `http://localhost:5100`

### Frontend Features

- Tab-based interface for different calendar operations
- Form inputs for all parameter options
- JSON result display
- Error handling and loading indicators

## MCP Tools Reference

The Google Calendar MCP connector provides the following tools:

### listCalendars
Lists all calendars in your Google account.

### listEvents
Lists events from a specified calendar with options for filtering by time range and limiting results.

Parameters:
- `calendarId` (optional, defaults to "primary")
- `maxResults` (optional, defaults to 10)
- `timeMin` (optional, ISO timestamp)
- `timeMax` (optional, ISO timestamp)

### getEvent
Gets details for a specific event.

Parameters:
- `calendarId` (optional, defaults to "primary")
- `eventId` (required)

### createEvent
Creates a new calendar event.

Parameters:
- `calendarId` (optional, defaults to "primary")
- `summary` (required, the event title)
- `location` (optional)
- `description` (optional)
- `startDateTime` (required, ISO timestamp)
- `endDateTime` (required, ISO timestamp)
- `attendees` (optional, array of email addresses)

### updateEvent
Updates an existing calendar event.

Parameters:
- `calendarId` (optional, defaults to "primary")
- `eventId` (required)
- `summary` (optional)
- `location` (optional)
- `description` (optional)
- `startDateTime` (optional, ISO timestamp)
- `endDateTime` (optional, ISO timestamp)
- `attendees` (optional, array of email addresses)

### deleteEvent
Deletes an event from a calendar.

Parameters:
- `calendarId` (optional, defaults to "primary")
- `eventId` (required)

### searchEvents
Searches for events matching a query string.

Parameters:
- `calendarId` (optional, defaults to "primary")
- `query` (required)
- `maxResults` (optional, defaults to 10)

## Using with AI Tools

To use this MCP connector with Claude Desktop or other AI tools:

1. Add the MCP server configuration to your AI tool's config file:

```json
{
  "mcpServers": {
    "google-calendar": {
      "command": "node",
      "args": ["/full/path/to/server.js"]
    }
  }
}
```

2. Restart your AI tool
3. The AI tool will now be able to access your Google Calendar data through natural language commands

## Troubleshooting

### Authentication Issues

#### OAuth Consent Screen Problems

**For External OAuth Type:**
- **Error "Access Blocked"**: Make sure you've added your email as a test user in the OAuth consent screen
- **"Your app isn't verified" warning**: This is normal for apps in testing mode, click "Advanced" and then "Go to [Your App Name] (unsafe)" to proceed
- **Token expired errors**: For External type in Testing mode, tokens expire after 7 days. Delete token.json and re-authenticate
- **"App doesn't have permission" error**: Ensure you've added the correct scope (`https://www.googleapis.com/auth/calendar`) in the OAuth consent screen

**For Internal OAuth Type:**
- **Access denied errors**: Ensure you're using a Google Workspace account from your organization
- **"This app is only available to users in [Organization]"**: You can't use a personal Gmail account with Internal OAuth type
- **Email not on allowlist**: Contact your Google Workspace admin to ensure you have permission to access the API

#### OAuth Client ID Issues
- **"Error: redirect_uri_mismatch"**: Make sure you're using Desktop app credentials, not Web application
- **"The OAuth client was not found"**: Ensure your credentials.json file is correct and not corrupted
- **Invalid client secret**: Re-download your credentials.json from Google Cloud Console

#### Token Problems
- **"invalid_grant" error**: Your refresh token has expired. Delete token.json and re-authenticate
- **"Token has been expired or revoked"**: Same as above, re-authenticate
- **"Token used too early"**: Check your system clock to ensure it's set correctly

### API Errors

- **"Google Calendar API has not been used in project X before or it is disabled"**: 
  - Go to Google Cloud Console -> APIs & Services -> Library
  - Find Google Calendar API and ensure it's enabled
  - Wait a few minutes for changes to propagate after enabling

- **"Daily Limit for Unauthenticated Use Exceeded"**: OAuth is not working correctly, re-check your authentication setup

- **"User rate limit exceeded"**: You're making too many requests. Add delays between API calls

- **"Backend Error"**: Temporary Google issue, retry after a few minutes

### Code and Setup Issues

- **"Cannot find module"**: Make sure you've installed all dependencies with `npm install`

- **"ENOENT: no such file or directory, open 'credentials.json'"**: 
  - Check that your credentials.json file exists in the specified directory
  - Verify the BACKEND_DIR path in server.js points to the correct location

- **"TypeError: client.connect is not a function"**: Ensure you're using the correct version of the MCP SDK

- **"Error loading the OAuth2Client library"**: Update googleapis package with `npm update googleapis`

### MCP Inspector Issues

- **"Error connecting to server"**: Ensure your server.js file is working correctly on its own first

- **Tool not showing up in Inspector**: Check that your tool definitions in server.js are correct

- **"Request timed out"**: Authentication may be hanging, check the console output of your server

### Frontend Issues

- **CORS errors**: Make sure your client is allowing cross-origin requests

- **"Cannot GET /"**: Check that the HTML file is in the right location

- **API endpoint errors**: Ensure the endpoints in the frontend match those in your client.js

### General Debugging Tips

1. **Check logs**: Always look at the console output from your server.js for error messages

2. **Test APIs step by step**: 
   - First verify authentication works
   - Then test basic actions like listing calendars
   - Then try more complex operations

3. **Validate credentials.json**:
   - Ensure it hasn't been corrupted
   - Confirm it contains the correct client_id and client_secret
   - Make sure you're using Desktop app credentials

4. **Reset and try again**:
   - Delete token.json to force re-authentication
   - In extreme cases, create a new OAuth client ID
   - Consider creating a new project if issues persist

5. **Check Google Cloud Console**:
   - Verify API is enabled
   - Ensure OAuth consent screen is configured correctly
   - Make sure you have the right permissions