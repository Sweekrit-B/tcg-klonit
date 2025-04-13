import { useState } from "react";
import DriveView from "./components/DriveView";
import CalendarView from "./components/CalendarView";
import SQLView from "./components/SQLView";

function App() {
  const [view, setView] = useState("drive");

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">MCP Client Demo</h1>
      <div className="space-x-4 mb-6">
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

// import { useState } from "react";
// import { addNumbers } from "./api/client";

// function App() {
//   const [a, setA] = useState(0);
//   const [b, setB] = useState(0);
//   const [result, setResult] = useState("");

//   const handleSubmit = () => {
//     addNumbers(a, b).then((result) => {
//       if (result.success) {
//         setResult(result.data);
//       } else {
//         setResult("Error: Unable to add numbers.");
//       }
//     });
//   };

//   return (
//     <div>
//       <p>Model Context Protocol</p>
//       <p>A:</p>
//       <input
//         type="number"
//         value={a}
//         onChange={(e) => setA(Number(e.target.value))}
//         placeholder="0"
//       />
//       <p>B:</p>
//       <input
//         type="number"
//         value={b}
//         onChange={(e) => setB(Number(e.target.value))}
//         placeholder="0"
//       />
//       <p>Submit:</p>
//       <button onClick={handleSubmit}>Submit</button>
//       <p>Result: {result}</p>
//     </div>
//   );
// }

// export default App;
