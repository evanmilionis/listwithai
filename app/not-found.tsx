import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl font-bold text-slate-400">?</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>
        <h2 className="text-lg font-medium text-slate-600 mb-4">Page not found</h2>
        <p className="text-slate-500 text-sm mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
        >
          &larr; Back to ListAI
        </Link>
      </div>
    </div>
  );
}
