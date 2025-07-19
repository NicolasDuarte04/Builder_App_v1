'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    // In production, this would be sent to a service like Sentry
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center max-w-md">
        <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Oops! Something went wrong</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">We apologize for the inconvenience. Please try again.</p>
        <button
          onClick={reset}
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          Try again
        </button>
      </div>
    </div>
  );
} 