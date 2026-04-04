'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface PricingCardsProps {
  onHomeownerClick: () => void;
  onAgentClick: () => void;
  className?: string;
}

const homeownerFeatures = [
  'AI-generated property report',
  'Pricing strategy with comp analysis',
  'Custom listing description & SEO copy',
  'Improvement recommendations with ROI',
  'Week-by-week selling timeline',
  'Legal document templates & attorney referrals',
  'MLS listing service recommendations',
  '5-stage email followup support',
];

const agentFeatures = [
  'Everything in Homeowner, plus:',
  'Unlimited reports per month',
  'White-label report branding',
  'Client-ready PDF exports',
  'Bulk intake form links',
  'Priority email support',
  'Agent dashboard & analytics',
  'Cancel anytime',
];

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
      <span className="text-sm text-slate-600">{text}</span>
    </li>
  );
}

export default function PricingCards({
  onHomeownerClick,
  onAgentClick,
  className,
}: PricingCardsProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto', className)}>
      {/* Homeowner Card */}
      <div className="relative group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-slate-300">
        <div className="absolute -top-3 left-6">
          <span className="inline-block bg-slate-900 text-white text-xs font-semibold px-3 py-1 rounded-full tracking-wide uppercase">
            Most Popular
          </span>
        </div>
        <div className="mb-6 pt-2">
          <h3 className="text-lg font-semibold text-slate-900">Homeowner</h3>
          <p className="text-sm text-slate-500 mt-1">Everything you need to sell your home FSBO</p>
        </div>
        <div className="mb-6">
          <span className="text-4xl font-bold text-slate-900 tracking-tight">$100</span>
          <span className="text-sm text-slate-500 ml-2">/month</span>
        </div>
        <ul className="space-y-3 mb-8">
          {homeownerFeatures.map((feature) => (
            <FeatureItem key={feature} text={feature} />
          ))}
        </ul>
        <button
          onClick={onHomeownerClick}
          className="w-full rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
        >
          Start My Home Sale
        </button>
      </div>

      {/* Agent Card */}
      <div className="relative group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-slate-300">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Agent</h3>
          <p className="text-sm text-slate-500 mt-1">
            Generate reports for your clients at scale
          </p>
        </div>
        <div className="mb-6">
          <span className="text-4xl font-bold text-slate-900 tracking-tight">$150</span>
          <span className="text-sm text-slate-500 ml-2">/month</span>
        </div>
        <ul className="space-y-3 mb-8">
          {agentFeatures.map((feature) => (
            <FeatureItem key={feature} text={feature} />
          ))}
        </ul>
        <button
          onClick={onAgentClick}
          className="w-full rounded-lg border-2 border-slate-900 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
        >
          Subscribe &amp; Start
        </button>
      </div>
    </div>
  );
}
