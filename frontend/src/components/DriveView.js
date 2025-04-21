// src/components/DriveView.js
import React, { useEffect, useState } from "react";
import DriveTable from "./DriveTable";
import { fetchDriveItems, fetchDriveRead } from "../api/client";

export default function DriveView() {
  const [driveItems, setDriveItems] = useState([]);
  const [filter, setFilter] = useState("all"); // User-selected filter type: all/files/folders
  const [selectedContent, setSelectedContent] = useState(""); // Used to store text content of selected file
  const [loading, setLoading] = useState(false); // Used to show loading while reading a file

  // Load items on initial render or filter change
  useEffect(() => {
    fetchDriveItems(filter).then((result) => {
      if (result.success) {
        setDriveItems(result.data);
      } else {
        console.error("Failed to load drive data");
      }
    });
  }, [filter]);

  // Handle file read action
  const handleRead = async (fileId) => {
    setLoading(true);
    const result = await fetchDriveRead(fileId);
    if (result.success) {
      setSelectedContent(result.data);
    } else {
      setSelectedContent("Failed to read file.");
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Google Drive Viewer</h2>

      {/* Filter control dropdown */}
      <div style={styles.controls}>
        <label htmlFor="filter">View:</label>
        <select
          id="filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={styles.select}
        >
          <option value="all">All</option>
          <option value="folder">Folders</option>
          <option value="file">Files</option>
        </select>
      </div>

      {/* DriveTable component displays name/type and triggers read */}
      <DriveTable items={driveItems} onReadFile={handleRead} />

      {/* Section to display selected file contents */}
      {loading ? (
        <p>Loading file content...</p>
      ) : (
        selectedContent && (
          <div style={styles.fileContent}>
            <h3>File Content</h3>
            <pre>{selectedContent}</pre>
          </div>
        )
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
  controls: {
    marginBottom: "1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  select: {
    padding: "0.4rem 0.6rem",
    fontSize: "0.95rem",
  },
  fileContent: {
    marginTop: "2rem",
    backgroundColor: "#fff",
    padding: "1rem",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    whiteSpace: "pre-wrap",
  },
};
