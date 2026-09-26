export default function ReviewsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
