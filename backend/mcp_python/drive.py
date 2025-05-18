from typing import Any
from mcp.server.fastmcp import FastMCP
import os

# Google Drive imports
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
TOKEN_PATH = "token.json"
CREDENTIALS_PATH = "credentials.json"

mcp = FastMCP("Google Drive Demo")

def get_drive_service() -> Any:
    """Authenticate and return a Google Drive API service."""
    creds = None
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
        creds = flow.run_local_server(port=0)
        with open(TOKEN_PATH, "w") as token:
            token.write(creds.to_json())
    return build("drive", "v3", credentials=creds)

@mcp.tool()
async def add(a: int, b: int) -> str:
    """Add two numbers and return the result as a string."""
    return str(a + b)

@mcp.resource("greeting://{name}")
async def greeting(name: str) -> str:
    """Return a personalized greeting."""
    return f"Hello, {name}!"

@mcp.tool()
async def list_files(folder_id: str = "root", max_results: int = 99) -> str:
    """List files and folders in a Google Drive folder."""
    try:
        service = get_drive_service()
        results = (
            service.files()
            .list(
                q=f"'{folder_id}' in parents and trashed=false",
                fields="files(id, name, mimeType, parents)",
                pageSize=max_results,
            )
            .execute()
        )
        files = results.get("files", [])
        if not files:
            return "No items found."
        return "\n".join(
            f"{f['name']} ({f['mimeType']}) [ID: {f['id']}]"
            for f in files
        )
    except Exception as e:
        return f"Error listing items: {e}"

@mcp.tool()
async def search_files(query: str, max_results: int = 99) -> str:
    """Search for files and folders in Google Drive by name."""
    try:
        service = get_drive_service()
        results = (
            service.files()
            .list(
                q=f"name contains '{query}' and trashed=false",
                fields="files(id, name, mimeType, parents)",
                pageSize=max_results,
            )
            .execute()
        )
        files = results.get("files", [])
        if not files:
            return "No items found."
        return "\n".join(
            f"{f['name']} ({f['mimeType']}) [ID: {f['id']}]"
            for f in files
        )
    except Exception as e:
        return f"Error searching items: {e}"

@mcp.tool()
async def read_file(file_id: str) -> str:
    """Download and return the text content of a Google Drive file."""
    try:
        service = get_drive_service()
        meta = (
            service.files()
            .get(fileId=file_id, fields="id, name, mimeType")
            .execute()
        )
        mime_type = meta.get("mimeType", "")
        if not mime_type:
            return "Error: File MIME type not found."
        is_text = (
            "text" in mime_type
            or "document" in mime_type
            or "plain" in mime_type
        )
        if not is_text:
            return "File is not a readable text file."
        from io import BytesIO
        fh = BytesIO()
        if "document" in mime_type:
            request = service.files().export_media(
                fileId=file_id, mimeType="text/plain"
            )
        else:
            request = service.files().get_media(fileId=file_id)
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        content = fh.getvalue().decode("utf-8")
        return content if content else "No text content found."
    except Exception as e:
        return f"Error retrieving file: {e}"

if __name__ == "__main__":
    mcp.run(transport="stdio")