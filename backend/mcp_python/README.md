# MCP Python Server

This is a Python implementation of a Model Context Protocol (MCP) server that exposes Google Drive tools and resources for use with LLM clients such as Claude Desktop.

## Features

- **Google Drive Integration:** List, search, and read files from your Google Drive.
- **MCP Tools:** Exposes tools and resources following the MCP standard.
- **Ready for Claude Desktop:** Easily connect this server to Claude Desktop or any MCP-compatible client.

## Requirements

- Python 3.10 or higher
- [uv](https://github.com/astral-sh/uv) (recommended for dependency management)
- Google Cloud OAuth credentials (`credentials.json`)

## Setup

### 1. Clone the repository and navigate to the backend directory:

```bash
cd /path/backend
```

### 2. Initialize your Python environment with uv (recommended):

```bash
uv init
uv venv
source .venv/bin/activate
```

### 3. Install dependencies:

```bash
uv pip install "mcp[cli]" google-auth google-auth-oauthlib google-api-python-client
```

### 4. Set up Google Cloud OAuth Credentials

#### 4.1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click **New Project**, provide a project name, and create it.
3. Select the project from the top dropdown.

#### 4.2. Enable Google Drive API

1. In the Google Cloud Console, navigate to **APIs & Services** > **Library**.
2. Search for **Google Drive API**.
3. Click **Enable**.

#### 4.3. Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**.
2. Select **Internal** (for testing within your organization) and click **Create**.
3. Fill in required fields (e.g., App name, User support email).
4. Add the scope: `https://www.googleapis.com/auth/drive.readonly`.
5. Save and continue through the remaining steps.

#### 4.4. Create OAuth Client ID

1. Navigate to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth Client ID**.
3. Choose **Desktop App** as the application type.
4. Provide a name and click **Create**.

#### 4.5. Download OAuth Credentials

1. From the **Credentials** page, locate your new OAuth Client ID.
2. Click the download button to get the JSON file.
3. Rename the file to `credentials.json`.

#### 4.6. Place Credentials in Project

1. Move `credentials.json` to the `/backend` directory (same location as `server.py`).

## Running the Server

### Development Mode (MCP Inspector):

```bash
mcp dev server.py
```

## Claude Desktop Integration

Once your server is ready, install it in Claude Desktop:

```bash
mcp install server.py
```

#### Custom name

```bash
mcp install server.py --name "My MCP Server"
```

## Usage

This server exposes the following MCP tools/resources:

- `list_files(folder_id: str = "root", max_results: int = 99)`: Lists files in a Google Drive folder.
- `search_files(query: str, max_results: int = 99)`: Searches files in Google Drive.
- `read_file(file_id: str)`: Reads the content of a text file from Google Drive.

You can connect this server to Claude Desktop or any MCP-compatible client by specifying the appropriate command in your client configuration.

## Troubleshooting

- **Missing dependencies:** Make sure you have activated your virtual environment and installed all required packages.
- **Google Drive errors:** Ensure your `credentials.json` is valid and in the correct location.
- **MCP Inspector errors:** Avoid using `print()` in your server code; use logging to stderr if needed.

## References

- [Model Context Protocol Python SDK Documentation](https://modelcontextprotocol.github.io/python-sdk/)
- [Google Drive API Python Quickstart](https://developers.google.com/drive/api/quickstart/python)
- [uv Python Package Manager](https://github.com/astral-sh/uv)

---
