'use client';

import { useState } from 'react';
import { Link2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ImportData {
  property_address?: string;
  property_city?: string;
  property_state?: string;
  property_zip?: string;
  property_type?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  year_built?: number;
  lot_size?: number;
  asking_price?: number;
  hoa_monthly_amount?: number;
  home_features?: string;
  confidence?: 'high' | 'medium' | 'low';
}

interface Props {
  onImport: (data: ImportData) => void;
}

export default function UrlIngestBar({ onImport }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  async function handleImport() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setImported(false);

    try {
      const res = await fetch('/api/ingest/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || 'Failed to import listing');
      }

      onImport(body.data as ImportData);
      setImported(true);
      setTimeout(() => setImported(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import listing');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">
        <Link2 size={14} />
        Skip ahead
      </div>
      <p className="text-sm text-slate-700 mb-3">
        Already listed on Zillow, Redfin, or Realtor.com? Paste the URL to auto-fill this form.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleImport();
            }
          }}
          placeholder="https://www.zillow.com/homedetails/..."
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={loading}
        />
        <button
          type="button"
          onClick={handleImport}
          disabled={loading || !url.trim()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0A0F1E] text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Importing…
            </>
          ) : (
            <>Auto-fill</>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {imported && !error && (
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          <CheckCircle2 size={14} />
          <span>Listing imported — please review the fields below.</span>
        </div>
      )}
    </div>
  );
}
