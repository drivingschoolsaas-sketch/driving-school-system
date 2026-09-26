export default function BookingsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-56 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
