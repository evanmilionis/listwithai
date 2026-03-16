'use client';

import { useState, useEffect } from 'react';
import { grantAnalyticsConsent } from './Analytics';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('listai-cookie-consent');
    if (!consent) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('listai-cookie-consent', 'accepted');
    grantAnalyticsConsent();
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('listai-cookie-consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-xl shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="text-sm text-slate-600 flex-1">
          We use essential cookies to make our site work and analytics cookies to improve your
          experience. See our{' '}
          <a href="/privacy" className="text-blue-600 underline hover:text-blue-800">
            Privacy Policy
          </a>.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
