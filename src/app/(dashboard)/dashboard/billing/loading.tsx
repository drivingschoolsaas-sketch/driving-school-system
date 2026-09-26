export default function BillingLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-28 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="h-8 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-px bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
