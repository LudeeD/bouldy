export default function CalendarView() {
  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-sm font-medium text-text mb-3">
          Calendar
        </h2>
        <div className="text-lg font-semibold text-text">
          {currentMonth}
        </div>
      </div>

      {/* Calendar placeholder */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-text-muted">
          <p className="text-sm">Calendar view coming soon</p>
        </div>
      </div>
    </div>
  );
}
