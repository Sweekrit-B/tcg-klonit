// src/components/DriveTable.js
import React from "react";
import {
  FolderIcon,
  DocumentTextIcon,
  PaperClipIcon,
  PresentationChartBarIcon,
  DocumentIcon,
} from "@heroicons/react/24/solid";

// DriveTable renders a styled table view of Google Drive items with file icons and optional Read button
export default function DriveTable({ items, onReadFile }) {
  // Show fallback if no items are returned
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
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              {/* Icon based on file type */}
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

              {/* File or folder name with link to open in Google Drive */}
              <td style={styles.td}>
                <a
                  href={
                    item.type === "folder"
                      ? `https://drive.google.com/drive/folders/${item.id}`
                      : `https://drive.google.com/file/d/${item.id}/view`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.link}
                >
                  {item.name}
                </a>
              </td>

              {/* Display MIME type or file/folder label */}
              <td style={styles.td}>
                {item.type === "folder"
                  ? "Folder"
                  : item.mimeType?.split("/").pop() || "File"}
              </td>

              {/* Read button for files */}
              <td style={styles.td}>
                {item.type === "file" && (
                  <button
                    style={styles.button}
                    onClick={() => onReadFile(item.id)}
                  >
                    Read
                  </button>
                )}
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
  button: {
    padding: "0.3rem 0.6rem",
    backgroundColor: "#007BFF",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  link: {
    color: "#000",
    textDecoration: "none",
    transition: "color 0.2s ease-in-out",
  },
};
