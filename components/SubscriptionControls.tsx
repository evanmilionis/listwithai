'use client';

import { useState } from 'react';
import { X, AlertTriangle, Sparkles } from 'lucide-react';

type AccessStatus = 'trialing' | 'active' | 'expired' | 'none';

interface Props {
  reportId: string;
  accessStatus: AccessStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  canReactivate: boolean;
  /** Called after any state change so the parent can refresh data */
  onChange?: () => void;
}

function formatEndDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function SubscriptionControls({
  reportId,
  accessStatus,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  canReactivate,
  onChange,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Cancel failed');
      setConfirmOpen(false);
      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleUncancel() {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/stripe/uncancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to keep subscription');
      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleReactivate() {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/stripe/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Reactivation failed');
      window.location.href = body.url; // Stripe Checkout
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reactivation failed');
      setBusy(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Rendering cases
  // ─────────────────────────────────────────────────────────────────

  // Expired state: offer reactivation (with saved card) or signup from scratch
  if (accessStatus === 'expired') {
    return (
      <div className="flex flex-col items-center gap-3">
        {canReactivate ? (
          <button
            onClick={handleReactivate}
            disabled={busy}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A0F1E] text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors text-sm disabled:opacity-60"
          >
            <Sparkles size={16} />
            {busy ? 'Loading…' : 'Reactivate subscription — $100/mo'}
          </button>
        ) : (
          <a
            href="/homeowner"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A0F1E] text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors text-sm"
          >
            Subscribe — $100/mo
          </a>
        )}
        {canReactivate && (
          <p className="text-[11px] text-slate-400">
            Your saved payment method will be used. Your report unlocks instantly on checkout.
          </p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  // Already scheduled to cancel — offer to keep
  if (cancelAtPeriodEnd && (accessStatus === 'trialing' || accessStatus === 'active')) {
    return (
      <div className="flex items-center justify-between gap-3 px-5 py-3 rounded-xl bg-amber-50 border border-amber-200">
        <div className="flex items-center gap-3 text-sm text-amber-900 flex-1 min-w-0">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span className="truncate">
            Canceled. Access ends{' '}
            <strong>{currentPeriodEnd ? formatEndDate(currentPeriodEnd) : 'at period end'}</strong>.
          </span>
        </div>
        <button
          onClick={handleUncancel}
          disabled={busy}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0A0F1E] text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap"
        >
          {busy ? 'Saving…' : 'Keep subscription'}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  // Active or trialing — show cancel button
  if (accessStatus === 'trialing' || accessStatus === 'active') {
    return (
      <>
        <button
          onClick={() => setConfirmOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 underline underline-offset-2"
        >
          {accessStatus === 'trialing' ? 'Cancel trial' : 'Cancel subscription'}
        </button>

        {/* Confirmation modal */}
        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-7 relative">
              <button
                onClick={() => !busy && setConfirmOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                <AlertTriangle className="text-amber-600" size={22} />
              </div>

              <h2 className="text-lg font-bold text-slate-900 mb-2">
                {accessStatus === 'trialing' ? 'Cancel your free trial?' : 'Cancel your subscription?'}
              </h2>
              <div className="text-sm text-slate-600 space-y-2 mb-5 leading-relaxed">
                {accessStatus === 'trialing' ? (
                  <>
                    <p>
                      Your trial will continue until{' '}
                      <strong>{currentPeriodEnd ? formatEndDate(currentPeriodEnd) : 'day 3'}</strong>.
                      After that, your report will lock and your card will{' '}
                      <strong>not</strong> be charged.
                    </p>
                    <p>You can reactivate anytime — we&apos;ll keep your report on file.</p>
                  </>
                ) : (
                  <>
                    <p>
                      Your subscription will continue until{' '}
                      <strong>{currentPeriodEnd ? formatEndDate(currentPeriodEnd) : 'the end of this billing period'}</strong>,
                      then your report will lock. You won&apos;t be charged again.
                    </p>
                    <p>You can reactivate anytime from this page.</p>
                  </>
                )}
              </div>
              {error && (
                <p className="mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  disabled={busy}
                  className="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-60"
                >
                  Never mind
                </button>
                <button
                  onClick={handleCancel}
                  disabled={busy}
                  className="flex-1 py-2.5 px-4 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60"
                >
                  {busy ? 'Canceling…' : 'Yes, cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
