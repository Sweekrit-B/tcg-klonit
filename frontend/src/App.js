import { useState } from "react";
import { addNumbers } from "./api/client";

function App() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [result, setResult] = useState("");

  const handleSubmit = () => {
    addNumbers(a, b).then((result) => {
      if (result.success) {
        setResult(result.data);
      } else {
        setResult("Error: Unable to add numbers.");
      }
    });
  };

  return (
    <div>
      <p>Model Context Protocol</p>
      <p>A:</p>
      <input
        type="number"
        value={a}
        onChange={(e) => setA(Number(e.target.value))}
        placeholder="0"
      />
      <p>B:</p>
      <input
        type="number"
        value={b}
        onChange={(e) => setB(Number(e.target.value))}
        placeholder="0"
      />
      <p>Submit:</p>
      <button onClick={handleSubmit}>Submit</button>
      <p>Result: {result}</p>
    </div>
  );
}

export default App;
