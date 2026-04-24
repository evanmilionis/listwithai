'use client';

import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';

interface Props {
  reportId: string;
  propertyAddress: string;
  askingPrice: number;
}

type FinancingType = 'cash' | 'conventional' | 'fha' | 'va' | 'other' | '';

export default function PropertyInquiryForm({ reportId, propertyAddress, askingPrice }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preApproved, setPreApproved] = useState<'yes' | 'no' | ''>('');
  const [financingType, setFinancingType] = useState<FinancingType>('');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/inquiries/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: reportId,
          property_address: propertyAddress,
          asking_price: askingPrice,
          name,
          email,
          phone,
          pre_approved: preApproved === 'yes',
          financing_type: financingType || null,
          message,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Something went wrong. Please try again.');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border border-emerald-200 p-7 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="text-emerald-600" size={28} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Inquiry sent</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          The owner has been notified. You&apos;ll hear back directly — usually within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
    >
      <h3 className="text-lg font-bold text-slate-900 mb-1">Contact the owner</h3>
      <p className="text-xs text-slate-500 mb-5">
        Skip the agent. Reach out directly.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Jane Doe"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="you@email.com"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="(555) 123-4567"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Pre-approved for a mortgage?</label>
          <div className="grid grid-cols-2 gap-2">
            {(['yes', 'no'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setPreApproved(opt)}
                className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                  preApproved === opt
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                }`}
              >
                {opt === 'yes' ? 'Yes' : 'Not yet'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Financing type</label>
          <select
            value={financingType}
            onChange={(e) => setFinancingType(e.target.value as FinancingType)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">Select…</option>
            <option value="cash">Cash</option>
            <option value="conventional">Conventional</option>
            <option value="fha">FHA</option>
            <option value="va">VA</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Message</label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            placeholder="When are you available for a showing? Any questions?"
          />
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !name || !email}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#0A0F1E] text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Sending…' : (
            <>
              Send inquiry
              <Send size={14} />
            </>
          )}
        </button>

        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          Your info goes directly to the property owner — no agent, no spam.
        </p>
      </div>
    </form>
  );
}
