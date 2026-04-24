'use client';

import { useEffect, useState } from 'react';
import { Mail, Phone, CheckCircle2, Inbox, User } from 'lucide-react';
import type { BuyerInquiry } from '@/types';

interface Props {
  reportId: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function InquiriesPanel({ reportId }: Props) {
  const [inquiries, setInquiries] = useState<BuyerInquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/inquiries/list?report_id=${reportId}`);
        const body = await res.json();
        if (!cancelled) setInquiries(body.inquiries ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reportId]);

  async function toggleContacted(id: string, current: boolean) {
    const next = !current;
    setInquiries((prev) =>
      prev.map((i) => (i.id === id ? { ...i, contacted: next } : i))
    );
    try {
      await fetch(`/api/inquiries/list?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacted: next }),
      });
    } catch {
      // revert on failure
      setInquiries((prev) =>
        prev.map((i) => (i.id === id ? { ...i, contacted: current } : i))
      );
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
        <p className="text-sm text-slate-400">Loading inquiries…</p>
      </div>
    );
  }

  if (inquiries.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          <Inbox size={14} />
          Buyer inquiries
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">No inquiries yet</h3>
        <p className="text-sm text-slate-500">
          Buyers who fill out the contact form on your public page will show up here.
          You&apos;ll also get an email for each one.
        </p>
      </div>
    );
  }

  const uncontacted = inquiries.filter((i) => !i.contacted).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Inbox size={14} />
            Buyer inquiries
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {inquiries.length} inquir{inquiries.length === 1 ? 'y' : 'ies'}
            {uncontacted > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                {uncontacted} new
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            You also received an email notification for each of these.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {inquiries.map((i) => (
          <div
            key={i.id}
            className={`rounded-xl border p-4 transition-colors ${
              i.contacted
                ? 'border-slate-200 bg-slate-50'
                : 'border-blue-200 bg-blue-50/40'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-slate-400" />
                  <p className="font-semibold text-slate-900 text-sm">{i.name}</p>
                  <span className="text-[11px] text-slate-400">· {timeAgo(i.created_at)}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  <a href={`mailto:${i.email}`} className="inline-flex items-center gap-1 hover:text-slate-900">
                    <Mail size={12} />
                    {i.email}
                  </a>
                  {i.phone && (
                    <a href={`tel:${i.phone}`} className="inline-flex items-center gap-1 hover:text-slate-900">
                      <Phone size={12} />
                      {i.phone}
                    </a>
                  )}
                  {i.pre_approved !== null && (
                    <span className="inline-flex items-center gap-1">
                      {i.pre_approved ? '✓ Pre-approved' : 'Not yet pre-approved'}
                    </span>
                  )}
                  {i.financing_type && (
                    <span className="uppercase tracking-wider text-slate-400 text-[10px]">
                      {i.financing_type}
                    </span>
                  )}
                </div>
                {i.message && (
                  <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {i.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => toggleContacted(i.id, i.contacted)}
                className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  i.contacted
                    ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
                title={i.contacted ? 'Mark as not contacted' : 'Mark as contacted'}
              >
                <CheckCircle2 size={12} />
                {i.contacted ? 'Contacted' : 'Mark contacted'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
