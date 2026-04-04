'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import type { Report } from '@/types';
import { ExternalLink, RefreshCw, AlertCircle, Loader2, MapPin, Calendar } from 'lucide-react';

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  complete: { className: 'bg-emerald-100 text-emerald-700', label: 'Complete' },
  processing: { className: 'bg-yellow-100 text-yellow-700', label: 'Processing' },
  pending: { className: 'bg-slate-100 text-slate-600', label: 'Pending' },
  failed: { className: 'bg-red-100 text-red-700', label: 'Failed' },
};

export default function HomeownerDashboardPage() {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/homeowner');
        return;
      }

      const userId = session.user.id;

      // Try to find report by user_id + customer_type
      let { data: foundReport } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .eq('customer_type', 'homeowner')
        .order('created_at', { ascending: false })
        .limit(1)
        .single<Report>();

      // Fallback: find report via homeowner_subscriptions.report_id
      if (!foundReport) {
        const { data: sub } = await supabase
          .from('homeowner_subscriptions')
          .select('report_id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        if (sub?.report_id) {
          const { data: linkedReport } = await supabase
            .from('reports')
            .select('*')
            .eq('id', sub.report_id)
            .single<Report>();

          foundReport = linkedReport;
        }
      }

      setReport(foundReport ?? null);
      setLoading(false);
    };

    load();
  }, [router]);

  // Poll for updates while regenerating
  useEffect(() => {
    if (!regenerating || !report) return;

    const interval = setInterval(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('reports')
        .select('*')
        .eq('id', report.id)
        .single<Report>();

      if (data?.status === 'complete' || data?.status === 'failed') {
        clearInterval(interval);
        setReport(data);
        setRegenerating(false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [regenerating, report]);

  const handleRerun = async () => {
    if (!report || regenerating) return;
    setRegenerating(true);

    try {
      const res = await fetch('/api/report/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || 'Failed to re-run report');
        setRegenerating(false);
      }
    } catch {
      alert('Failed to re-run report');
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">No Report Found</h2>
        <p className="text-slate-600">
          Your report hasn&apos;t been generated yet. It may still be processing.
        </p>
      </div>
    );
  }

  const badge = STATUS_BADGE[report.status] ?? STATUS_BADGE.pending;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Report</h1>
        <p className="text-sm text-slate-500 mt-1">
          View and manage your property report.
        </p>
      </div>

      {/* Regenerating banner */}
      {regenerating && (
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
          <p className="text-sm text-blue-800">
            Re-running report with fresh market data. This usually takes 30-60 seconds...
          </p>
        </div>
      )}

      {/* Report card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 space-y-4">
          {/* Address + status row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-lg">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                {report.property_address}
              </div>
              <p className="text-sm text-slate-500 ml-6">
                {report.property_city}, {report.property_state} {report.property_zip}
              </p>
            </div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="w-4 h-4" />
            Created{' '}
            {new Date(report.created_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            {report.status === 'complete' && (
              <Link
                href={`/homeowner-dashboard/report/${report.id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View Report
              </Link>
            )}

            {report.status === 'failed' && (
              <button
                onClick={handleRerun}
                disabled={regenerating}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                {regenerating ? 'Re-running...' : 'Re-run Report'}
              </button>
            )}

            {(report.status === 'pending' || report.status === 'processing') && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Your report is being generated...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
