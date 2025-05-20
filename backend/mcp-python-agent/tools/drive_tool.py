#OLD DRIVE TOOL FILE
# import os
# import json
# from io import BytesIO
# from datetime import datetime
# from typing import List, Optional

# from google.oauth2.credentials import Credentials
# from google_auth_oauthlib.flow import InstalledAppFlow
# from googleapiclient.discovery import build
# from googleapiclient.http import MediaIoBaseDownload
# from auth import authorize_google 

# import dotenv

# # Load environment variables (for credentials path override)
# dotenv.load_dotenv()

# SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
# CREDENTIALS_PATH = os.getenv("CREDENTIALS_PATH", "credentials.json")
# TOKEN_PATH = os.getenv("TOKEN_PATH", "token.json")

# _cached_creds = None

# def get_drive_service():
#     global _cached_creds
#     if _cached_creds and _cached_creds.valid:
#         return build("drive", "v3", credentials=_cached_creds)

#     if os.path.exists(TOKEN_PATH):
#         with open(TOKEN_PATH, "r") as f:
#             info = json.load(f)
#             _cached_creds = Credentials.from_authorized_user_info(info, SCOPES)

#     if not _cached_creds or not _cached_creds.valid:
#         flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
#         _cached_creds = flow.run_local_server(port=0)
#         with open(TOKEN_PATH, "w") as f:
#             f.write(_cached_creds.to_json())

#     return build("drive", "v3", credentials=_cached_creds)

# def list_files(folder_id: str = "root", max_results: int = 99) -> str:
#     try:
#         service = get_drive_service()
#         results = (
#             service.files()
#             .list(
#                 q=f"'{folder_id}' in parents and trashed=false",
#                 fields="files(id, name, mimeType, parents)",
#                 pageSize=max_results,
#             )
#             .execute()
#         )
#         files = results.get("files", [])
#         if not files:
#             return "No items found."
#         return "\n".join(
#             f"{f['name']} ({f['mimeType']}) [ID: {f['id']}]"
#             for f in files
#         )
#     except Exception as e:
#         return f"Error listing items: {e}"

# def search_files(query: str, max_results: int = 99) -> str:
#     try:
#         service = get_drive_service()
#         results = (
#             service.files()
#             .list(
#                 q=f"name contains '{query}' and trashed=false",
#                 fields="files(id, name, mimeType, parents)",
#                 pageSize=max_results,
#             )
#             .execute()
#         )
#         files = results.get("files", [])
#         if not files:
#             return "No items found."
#         return "\n".join(
#             f"{f['name']} ({f['mimeType']}) [ID: {f['id']}]"
#             for f in files
#         )
#     except Exception as e:
#         return f"Error searching files: {e}"

# def read_file(file_id: str) -> str:
#     try:
#         service = get_drive_service()
#         meta = (
#             service.files()
#             .get(fileId=file_id, fields="id, name, mimeType")
#             .execute()
#         )
#         mime_type = meta.get("mimeType", "")
#         if not mime_type:
#             return "Error: File MIME type not found."
#         is_text = (
#             "text" in mime_type
#             or "document" in mime_type
#             or "plain" in mime_type
#         )
#         if not is_text:
#             return "File is not a readable text file."

#         fh = BytesIO()
#         if "document" in mime_type:
#             request = service.files().export_media(
#                 fileId=file_id, mimeType="text/plain"
#             )
#         else:
#             request = service.files().get_media(fileId=file_id)

#         downloader = MediaIoBaseDownload(fh, request)
#         done = False
#         while not done:
#             _, done = downloader.next_chunk()
#         content = fh.getvalue().decode("utf-8")
#         return content if content else "No text content found."
#     except Exception as e:
#         return f"Error reading file: {e}"
import os
import json
from io import BytesIO
from datetime import datetime
from typing import List, Optional

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from auth import authorize_google  # Shared OAuth logic

import dotenv

# Load environment variables
dotenv.load_dotenv()

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
CREDENTIALS_PATH = os.getenv("CREDENTIALS_PATH", "credentials.json")
TOKEN_PATH = os.getenv("TOKEN_PATH", "token.json")

_cached_creds = None

def get_drive_service():
    """Authenticate with Google Drive and return the API client."""
    global _cached_creds
    if _cached_creds and _cached_creds.valid:
        return build("drive", "v3", credentials=_cached_creds)

    if os.path.exists(TOKEN_PATH):
        with open(TOKEN_PATH, "r") as f:
            info = json.load(f)
            _cached_creds = Credentials.from_authorized_user_info(info, SCOPES)

    if not _cached_creds or not _cached_creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
        _cached_creds = flow.run_local_server(port=0)
        with open(TOKEN_PATH, "w") as f:
            f.write(_cached_creds.to_json())

    return build("drive", "v3", credentials=_cached_creds)

def list_files(folder_id: str = "root", max_results: int = 99) -> list:
    """List files/folders in a Drive folder as structured JSON."""
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
        return [
            {
                "name": f["name"],
                "id": f["id"],
                "mime_type": f["mimeType"]
            }
            for f in files
        ]
    except Exception as e:
        return [{"error": f"Error listing items: {str(e)}"}]

def search_files(query: str, max_results: int = 99) -> list:
    """Search Drive by name and return matching files/folders."""
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
        return [
            {
                "name": f["name"],
                "id": f["id"],
                "mime_type": f["mimeType"]
            }
            for f in files
        ]
    except Exception as e:
        return [{"error": f"Error searching files: {str(e)}"}]

def read_file(file_id: str) -> str:
    """Download a Drive file and return plain text content."""
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
        return f"Error reading file: {e}"
