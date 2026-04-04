'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Globe, Star, MapPin, Loader2 } from 'lucide-react';

interface Attorney {
  name: string;
  address: string;
  rating?: number;
  total_ratings?: number;
  maps_url: string;
}

interface AttorneyCardsProps {
  city: string;
  state: string;
  className?: string;
}

function AttorneyCard({ attorney }: { attorney: Attorney }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-slate-900 leading-snug mb-1">
          {attorney.name}
        </h3>
        {attorney.rating && (
          <div className="flex items-center gap-1 text-sm text-amber-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
            <span className="font-medium">{attorney.rating.toFixed(1)}</span>
            {attorney.total_ratings && (
              <span className="text-slate-400 text-xs">({attorney.total_ratings})</span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-start gap-2 text-sm text-slate-600">
          <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
          <span className="leading-snug">{attorney.address}</span>
        </div>
      </div>

      <a
        href={attorney.maps_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
      >
        <Globe className="h-3.5 w-3.5" />
        View on Google Maps
      </a>
    </div>
  );
}

export default function AttorneyCards({ city, state, className }: AttorneyCardsProps) {
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttorneys = async () => {
      try {
        const res = await fetch(
          `/api/attorneys/search?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`
        );
        const data = await res.json();
        setAttorneys(data.attorneys ?? []);
      } catch {
        setAttorneys([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttorneys();
  }, [city, state]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (attorneys.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">
          No attorneys found nearby. Try searching Google for &quot;real estate attorney {city} {state}&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
        Attorneys Near {city}, {state}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {attorneys.map((attorney) => (
          <AttorneyCard key={attorney.name} attorney={attorney} />
        ))}
      </div>
    </div>
  );
}
