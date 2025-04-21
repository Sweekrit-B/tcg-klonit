// src/components/CalendarView.js
// This component provides a user interface for interacting with Google Calendar.
// Users can list calendars, select a calendar, view its events, and expand each event to see full details.

import React, { useState } from "react";
import {
  fetchCalendars,
  fetchCalendarEvents,
  fetchCalendarEventDetails,
} from "../api/client";

export default function CalendarView() {
  // Local state variables
  const [calendars, setCalendars] = useState([]);              // List of available calendars
  const [selectedCalendar, setSelectedCalendar] = useState(""); // Currently selected calendar ID
  const [events, setEvents] = useState([]);                    // Events for the selected calendar
  const [expandedEventId, setExpandedEventId] = useState(null); // ID of the currently expanded event
  const [eventDetails, setEventDetails] = useState({});        // Mapping of eventId -> full event details

  // Fetch the list of calendars from the backend
  const handleFetchCalendars = async () => {
    const result = await fetchCalendars();
    if (result.success) {
      setCalendars(result.data);
    }
  };

  // Fetch the list of events for the currently selected calendar
  const handleFetchEvents = async () => {
    if (!selectedCalendar) return;
    const result = await fetchCalendarEvents(selectedCalendar);
    if (result.success) {
      setEvents(result.data);
      setExpandedEventId(null);     // Collapse all open event cards
      setEventDetails({});          // Clear previous details
    }
  };

  // Toggle expand/collapse for a specific event and fetch its details if not already loaded
  const handleToggleEvent = async (eventId) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null); // Collapse if already open
    } else {
      if (!eventDetails[eventId]) {
        const result = await fetchCalendarEventDetails(selectedCalendar, eventId);
        if (result.success) {
          setEventDetails((prev) => ({ ...prev, [eventId]: result.data }));
        } else {
          setEventDetails((prev) => ({ ...prev, [eventId]: "Failed to load details" }));
        }
      }
      setExpandedEventId(eventId); // Expand selected event
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Google Calendar</h2>

      {/* Button to fetch and list all available calendars */}
      <button style={styles.button} onClick={handleFetchCalendars}>
        List Calendars
      </button>

      {/* Calendar selector UI */}
      {calendars.length > 0 && (
        <div style={styles.dropdownContainer}>
          <label style={styles.label}>Select Calendar:</label>
          <select
            value={selectedCalendar}
            onChange={(e) => setSelectedCalendar(e.target.value)}
            style={styles.select}
          >
            <option value="">-- Choose Calendar --</option>
            {calendars.map((cal) => (
              <option key={cal.id} value={cal.id}>
                {cal.name}
              </option>
            ))}
          </select>
          <button style={styles.button} onClick={handleFetchEvents}>
            List Events
          </button>
        </div>
      )}

      {/* Render events as cards with optional detail toggling */}
      {events.length > 0 && (
        <div style={styles.eventList}>
          <h3>Events</h3>
          {events.map((event) => (
            <div key={event.id} style={styles.card}>
              <div
                style={styles.cardHeader}
                onClick={() => handleToggleEvent(event.id)}
              >
                <div style={styles.cardTitle}>{event.title || "(No Title)"}</div>
                <div style={styles.cardText}>
                  {event.start} – {event.end}
                </div>
                <div style={styles.expandHint}>
                  {expandedEventId === event.id ? "▲ Hide Details" : "▼ Show Details"}
                </div>
              </div>
              {/* Conditionally render event details block if expanded */}
              {expandedEventId === event.id && (
                <div style={styles.cardDetails}>
                  <pre style={styles.detailsPre}>
                    {eventDetails[event.id] || "Loading..."}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// === Inline Styles for the CalendarView component ===
const styles = {
  container: { padding: "2rem", fontFamily: "Arial, sans-serif" },
  heading: { fontSize: "1.6rem", marginBottom: "1rem" },
  button: {
    padding: "0.5rem 1rem",
    margin: "0.5rem",
    backgroundColor: "#007BFF",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  dropdownContainer: {
    marginTop: "1rem",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  label: { fontSize: "1rem" },
  select: {
    padding: "0.4rem",
    fontSize: "1rem",
  },
  eventList: { marginTop: "2rem" },
  card: {
    backgroundColor: "#f9f9f9",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "1rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  cardHeader: {
    cursor: "pointer",
  },
  cardTitle: {
    fontSize: "1.1rem",
    fontWeight: "bold",
    marginBottom: "0.4rem",
  },
  cardText: {
    fontSize: "0.95rem",
    color: "#444",
  },
  expandHint: {
    fontSize: "0.85rem",
    color: "#777",
    marginTop: "0.5rem",
  },
  cardDetails: {
    marginTop: "1rem",
    backgroundColor: "#fff",
    border: "1px dashed #ccc",
    borderRadius: "6px",
    padding: "0.75rem",
  },
  detailsPre: {
    whiteSpace: "pre-wrap",
    fontSize: "0.9rem",
    color: "#333",
  },
};
