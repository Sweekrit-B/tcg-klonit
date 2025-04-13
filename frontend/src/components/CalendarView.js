const CalendarView = () => {
    const mockEvents = [
      { title: "Team Sync", start: "2024-04-13T10:00", end: "2024-04-13T11:00" },
      { title: "Interview", start: "2024-04-14T15:00", end: "2024-04-14T16:00" },
    ];
  
    return (
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">Title</th>
            <th className="border px-4 py-2">Start</th>
            <th className="border px-4 py-2">End</th>
          </tr>
        </thead>
        <tbody>
          {mockEvents.map((event, idx) => (
            <tr key={idx}>
              <td className="border px-4 py-2">{event.title}</td>
              <td className="border px-4 py-2">{event.start}</td>
              <td className="border px-4 py-2">{event.end}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  export default CalendarView;
