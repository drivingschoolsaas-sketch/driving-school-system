export default function VehiclesLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-36 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
