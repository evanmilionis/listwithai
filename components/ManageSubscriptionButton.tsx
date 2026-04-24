'use client';

import { useState } from 'react';

interface Props {
  /** Pass report_id when the button is on a report page (most reliable lookup) */
  reportId?: string;
  /** Pass email as a fallback lookup (e.g. homeowner dashboard, public account page) */
  email?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Opens Stripe's hosted Billing Portal so the customer can cancel,
 * update payment method, or view invoices. No UI to rebuild — Stripe
 * handles the entire flow.
 */
export default function ManageSubscriptionButton({
  reportId,
  email,
  children = 'Manage subscription',
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal(e: React.MouseEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, email }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to open portal');
      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={openPortal}
        disabled={loading}
        className={className ?? 'text-xs font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-2 disabled:opacity-60'}
      >
        {loading ? 'Loading…' : children}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </>
  );
}
