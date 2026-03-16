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
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">!</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
        <p className="text-slate-500 text-sm mb-8">
          An unexpected error occurred. Please try again or contact support at{' '}
          <a
            href="mailto:evangelos@univentureprop.com"
            className="text-blue-600 hover:underline"
          >
            evangelos@univentureprop.com
          </a>
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
