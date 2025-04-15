// src/components/DriveTable.js
import React from "react";
import {
  FolderIcon,
  DocumentTextIcon,
  PaperClipIcon,
  PresentationChartBarIcon,
  DocumentIcon,
} from "@heroicons/react/24/solid";

export default function DriveTable({ items }) {
  if (items.length === 0) {
    return <p style={styles.empty}>No items found.</p>;
  }

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Icon</th>
            <th style={styles.th}>Name</th>
            {/* <th style={styles.th}>Created</th> */}
            <th style={styles.th}>Type</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td style={styles.td}>
                {item.type === "folder" ? (
                  <FolderIcon style={styles.icon} />
                ) : item.mimeType?.includes("google-docs") ? (
                  <DocumentTextIcon style={styles.icon} />
                ) : item.mimeType?.includes("pdf") ? (
                  <DocumentIcon style={styles.icon} />
                ) : item.mimeType?.includes("slides") ? (
                  <PresentationChartBarIcon style={styles.icon} />
                ) : (
                  <PaperClipIcon style={styles.icon} />
                )}
              </td>
              <td style={styles.td}>{item.name}</td>
              {/* <td style={styles.td}>{item.createdAt}</td> */}
              <td style={styles.td}>
                {item.type === "folder"
                  ? "Folder"
                  : item.mimeType?.split("/").pop() || "File"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  tableWrapper: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 0 5px rgba(0,0,0,0.1)",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "0.75rem",
    borderBottom: "2px solid #ddd",
    color: "#555",
    fontSize: "0.95rem",
  },
  td: {
    padding: "0.75rem",
    borderBottom: "1px solid #eee",
    fontSize: "0.95rem",
    color: "#333",
  },
  empty: {
    padding: "1rem",
    fontStyle: "italic",
    color: "#888",
  },
  icon: {
    width: "20px",
    height: "20px",
    color: "#666",
  },
  
};
