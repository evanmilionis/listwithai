'use client';

import { cn } from '@/lib/utils';
import { Phone, Globe, BadgeCheck, DollarSign } from 'lucide-react';
import type { Attorney, AttorneyRegion } from '@/types';
import attorneysData from '@/data/attorneys.json';

interface AttorneyCardsProps {
  city: string;
  className?: string;
}

const regions = attorneysData as unknown as Record<string, AttorneyRegion>;

function findRegionForCity(city: string): string | null {
  const normalized = city.trim().toLowerCase();
  for (const [regionKey, region] of Object.entries(regions)) {
    if (regionKey === '_note' || regionKey === 'other_florida') continue;
    if (!region.cities) continue;
    if (region.cities.some((c) => c.toLowerCase() === normalized)) {
      return regionKey;
    }
  }
  return null;
}

function AttorneyCard({ attorney }: { attorney: Attorney }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-base font-semibold text-slate-900 leading-snug">
          {attorney.name}
        </h3>
        <span className="inline-flex items-center gap-1 flex-shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
          <BadgeCheck className="h-3 w-3" />
          {attorney.specialty}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Phone className="h-4 w-4 text-slate-400" />
          <a
            href={`tel:${attorney.phone.replace(/[^0-9+]/g, '')}`}
            className="hover:text-slate-900 transition-colors"
          >
            {attorney.phone}
          </a>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Globe className="h-4 w-4 text-slate-400" />
          <a
            href={attorney.website}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-900 underline underline-offset-2 transition-colors truncate"
          >
            {attorney.website.replace(/^https?:\/\/(www\.)?/, '')}
          </a>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <DollarSign className="h-4 w-4 text-slate-400" />
          <span>Avg. contract review: {attorney.avg_review_cost}</span>
        </div>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
        {attorney.note}
      </p>
    </div>
  );
}

export default function AttorneyCards({ city, className }: AttorneyCardsProps) {
  const regionKey = findRegionForCity(city);
  const matchedRegion = regionKey ? regions[regionKey] : null;
  const fallback = regions['other_florida'];

  const attorneys = matchedRegion ? matchedRegion.attorneys : [];
  const fallbackAttorneys = fallback ? fallback.attorneys : [];

  return (
    <div className={cn('space-y-6', className)}>
      {attorneys.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            Attorneys Near {city}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attorneys.map((attorney) => (
              <AttorneyCard key={attorney.name} attorney={attorney} />
            ))}
          </div>
        </div>
      )}

      {fallbackAttorneys.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            {attorneys.length > 0 ? 'Statewide Resources' : 'Florida Attorney Referral'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fallbackAttorneys.map((attorney) => (
              <AttorneyCard key={attorney.name} attorney={attorney} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
