// src/components/CalendarView.js
import React, { useEffect, useState } from "react";

const mockCalendarEvents = [
  { id: "1", title: "Team Sync", start: "2024-04-15T10:00", end: "2024-04-15T11:00" },
  { id: "2", title: "1:1 with Alex", start: "2024-04-15T13:00", end: "2024-04-15T13:30" },
  { id: "3", title: "Design Review", start: "2024-04-16T09:30", end: "2024-04-16T10:30" },
];

export default function CalendarView() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // 🛠 Replace this with a real fetch to MCP tool later
    setEvents(mockCalendarEvents);
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Upcoming Calendar Events</h2>
      <ul style={styles.list}>
        {events.map((event) => (
          <li key={event.id} style={styles.event}>
            <strong>{event.title}</strong>
            <p style={styles.time}>
              {formatDate(event.start)} – {formatDate(event.end)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(datetime) {
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    month: "short",
    day: "numeric",
  };
  return new Date(datetime).toLocaleString(undefined, options);
}

const styles = {
  container: {
    padding: "2rem",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  heading: {
    fontSize: "1.6rem",
    marginBottom: "1.5rem",
    color: "#333",
  },
  list: {
    listStyle: "none",
    padding: 0,
  },
  event: {
    padding: "1rem",
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: "1rem",
  },
  time: {
    color: "#555",
    marginTop: "0.3rem",
    fontSize: "0.9rem",
  },
};
