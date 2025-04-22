import { useState } from "react";
import DriveView from "./components/DriveView";
import CalendarView from "./components/CalendarView";
import SQLView from "./components/SQLView";

function App() {
  const [view, setView] = useState("drive");

  return (
    <div className="px-8 py-10 max-w-screen-xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">MCP Client Demo</h1>
      <div className="space-x-4 mb-10">
        <button onClick={() => setView("drive")} className="btn">Drive</button>
        <button onClick={() => setView("calendar")} className="btn">Calendar</button>
        <button onClick={() => setView("sql")} className="btn">SQL</button>
      </div>
      {view === "drive" && <DriveView />}
      {view === "calendar" && <CalendarView />}
      {view === "sql" && <SQLView />}
    </div>
  );
}

export default App;
