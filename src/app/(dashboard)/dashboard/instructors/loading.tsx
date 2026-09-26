export default function InstructorsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-36 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-1">
                <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-36 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
