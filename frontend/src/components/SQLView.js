const SQLView = () => {
    const mockRows = [
      { name: "Alice", email: "alice@example.com" },
      { name: "Bob", email: "bob@example.com" },
    ];
  
    const columns = Object.keys(mockRows[0]);
  
    return (
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            {columns.map((col) => (
              <th key={col} className="border px-4 py-2">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mockRows.map((row, idx) => (
            <tr key={idx}>
              {columns.map((col) => (
                <td key={col} className="border px-4 py-2">{row[col]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };
  
  export default SQLView;