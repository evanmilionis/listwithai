'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import IntakeForm from '@/components/IntakeForm';
import type { IntakeFormData } from '@/types';
import { Loader2 } from 'lucide-react';

export default function NewReportPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Create report directly in Supabase (no Stripe payment for agents)
      const { data: report, error: insertError } = await supabase
        .from('reports')
        .insert({
          user_id: session.user.id,
          customer_email: data.customer_email,
          customer_name: data.customer_name,
          property_address: data.property_address,
          property_city: data.property_city,
          property_state: data.property_state,
          property_zip: data.property_zip,
          beds: data.beds,
          baths: data.baths,
          sqft: data.sqft,
          condition_score: data.condition_score,
          asking_price: data.asking_price,
          target_close_date: data.target_close_date,
          customer_type: 'agent' as const,
          status: 'pending' as const,
          stripe_session_id: '',
          sold_status: 'unknown' as const,
          followup_stage: 0,
        })
        .select()
        .single();

      if (insertError || !report) {
        throw new Error(insertError?.message ?? 'Failed to create report');
      }

      // Trigger report generation
      const res = await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to generate report');
      }

      // Redirect to the report view
      router.push(`/dashboard/report/${report.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
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
            This usually takes 30-60 seconds.
          </p>
        </div>
      ) : (
        <IntakeForm mode="agent" onSubmit={handleSubmit} isLoading={isLoading} />
      )}
    </div>
  );
}
