export default function StudentsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-44 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-9 w-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex gap-4">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-44 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
