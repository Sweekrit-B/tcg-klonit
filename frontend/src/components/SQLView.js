// src/components/SQLView.js
import React, { useEffect, useState } from "react";

const mockSQLRows = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
  { id: 3, name: "Charlie", email: "charlie@example.com" },
];

export default function SQLView() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    // 🛠 Replace with MCP SQL connector call
    setRows(mockSQLRows);
  }, []);

  const columnNames = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>SQL Query Results</h2>
      {rows.length === 0 ? (
        <p style={styles.empty}>No data returned.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              {columnNames.map((col) => (
                <th key={col} style={styles.th}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                {columnNames.map((col) => (
                  <td key={col} style={styles.td}>{row[col]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
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
    marginBottom: "1rem",
    color: "#333",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#fff",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 0 5px rgba(0,0,0,0.1)",
  },
  th: {
    padding: "0.75rem",
    textAlign: "left",
    backgroundColor: "#eaeaea",
    borderBottom: "1px solid #ccc",
  },
  td: {
    padding: "0.75rem",
    borderBottom: "1px solid #eee",
  },
  empty: {
    fontStyle: "italic",
    color: "#777",
  },
};
