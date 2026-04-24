'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface Props {
  reportId: string;
}

export default function ShareListingBanner({ reportId }: Props) {
  const [copied, setCopied] = useState(false);

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/home/${reportId}`
    : `/home/${reportId}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard may fail in older browsers — no-op
    }
  }

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#0A0F1E] to-slate-900 border border-slate-800 p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">
            Your public listing page
          </p>
          <p className="text-white font-semibold text-sm sm:text-base">
            Share your property directly with buyers — no agent needed.
          </p>
          <p className="text-slate-400 text-xs mt-1">
            Inquiries go straight to your inbox.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg border border-white/10 transition-colors"
          >
            {copied ? (
              <>
                <Check size={14} />
                Copied
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy link
              </>
            )}
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[#0A0F1E] text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors"
          >
            View
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
