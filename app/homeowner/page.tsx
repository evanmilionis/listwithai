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

  async function handleSubmit(data: IntakeFormData) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          customer_type: 'homeowner',
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
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
    </>
  );
}
