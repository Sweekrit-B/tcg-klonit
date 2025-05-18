from mcp.server.fastmcp import FastMCP
from typing import Any
import os
import json

# Google Drive imports
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
TOKEN_PATH = "token.json"
CREDENTIALS_PATH = "credentials.json"

mcp = FastMCP("Demo")


def get_drive_service():
    creds = None
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(
            CREDENTIALS_PATH, SCOPES
        )
        creds = flow.run_local_server(port=0)
        with open(TOKEN_PATH, "w") as token:
            token.write(creds.to_json())
    return build("drive", "v3", credentials=creds)


@mcp.tool()
def add(a: int, b: int) -> dict:
    return {"content": [{"type": "text", "text": str(a + b)}]}


@mcp.resource("greeting://{name}")
def greeting(name: str) -> dict:
    return {
        "contents": [
            {
                "uri": f"greeting://{name}",
                "text": f"Hello, {name}!",
            }
        ]
    }


@mcp.tool()
def list(folderId: str = "root", maxResults: int = 99) -> dict:
    try:
        service = get_drive_service()
        results = (
            service.files()
            .list(
                q=f"'{folderId}' in parents and trashed=false",
                fields="files(id, name, mimeType, parents)",
                pageSize=maxResults,
            )
            .execute()
        )
        files = results.get("files", [])
        items = [
            {
                "type": "text",
                "text": f"{f['name']} ({f['mimeType']}) [ID: {f['id']}]",
            }
            for f in files
        ]
        return {
            "content": items
            if items
            else [{"type": "text", "text": "No items found."}]
        }
    except Exception as e:
        return {
            "content": [{"type": "text", "text": f"Error listing items: {e}"}]
        }


@mcp.tool()
def search(query: str, maxResults: int = 99) -> dict:
    try:
        service = get_drive_service()
        results = (
            service.files()
            .list(
                q=f"name contains '{query}' and trashed=false",
                fields="files(id, name, mimeType, parents)",
                pageSize=maxResults,
            )
            .execute()
        )
        files = results.get("files", [])
        items = [
            {
                "type": "text",
                "text": f"{f['name']} ({f['mimeType']}) [ID: {f['id']}]",
            }
            for f in files
        ]
        return {
            "content": items
            if items
            else [{"type": "text", "text": "No items found."}]
        }
    except Exception as e:
        return {
            "content": [
                {"type": "text", "text": f"Error searching items: {e}"}
            ]
        }


@mcp.tool()
def read(fileId: str) -> dict:
    try:
        service = get_drive_service()
        meta = (
            service.files()
            .get(fileId=fileId, fields="id, name, mimeType")
            .execute()
        )
        mime_type = meta.get("mimeType", "")
        if not mime_type:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": "Error: File MIME type not found.",
                    }
                ]
            }
        is_text = (
            "text" in mime_type
            or "document" in mime_type
            or "plain" in mime_type
        )
        if not is_text:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": "File is not a readable text file.",
                    }
                ]
            }
        from io import BytesIO

        fh = BytesIO()
        if "document" in mime_type:
            request = service.files().export_media(
                fileId=fileId, mimeType="text/plain"
            )
        else:
            request = service.files().get_media(fileId=fileId)
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()
        content = fh.getvalue().decode("utf-8")
        return {
            "content": [{"type": "text", "text": content}]
            if content
            else [{"type": "text", "text": "No text content found."}]
        }
    except Exception as e:
        return {
            "content": [
                {"type": "text", "text": f"Error retrieving file: {e}"}
            ]
        }


if __name__ == "__main__":
    mcp.run()
