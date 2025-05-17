"""
Standalone Integration Test for Google Calendar MCP-Compatible Flask Server

Requires:  pip install requests
Usage:     python test_calendar_api.py  
           (Ensure your Flask server is running on PORT (default: 5014))
"""

import os
import requests
import json
from datetime import datetime, timedelta
import sys

# Base URL for the running server
PORT = os.getenv('PORT', '5014')
BASE_URL = f"http://localhost:{PORT}"

# Helper to print responses
def print_resp(name, resp):
    print(f"--- {name} ---")
    try:
        print(f"Status: {resp.status_code}")
        if resp.text:
            result = resp.json()
            print(json.dumps(result, indent=2))
        else:
            print("No content returned")
    except ValueError:
        print(f"Raw response: {resp.text}")
    except Exception as e:
        print(f"Error processing response: {str(e)}")
    print()

def run_tests():
    print("\n=== Testing Google Calendar Endpoints ===\n")
    
    # Track success/failure
    success_count = 0
    total_tests = 0
    
    try:
        # 1. List Calendars
        total_tests += 1
        resp = requests.get(f"{BASE_URL}/listCalendars")
        print_resp("List Calendars", resp)
        if resp.status_code == 200:
            success_count += 1
        
        # 2. List Events (next 7 days, up to 5 events)
        total_tests += 1
        now = datetime.utcnow()
        time_min = now.isoformat() + 'Z'
        time_max = (now + timedelta(days=7)).isoformat() + 'Z'
        
        resp = requests.get(
            f"{BASE_URL}/listEvents",
            params={
                "calendarId": "primary",
                "maxResults": 5,
                "timeMin": time_min,
                "timeMax": time_max
            }
        )
        print_resp("List Events", resp)
        if resp.status_code == 200:
            success_count += 1
        
        # 3. Search Events (keyword "Test")
        total_tests += 1
        resp = requests.get(
            f"{BASE_URL}/searchEvents",
            params={
                "calendarId": "primary",
                "query": "Test",
                "maxResults": 5
            }
        )
        print_resp("Search Events", resp)
        if resp.status_code == 200:
            success_count += 1
        
        # 4. Create Event
        total_tests += 1
        start = (now + timedelta(hours=1)).isoformat() + 'Z'
        end = (now + timedelta(hours=2)).isoformat() + 'Z'
        
        event_data = {
            "summary": "MCP Test Event",
            "description": "Integration test event",
            "location": "Virtual",
            "startDateTime": start,
            "endDateTime": end,
            "attendees": []
        }
        
        resp = requests.post(
            f"{BASE_URL}/createEvent",
            json=event_data
        )
        print_resp("Create Event", resp)
        
        # Extract event ID from the response
        event_id = None
        if resp.status_code == 200:
            success_count += 1
            try:
                event_id = resp.json().get('id')
                print(f"✅ Successfully created event with ID: {event_id}")
            except Exception as e:
                print(f"❌ Failed to extract event ID: {str(e)}")
        
        if event_id:
            # 5. Get Event
            total_tests += 1
            resp = requests.get(
                f"{BASE_URL}/getEvent",
                params={"eventId": event_id}
            )
            print_resp("Get Event", resp)
            if resp.status_code == 200:
                success_count += 1
            
            # 6. Update Event
            total_tests += 1
            new_summary = "MCP Test Event (Updated)"
            resp = requests.put(
                f"{BASE_URL}/updateEvent",
                json={
                    "eventId": event_id,
                    "summary": new_summary
                }
            )
            print_resp("Update Event", resp)
            if resp.status_code == 200:
                success_count += 1
            
            # 7. Delete Event
            total_tests += 1
            resp = requests.delete(
                f"{BASE_URL}/deleteEvent",
                params={"eventId": event_id}
            )
            print_resp("Delete Event", resp)
            if resp.status_code == 200:
                success_count += 1
        else:
            print("❌ Skipping Get/Update/Delete tests due to missing event ID")
    
    except requests.ConnectionError:
        print(f"❌ Failed to connect to server at {BASE_URL}")
        print("   Make sure your Flask server is running on port {PORT}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Test execution error: {str(e)}")
    
    # Summary
    print("\n=== Test Summary ===")
    print(f"Passed: {success_count}/{total_tests} tests")
    if success_count == total_tests:
        print("✅ All tests passed successfully!")
    else:
        print(f"❌ {total_tests - success_count} tests failed")
    
    print("\n=== All Calendar Tests Completed ===\n")

if __name__ == '__main__':
    run_tests()