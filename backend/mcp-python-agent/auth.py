# auth.py
import os
import json
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from dotenv import load_dotenv

load_dotenv()

SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/calendar"
]
CREDENTIALS_PATH = os.getenv("CREDENTIALS_PATH", "credentials.json")
TOKEN_PATH = os.getenv("TOKEN_PATH", "token.json")

_cached_creds = None

def authorize_google():
    global _cached_creds
    if _cached_creds and _cached_creds.valid:
        return _cached_creds

    if os.path.exists(TOKEN_PATH):
        with open(TOKEN_PATH, "r") as f:
            info = json.load(f)
            _cached_creds = Credentials.from_authorized_user_info(info, SCOPES)

    if not _cached_creds or not _cached_creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
        _cached_creds = flow.run_local_server(port=0)
        with open(TOKEN_PATH, "w") as f:
            f.write(_cached_creds.to_json())

    return _cached_creds
