export default function PaymentsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-56 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
            <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-7 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 rounded bg-gray-100 dark:bg-gray-700/50" />
        ))}
      </div>
    </div>
  );
}
