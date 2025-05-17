# === Imports ===
from flask import Flask, request, jsonify
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import os
import json
import dotenv
from datetime import datetime

# === Load Environment Variables ===
dotenv.load_dotenv()

# === Constants ===
SCOPES = ["https://www.googleapis.com/auth/calendar"]
CREDENTIALS_PATH = os.getenv("CREDENTIALS_PATH", "credentials.json")
TOKEN_PATH = os.getenv("TOKEN_PATH", "token.json")

# === Globals ===
cached_creds = None

def authorize():
    global cached_creds
    if cached_creds and cached_creds.valid:
        return cached_creds
    if os.path.exists(TOKEN_PATH):
        with open(TOKEN_PATH, 'r') as f:
            info = json.load(f)
            cached_creds = Credentials.from_authorized_user_info(info, SCOPES)
    if not cached_creds or not cached_creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
        cached_creds = flow.run_local_server(port=0)
        with open(TOKEN_PATH, 'w') as f:
            f.write(cached_creds.to_json())
    return cached_creds

def get_calendar_client():
    creds = authorize()
    return build("calendar", "v3", credentials=creds)

# === Flask App ===
app = Flask(__name__)

@app.route('/listCalendars', methods=['GET'])
def list_calendars():
    try:
        cal = get_calendar_client()
        res = cal.calendarList().list().execute()
        return jsonify([{'summary': c['summary'], 'id': c['id']} for c in res.get('items', [])])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/listEvents', methods=['GET'])
def list_events():
    try:
        cal = get_calendar_client()
        params = {
            'calendarId': request.args.get('calendarId', 'primary'),
            'maxResults': int(request.args.get('maxResults', 10)),
            'singleEvents': True,
            'orderBy': 'startTime'
        }
        if 'timeMin' in request.args:
            params['timeMin'] = request.args['timeMin']
        if 'timeMax' in request.args:
            params['timeMax'] = request.args['timeMax']
        res = cal.events().list(**params).execute()
        return jsonify([
            {
                'summary': e.get('summary'),
                'start': e['start'].get('dateTime', e['start'].get('date')),
                'end':   e['end'].get('dateTime', e['end'].get('date')),
                'id':    e['id']
            } for e in res.get('items', [])
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/getEvent', methods=['GET'])
def get_event():
    try:
        if 'eventId' not in request.args:
            return jsonify({"error": "Missing required parameter: eventId"}), 400
            
        cal = get_calendar_client()
        ev = cal.events().get(
            calendarId=request.args.get('calendarId', 'primary'),
            eventId=request.args['eventId']
        ).execute()
        return jsonify({
            'summary': ev.get('summary'),
            'start': ev['start'].get('dateTime', ev['start'].get('date')),
            'end':   ev['end'].get('dateTime', ev['end'].get('date')),
            'location': ev.get('location'),
            'description': ev.get('description'),
            'id': ev.get('id')
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/createEvent', methods=['POST'])
def create_event():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        required_fields = ['summary', 'startDateTime', 'endDateTime']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
                
        cal = get_calendar_client()
        event = {
            'summary': data['summary'],
            'location': data.get('location', ''),
            'description': data.get('description', ''),
            'start': {'dateTime': data['startDateTime'], 'timeZone': 'UTC'},
            'end': {'dateTime': data['endDateTime'], 'timeZone': 'UTC'}
        }
        if 'attendees' in data and data['attendees']:
            event['attendees'] = [{'email': e} for e in data['attendees']]
            
        res = cal.events().insert(
            calendarId=data.get('calendarId', 'primary'),
            body=event
        ).execute()
        
        # Include event ID in the response
        return jsonify({
            'id': res.get('id'),
            'htmlLink': res.get('htmlLink')
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/updateEvent', methods=['PUT'])
def update_event():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        if 'eventId' not in data:
            return jsonify({"error": "Missing required field: eventId"}), 400
            
        cal = get_calendar_client()
        
        # Get current event data
        ev = cal.events().get(
            calendarId=data.get('calendarId', 'primary'),
            eventId=data['eventId']
        ).execute()
        
        # Update fields if provided
        for f in ('summary', 'location', 'description'):
            if f in data:
                ev[f] = data[f]
                
        if 'startDateTime' in data:
            ev['start'] = {'dateTime': data['startDateTime'], 'timeZone': 'UTC'}
        if 'endDateTime' in data:
            ev['end'] = {'dateTime': data['endDateTime'], 'timeZone': 'UTC'}
        if 'attendees' in data:
            ev['attendees'] = [{'email': e} for e in data['attendees']]
            
        res = cal.events().update(
            calendarId=data.get('calendarId', 'primary'),
            eventId=data['eventId'],
            body=ev
        ).execute()
        
        return jsonify({
            'id': res.get('id'),
            'htmlLink': res.get('htmlLink')
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/deleteEvent', methods=['DELETE'])
def delete_event():
    try:
        if 'eventId' not in request.args:
            return jsonify({"error": "Missing required parameter: eventId"}), 400
            
        cal = get_calendar_client()
        cal.events().delete(
            calendarId=request.args.get('calendarId', 'primary'),
            eventId=request.args['eventId']
        ).execute()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/searchEvents', methods=['GET'])
def search_events():
    try:
        if 'query' not in request.args:
            return jsonify({"error": "Missing required parameter: query"}), 400
            
        cal = get_calendar_client()
        res = cal.events().list(
            calendarId=request.args.get('calendarId', 'primary'),
            q=request.args['query'],
            maxResults=int(request.args.get('maxResults', 10)),
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        return jsonify([
            {
                'summary': e.get('summary'),
                'start': e['start'].get('dateTime', e['start'].get('date')),
                'end': e['end'].get('dateTime', e['end'].get('date')),
                'id': e['id']
            } for e in res.get('items', [])
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# === Run Server ===
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.getenv('PORT', 5014)))