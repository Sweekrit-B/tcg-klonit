// src/components/SQLView.js
import React, { useEffect, useState } from "react";
import {
  fetchSQLTableList,
  fetchSQLTableSchema,
  runSQLQuery,
} from "../api/client";

// SQLView component provides a UI for browsing tables, viewing schema, and running SQL queries
export default function SQLView() {
  // State to manage list of tables, selected table, its schema, user query input, and query result rows
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [schema, setSchema] = useState([]);
  const [query, setQuery] = useState("SELECT * FROM users;");
  const [rows, setRows] = useState([]);

  // Fetch available tables on component mount
  useEffect(() => {
    fetchSQLTableList().then((result) => {
      if (result.success) {
        setTables(result.data);
      }
    });
  }, []);

  // Fetch schema for selected table when dropdown changes
  useEffect(() => {
    if (selectedTable) {
      fetchSQLTableSchema(selectedTable).then((result) => {
        if (result.success) {
          setSchema(result.data);
        }
      });
    }
  }, [selectedTable]);

  // Executes the SQL query using MCP and stores result
  const handleRunQuery = async () => {
    const result = await runSQLQuery(query);
    if (result.success) {
      setRows(result.data);
    } else {
      setRows([]);
    }
  };

  // Get list of column headers from the first row of results
  const columnNames = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>SQL Interface</h2>

      {/* Dropdown to select a table and view its schema */}
      <div style={styles.schemaBox}>
        <label style={styles.label}>Select a Table:</label>
        <select
          value={selectedTable}
          onChange={(e) => {
            setSelectedTable(e.target.value);
            setQuery(`SELECT * FROM ${e.target.value};`); // Prefill query box when table selected
          }}
        >
          <option value="">-- Choose Table --</option>
          {tables.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Renders schema data for the selected table */}
        {schema.length > 0 && (
          <div style={styles.schemaDisplay}>
            <h4>Schema for '{selectedTable}':</h4>
            <ul>
              {schema.map((col, idx) => (
                <li key={idx}>
                  <strong>{col.column_name}</strong> ({col.data_type})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Input box for raw SQL query */}
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={styles.textarea}
        rows={4}
      />
      <button style={styles.button} onClick={handleRunQuery}>
        Run Query
      </button>

      {/* Section for displaying query results in a table */}
      <div style={{ marginTop: "2rem" }}>
        <h3>Query Results</h3>
        {rows.length === 0 ? (
          <p style={styles.empty}>No data returned.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {columnNames.map((col) => (
                  <th key={col} style={styles.th}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  {columnNames.map((col) => (
                    <td key={col} style={styles.td}>
                      {row[col]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Inline styles for layout and appearance
const styles = {
  container: {
    padding: "2rem",
    backgroundColor: "#f5f5f5",
    fontFamily: "Arial, sans-serif",
    minHeight: "100vh",
  },
  heading: {
    fontSize: "1.6rem",
    marginBottom: "1rem",
    color: "#333",
  },
  label: {
    fontWeight: "bold",
    marginRight: "0.5rem",
  },
  schemaBox: {
    marginBottom: "1rem",
  },
  select: {
    padding: "0.4rem",
    fontSize: "1rem",
  },
  schemaDisplay: {
    marginTop: "1rem",
    backgroundColor: "#fff",
    padding: "1rem",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  textarea: {
    width: "100%",
    padding: "0.75rem",
    fontSize: "1rem",
    marginTop: "1rem",
    borderRadius: "6px",
  },
  button: {
    marginTop: "0.75rem",
    padding: "0.5rem 1rem",
    fontSize: "1rem",
    backgroundColor: "#007BFF",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#fff",
    borderRadius: "8px",
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
