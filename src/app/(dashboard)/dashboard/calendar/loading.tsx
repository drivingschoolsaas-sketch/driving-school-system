export default function CalendarLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-9 w-32 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-12 w-full rounded bg-gray-100 dark:bg-gray-700/50" />
          ))}
        </div>
      </div>
    </div>
  );
}
