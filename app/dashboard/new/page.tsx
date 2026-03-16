'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import IntakeForm from '@/components/IntakeForm';
import type { IntakeFormData } from '@/types';
import { Loader2 } from 'lucide-react';

export default function NewReportPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingReportId, setPendingReportId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for report completion
  useEffect(() => {
    if (!pendingReportId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/report/${pendingReportId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data?.status === 'complete') {
          if (pollRef.current) clearInterval(pollRef.current);
          router.push(`/dashboard/report/${pendingReportId}`);
        } else if (data?.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setError('Report generation failed. Please try again.');
          setIsLoading(false);
          setPendingReportId(null);
        }
      } catch {
        // Ignore poll errors
      }
    }, 5000);

    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      setError('Report is taking longer than expected. Check your dashboard for updates.');
      setIsLoading(false);
      setPendingReportId(null);
    }, 300000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      clearTimeout(timeout);
    };
  }, [pendingReportId, router]);

  const handleSubmit = async (data: IntakeFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/agent');
        return;
      }

      // Create report + trigger generation via server API (bypasses RLS)
      const res = await fetch('/api/report/create-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          formData: data,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error ?? 'Failed to create report');
      }

      // Start polling for completion
      setPendingReportId(result.reportId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
      setPendingReportId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">New Report</h1>
        <p className="text-sm text-slate-500 mt-1">
          Fill in the property details to generate an AI-powered listing report.
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-slate-900 animate-spin mb-4" />
          <p className="text-lg font-medium text-slate-900">Generating Report...</p>
          <p className="text-sm text-slate-500 mt-1">
            This usually takes 30-60 seconds. You&apos;ll be redirected automatically.
          </p>
        </div>
      ) : (
        <IntakeForm mode="agent" onSubmit={handleSubmit} isLoading={isLoading} />
      )}
    </div>
  );
}
