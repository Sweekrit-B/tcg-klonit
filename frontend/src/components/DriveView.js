const DriveView = () => {
    const mockFolders = [
      { name: "Projects", id: "folder1", createdAt: "2024-03-01" },
      { name: "Invoices", id: "folder2", createdAt: "2024-02-20" },
    ];
  
    return (
      <div className="grid grid-cols-2 gap-4">
        {mockFolders.map((folder) => (
          <div key={folder.id} className="p-4 border rounded shadow">
            <h3 className="font-semibold">{folder.name}</h3>
            <p>ID: {folder.id}</p>
            <p>Created: {folder.createdAt}</p>
          </div>
        ))}
      </div>
    );
  };
  
  export default DriveView;
  