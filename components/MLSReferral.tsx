'use client';

import { cn } from '@/lib/utils';
import { Check, ExternalLink } from 'lucide-react';

interface MLSReferralProps {
  className?: string;
}

const houzeoFeatures = [
  'Listing on local MLS + Zillow, Realtor.com, Redfin',
  'Unlimited listing changes',
  'Offers & showings managed via dashboard',
  'Disclosure forms included',
  'Nationwide coverage',
];

const freedomFeatures = [
  'Florida MLS + syndication to major portals',
  'Up to 25 photos on MLS',
  'Showing scheduling tools',
  'Contracts & forms package',
  'Florida-focused support team',
];

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
      <span className="text-sm text-slate-600">{text}</span>
    </li>
  );
}

export default function MLSReferral({ className }: MLSReferralProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Your next step: Get on the MLS for under $300
        </h2>
        <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto">
          A flat-fee MLS listing puts your property on the same platforms that agents use — Zillow,
          Realtor.com, Redfin, and your local MLS — without paying a listing agent commission.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Houzeo */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-slate-300">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Houzeo</h3>
            <p className="text-sm text-slate-500 mt-0.5">Nationwide flat-fee MLS service</p>
          </div>
          <div className="mb-5">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">$99–$299</span>
            <span className="text-sm text-slate-500 ml-2">flat fee</span>
          </div>
          <ul className="space-y-2.5 mb-6">
            {houzeoFeatures.map((feature) => (
              <FeatureItem key={feature} text={feature} />
            ))}
          </ul>
          <a
            href="https://www.houzeo.com/?utm_source=listai&utm_medium=referral&utm_campaign=mls_card"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Get Started with Houzeo
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* ListWithFreedom */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-slate-300">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">ListWithFreedom</h3>
            <p className="text-sm text-slate-500 mt-0.5">Florida-focused flat-fee MLS</p>
          </div>
          <div className="mb-5">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">$99–$295</span>
            <span className="text-sm text-slate-500 ml-2">flat fee</span>
          </div>
          <ul className="space-y-2.5 mb-6">
            {freedomFeatures.map((feature) => (
              <FeatureItem key={feature} text={feature} />
            ))}
          </ul>
          <a
            href="https://www.listwithfreedom.com/?utm_source=listai&utm_medium=referral&utm_campaign=mls_card"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-lg border-2 border-slate-900 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Get Started with ListWithFreedom
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
