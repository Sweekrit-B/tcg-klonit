import React, { useState } from "react";
import {
  fetchCalendars,
  fetchCalendarEvents
} from "../api/client";

export default function CalendarView() {
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState("");
  const [events, setEvents] = useState([]);

  const handleFetchCalendars = async () => {
    const result = await fetchCalendars();
    if (result.success) {
      setCalendars(result.data);
    }
  };

  const handleFetchEvents = async () => {
    if (!selectedCalendar) return;

    const result = await fetchCalendarEvents(selectedCalendar);
    if (result.success) {
      setEvents(result.data);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Google Calendar</h2>

      <button style={styles.button} onClick={handleFetchCalendars}>
        List Calendars
      </button>

      {calendars.length > 0 && (
        <div style={styles.dropdownContainer}>
          <label>Select Calendar:</label>
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

      {events.length > 0 && (
        <div style={styles.events}>
          <h3>Events</h3>
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                <strong>{event.title}</strong>: {event.start} – {event.end}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

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
  dropdownContainer: { marginTop: "1rem", display: "flex", alignItems: "center", gap: "1rem" },
  select: {
    padding: "0.4rem",
    fontSize: "1rem",
  },
  events: { marginTop: "2rem" },
};
