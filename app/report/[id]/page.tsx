'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ReportViewer from '@/components/ReportViewer';
import type { Report } from '@/types';

export default function ReportPage() {
  const params = useParams();
  const id = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchReport() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/report/${id}`);
        if (res.status === 404) {
          setError('not_found');
          return;
        }
        if (!res.ok) {
          setError('fetch_error');
          return;
        }
        const data = await res.json();
        setReport(data);
      } catch {
        setError('fetch_error');
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [id]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-navy-800 tracking-tight">
              Your ListAI Report
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Your personalized home selling toolkit powered by AI
            </p>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-navy-800 animate-spin mb-4" />
              <p className="text-sm text-slate-500">Loading your report...</p>
            </div>
          )}

          {/* 404 state */}
          {!loading && error === 'not_found' && (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                <span className="text-2xl font-bold text-slate-400">404</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Report Not Found</h2>
              <p className="text-sm text-slate-500 max-w-md text-center">
                We could not find a report with this ID. Please check the link and try again.
              </p>
            </div>
          )}

          {/* Error state */}
          {!loading && error === 'fetch_error' && (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 mb-4">
                <span className="text-xl text-red-500 font-bold">!</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Something Went Wrong</h2>
              <p className="text-sm text-slate-500 max-w-md text-center">
                There was an error loading your report. Please try refreshing the page.
              </p>
            </div>
          )}

          {/* Report content */}
          {!loading && !error && report && <ReportViewer report={report} />}
        </div>
      </main>
      <Footer />
    </>
  );
}
