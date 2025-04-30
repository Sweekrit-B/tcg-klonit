# Backend

## Prerequisites

- [Node.js](https://nodejs.org/) installed (version 14 or higher recommended)
- A Google account to access Google Cloud Console

## Getting Started

Before the MCP server can access data from Google Drive, it needs to be authenticated through Google Cloud using OAuth 2.0.


### 1. Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click **New Project**, provide a project name, and create it.
3. Select the project from the top dropdown.

### 2. Enable Google Drive API
1. In the Google Cloud Console, navigate to **APIs & Services** > **Library**.
2. Search for **Google Drive API**.
3. Click **Enable**.

### 3. Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**.
2. Select **Internal** (for testing within your organization) and click **Create**.
3. Fill in required fields (e.g., App name, User support email).
4. Add the scope: `https://www.googleapis.com/auth/drive.readonly`.
5. Save and continue through the remaining steps.

### 4. Create OAuth Client ID
1. Navigate to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth Client ID**.
3. Choose **Desktop App** as the application type.
4. Provide a name and click **Create**.

### 5. Download OAuth Credentials
1. From the **Credentials** page, locate your new OAuth Client ID.
2. Click the download button to get the JSON file.
3. Rename the file to `credentials.json`.

### 6. Place Credentials in Project
1. Move `credentials.json` to the `/backend` directory.

## Dependencies

Next, we’ll need to install the necessary packages.

1. Navigate to the backend directory and install dependencies:

```bash
cd backend
```
```bash
npm install
```

## Testing and Debugging

To test the MCP server, you can use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) without cloning the repository.

1. First, navigate to the `backend` directory if you are not in it already:

```bash
cd backend
```

2. Run the following terminal command:
   
```bash
npx @modelcontextprotocol/inspector node server.js
```

# Frontend

Contains base frontend setup meant offering base functionality after connecting to MCP.

# Using MCP with Claude Desktop

To integrate this MCP server with an LLM, we can use Claude Desktop.

1. First, download [Claude Desktop](https://claude.ai/download).
2. Open Claude Desktop, and navigate to Settings -> Developer -> Edit Config.
3. Open the `.config file` in any text editor
4. Replace the contents of this file with the following. Don't forget to modify the path in the `.json` to the actual file path on your computer
   ```json
   {
     "mcpServers": {
       "gdrive": {
         "command": "node",
         "args": [
           "/Path/to/tcg-klonit/backend/server.js"
         ]
       }
     }
   }
   ```
   Don't forget to modify the path in the `.json` to the actual file path on your computer
5. Restart Claude Desktop

After, you will then see the MCP servers listed on your Claude Desktop UI, and you will be able to use the tools accordingly.
