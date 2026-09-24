// ==================================================
// Auth Layout
// ==================================================
// Shared layout for all auth pages (sign-in, sign-up,
// forgot-password, reset-password, error).
// Centers the form on screen with a branded header.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            DriveFlow
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Driving school management platform
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
