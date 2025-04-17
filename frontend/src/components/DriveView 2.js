// src/components/DriveView.js
import React, { useEffect, useState } from "react";
import DriveTable from "./DriveTable";
import { fetchDriveItems } from "../api/client"; // Assumes you have this set up

export default function DriveView() {
  const [driveItems, setDriveItems] = useState([]);
  const [filter, setFilter] = useState("all"); // "file", "folder", "all"


  useEffect(() => {
    fetchDriveItems(filter).then((result) => {
      if (result.success) {
        setDriveItems(result.data);
      } else {
        console.error("Failed to load drive data");
      }
    });
  }, [filter]);
  
  

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Drive</h2>

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

      <DriveTable items={driveItems} />
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
};
