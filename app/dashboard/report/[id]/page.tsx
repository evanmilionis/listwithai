'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import ReportViewer from '@/components/ReportViewer';
import type { Report } from '@/types';
import {
  ArrowLeft,
  Share2,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  Mail,
  ChevronDown,
} from 'lucide-react';

export default function AgentReportPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [followUpSent, setFollowUpSent] = useState<string | null>(null);
  const [stagingCredits, setStagingCredits] = useState(0);

  const loadReport = async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace('/agent');
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', session.user.id)
      .single<Report>();

    if (fetchError || !data) {
      setError('Report not found or you do not have access.');
      setLoading(false);
      return;
    }

    // Fetch staging credits
    const { data: sub } = await supabase
      .from('agent_subscriptions')
      .select('staging_credits')
      .eq('user_id', session.user.id)
      .single();
    if (sub) setStagingCredits(sub.staging_credits ?? 0);

    setReport(data);
    setLoading(false);
    setRegenerating(false);
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, router]);

  // Poll for updates while regenerating
  useEffect(() => {
    if (!regenerating) return;

    const interval = setInterval(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('reports')
        .select('status')
        .eq('id', reportId)
        .single();

      if (data?.status === 'complete' || data?.status === 'failed') {
        clearInterval(interval);
        loadReport();
      }
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regenerating, reportId]);

  const handleShare = async () => {
    const shareUrl = report?.report_url
      ? report.report_url
      : `${window.location.origin}/report/${reportId}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    if (regenerating) return;
    setRegenerating(true);

    try {
      const res = await fetch('/api/report/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || 'Failed to regenerate report');
        setRegenerating(false);
      }
    } catch {
      alert('Failed to regenerate report');
      setRegenerating(false);
    }
  };

  const handleFollowUp = async (template: string) => {
    setSendingFollowUp(true);
    setFollowUpSent(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/agent/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          userId: session.user.id,
          template,
        }),
      });

      if (res.ok) {
        setFollowUpSent(template);
        setFollowUpOpen(false);
        setTimeout(() => setFollowUpSent(null), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to send email');
      }
    } catch {
      alert('Failed to send email');
    } finally {
      setSendingFollowUp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-slate-900 animate-spin" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Error</h2>
        <p className="text-slate-600 mb-6">{error ?? 'Report not found.'}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerating...' : 'Regenerate Report'}
          </button>

          {/* Follow-up email dropdown */}
          <div className="relative">
            <button
              onClick={() => setFollowUpOpen(!followUpOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              {followUpSent ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  Email Sent!
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Email Client
                  <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
            {followUpOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                {[
                  { key: 'report_ready', label: 'Report is Ready' },
                  { key: 'pricing_review', label: 'Pricing Discussion' },
                  { key: 'ready_to_list', label: 'Ready to List?' },
                  { key: 'check_in', label: 'General Check-in' },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => handleFollowUp(t.key)}
                    disabled={sendingFollowUp}
                    className="block w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg disabled:opacity-50"
                  >
                    {sendingFollowUp ? 'Sending...' : t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Link Copied!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Share with Client
              </>
            )}
          </button>
        </div>
      </div>

      {/* Regenerating banner */}
      {regenerating && (
        <div className="mb-6 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
          <p className="text-sm text-blue-800">
            Regenerating report with fresh market data. This usually takes 30-60 seconds...
          </p>
        </div>
      )}

      {/* Report content */}
      <ReportViewer report={report} agentMode stagingCredits={stagingCredits} />
    </div>
  );
}
