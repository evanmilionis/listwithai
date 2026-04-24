'use client';

import { Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Props {
  children: React.ReactNode;
  locked: boolean;
  tabLabel: string;
}

/**
 * Wraps tab content. When `locked` is true, blurs the content behind an
 * overlay and shows a conversion CTA. Used during the 3-day homeowner
 * trial to show non-preview tabs as "almost yours" — visible enough
 * to entice upgrade, inaccessible enough to force conversion.
 */
export default function TrialGate({ children, locked, tabLabel }: Props) {
  if (!locked) return <>{children}</>;

  return (
    <div className="relative">
      {/* Blurred preview of the real content */}
      <div
        className="select-none pointer-events-none"
        style={{ filter: 'blur(6px)', opacity: 0.45 }}
        aria-hidden
      >
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-7 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Lock className="text-blue-600" size={22} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {tabLabel} unlocks on day 4
          </h3>
          <p className="text-sm text-slate-500 mb-5 leading-relaxed">
            Your 3-day trial gives you access to the Summary, Pricing, and Listing Copy tabs.
            The full toolkit unlocks when your subscription activates.
          </p>
          <Link
            href="/homeowner"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1E] text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Skip the trial — unlock now
            <ArrowRight size={14} />
          </Link>
          <p className="mt-3 text-[11px] text-slate-400">
            $100/mo · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
