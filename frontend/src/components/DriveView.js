// src/components/DriveView.js
import React, { useEffect, useState } from "react";
import DriveTable from "./DriveTable";
import {
  fetchDriveItems,
  fetchDriveRead,
  fetchDriveSearch,
} from "../api/client";

// DriveView allows users to browse, search, and read files from Google Drive using MCP tools
export default function DriveView() {
  const [driveItems, setDriveItems] = useState([]);
  const [filter, setFilter] = useState("all"); // Filter to show all items, files, or folders
  const [searchQuery, setSearchQuery] = useState(""); // Text for searching by name
  const [selectedContent, setSelectedContent] = useState(""); // Text content of selected file
  const [loading, setLoading] = useState(false); // Loading flag for file read

  // Fetch drive items whenever the filter changes
  useEffect(() => {
    fetchDriveItems(filter).then((result) => {
      if (result.success) {
        setDriveItems(result.data);
      } else {
        console.error("Failed to load drive data");
      }
    });
  }, [filter]);

  // Run search when user clicks "Search" button
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    const result = await fetchDriveSearch(searchQuery);
    if (result.success) {
      setDriveItems(result.data);
    } else {
      console.error("Search failed");
    }
  };

  // Read the contents of a file and store it for display
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

      {/* Filter + search bar UI */}
      <div style={styles.controls}>
        <label htmlFor="filter">Filter:</label>
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

        <input
          type="text"
          placeholder="Search Drive..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.input}
        />
        <button onClick={handleSearch} style={styles.button}>
          Search
        </button>
      </div>

      {/* Table of Drive files and folders */}
      <DriveTable items={driveItems} onReadFile={handleRead} />

      {/* Display file content after clicking Read */}
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
    flexWrap: "wrap",
  },
  select: {
    padding: "0.4rem 0.6rem",
    fontSize: "0.95rem",
  },
  input: {
    padding: "0.4rem 0.6rem",
    fontSize: "0.95rem",
    flexGrow: 1,
  },
  button: {
    padding: "0.4rem 0.8rem",
    backgroundColor: "#007BFF",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.85rem",
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
