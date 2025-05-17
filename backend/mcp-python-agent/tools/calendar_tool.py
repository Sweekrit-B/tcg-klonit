# tools/calendar_tool.py

import os
import json
import dotenv
from datetime import datetime
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# Load environment variables
dotenv.load_dotenv()

# OAuth scope and file paths
SCOPES = ["https://www.googleapis.com/auth/calendar"]
CREDENTIALS_PATH = os.getenv("CREDENTIALS_PATH", "credentials.json")
TOKEN_PATH = os.getenv("TOKEN_PATH", "token.json")

_cached_creds = None

def authorize():
    """Authorize with Google and return a valid credentials object."""
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

def get_calendar_client():
    """Build and return a Google Calendar API client."""
    creds = authorize()
    return build("calendar", "v3", credentials=creds)

# === Tool Wrappers ===

def list_calendars():
    cal = get_calendar_client()
    res = cal.calendarList().list().execute()
    return [
        {"summary": c["summary"], "id": c["id"]}
        for c in res.get("items", [])
    ]

def list_events(calendar_id="primary", max_results=10, time_min=None, time_max=None):
    cal = get_calendar_client()
    params = {
        "calendarId": calendar_id,
        "maxResults": max_results,
        "singleEvents": True,
        "orderBy": "startTime",
    }
    if time_min:
        params["timeMin"] = time_min
    if time_max:
        params["timeMax"] = time_max

    res = cal.events().list(**params).execute()
    return [
        {
            "summary": e.get("summary"),
            "start": e["start"].get("dateTime", e["start"].get("date")),
            "end": e["end"].get("dateTime", e["end"].get("date")),
            "id": e["id"],
        }
        for e in res.get("items", [])
    ]

def get_event(event_id, calendar_id="primary"):
    cal = get_calendar_client()
    ev = cal.events().get(calendarId=calendar_id, eventId=event_id).execute()
    return {
        "summary": ev.get("summary"),
        "start": ev["start"].get("dateTime", ev["start"].get("date")),
        "end": ev["end"].get("dateTime", ev["end"].get("date")),
        "location": ev.get("location"),
        "description": ev.get("description"),
        "id": ev.get("id"),
    }

def create_event(summary, start_datetime, end_datetime, calendar_id="primary", location="", description="", attendees=None):
    cal = get_calendar_client()
    event = {
        "summary": summary,
        "location": location,
        "description": description,
        "start": {"dateTime": start_datetime, "timeZone": "UTC"},
        "end": {"dateTime": end_datetime, "timeZone": "UTC"},
    }
    if attendees:
        event["attendees"] = [{"email": e} for e in attendees]

    res = cal.events().insert(calendarId=calendar_id, body=event).execute()
    return {
        "id": res.get("id"),
        "htmlLink": res.get("htmlLink")
    }

def update_event(event_id, calendar_id="primary", **fields):
    cal = get_calendar_client()
    ev = cal.events().get(calendarId=calendar_id, eventId=event_id).execute()

    # Update fields
    for f in ("summary", "location", "description"):
        if f in fields:
            ev[f] = fields[f]
    if "startDateTime" in fields:
        ev["start"] = {"dateTime": fields["startDateTime"], "timeZone": "UTC"}
    if "endDateTime" in fields:
        ev["end"] = {"dateTime": fields["endDateTime"], "timeZone": "UTC"}
    if "attendees" in fields:
        ev["attendees"] = [{"email": e} for e in fields["attendees"]]

    res = cal.events().update(calendarId=calendar_id, eventId=event_id, body=ev).execute()
    return {
        "id": res.get("id"),
        "htmlLink": res.get("htmlLink")
    }

def delete_event(event_id, calendar_id="primary"):
    cal = get_calendar_client()
    cal.events().delete(calendarId=calendar_id, eventId=event_id).execute()
    return {"success": True}

def search_events(query, calendar_id="primary", max_results=10):
    cal = get_calendar_client()
    res = cal.events().list(
        calendarId=calendar_id,
        q=query,
        maxResults=max_results,
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    return [
        {
            "summary": e.get("summary"),
            "start": e["start"].get("dateTime", e["start"].get("date")),
            "end": e["end"].get("dateTime", e["end"].get("date")),
            "id": e["id"],
        }
        for e in res.get("items", [])
    ]
