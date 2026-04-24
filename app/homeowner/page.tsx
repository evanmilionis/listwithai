'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import IntakeForm from '@/components/IntakeForm';
import ExitIntentPopup from '@/components/ExitIntentPopup';
import type { IntakeFormData } from '@/types';

export default function HomeownerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingData, setPendingData] = useState<IntakeFormData | null>(null);
  const [warnReason, setWarnReason] = useState<'email' | 'address' | null>(null);

  async function handleSubmit(data: IntakeFormData) {
    setIsLoading(true);
    setError(null);

    try {
      // Pre-check trial eligibility so we can warn the user upfront
      // if they'll be charged immediately instead of getting the trial.
      const checkRes = await fetch('/api/trial/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.customer_email,
          property_address: data.property_address,
          property_zip: data.property_zip,
        }),
      });

      if (checkRes.ok) {
        const { eligible, reason } = (await checkRes.json()) as {
          eligible: boolean;
          reason?: 'email' | 'address';
        };

        if (!eligible) {
          // Show warning modal instead of silently proceeding
          setWarnReason(reason ?? 'email');
          setPendingData(data);
          setIsLoading(false);
          return;
        }
      }

      // Eligible for trial → proceed straight to checkout
      await goToCheckout(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  }

  async function goToCheckout(data: IntakeFormData) {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, customer_type: 'homeowner' }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to create checkout session');
    window.location.href = result.url;
  }

  async function confirmNoTrial() {
    if (!pendingData) return;
    setIsLoading(true);
    try {
      await goToCheckout(pendingData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
      setWarnReason(null);
      setPendingData(null);
    }
  }

  function cancelNoTrial() {
    setWarnReason(null);
    setPendingData(null);
    setIsLoading(false);
  }

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-slate-50 min-h-screen">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-navy-800">
              Sell Your Home
            </h1>
            <p className="mt-3 text-lg text-slate-600">
              Complete the form below to get your AI-powered selling toolkit.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
              <span className="font-bold text-lg">Free 3-day trial</span>
              <span>then $100/mo</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <IntakeForm
            mode="homeowner"
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </main>
      <Footer />
      <ExitIntentPopup />

      {/* Trial-ineligible warning modal */}
      {warnReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-7">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              You&apos;re not eligible for the free trial
            </h2>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              {warnReason === 'email' ? (
                <>
                  This email has already been used to start a ListAI subscription.
                  The 3-day free trial is limited to one per customer. If you
                  continue, your card will be charged <strong>$100 today</strong>.
                </>
              ) : (
                <>
                  This property address has already been used on ListAI. The 3-day
                  free trial is limited to one per property. If you continue, your
                  card will be charged <strong>$100 today</strong>.
                </>
              )}
            </p>
            <p className="text-xs text-slate-500 mb-5">
              If you think this is a mistake, email{' '}
              <a href="mailto:hello@listwithai.io" className="text-blue-600 underline">
                hello@listwithai.io
              </a>
              .
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelNoTrial}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmNoTrial}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 bg-[#0A0F1E] text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Loading…' : 'Continue — charge me $100'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
