'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ExitIntentPopupProps {
  /** Pre-fill the email field if we already have it from the form */
  email?: string;
}

const CALENDLY_URL = 'https://calendly.com/partnerships-bizzyu/listai-intro-call';
const SESSION_KEY = 'listai_exit_popup_shown';

export default function ExitIntentPopup({ email: initialEmail }: ExitIntentPopupProps) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState(initialEmail || '');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const showPopup = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    sessionStorage.setItem(SESSION_KEY, 'true');
    setVisible(true);
  }, []);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        showPopup();
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [showPopup]);

  const dismiss = () => setVisible(false);

  const handleSendInfo = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    setSubmitting(true);
    try {
      await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'exit_intent',
          form_step_reached: 0,
          notes: 'Captured via exit-intent popup — requested more info',
        }),
      });
      setSubmitted(true);
    } catch {
      // Silently fail
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 z-10">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {submitted ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              We&apos;ll be in touch!
            </h3>
            <p className="text-slate-600 text-sm">
              Check your inbox for more information about how ListAI can help you sell your home.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Not ready to commit?
              </h2>
              <p className="mt-2 text-slate-600">
                Book a free 10-minute call with our team to see if ListAI is right for you
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
              />

              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Book a Free Call
              </a>

              <button
                type="button"
                onClick={handleSendInfo}
                disabled={submitting || !email}
                className="block w-full text-center px-4 py-3 bg-white text-slate-900 font-semibold rounded-lg border-2 border-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending...' : 'Send Me More Info'}
              </button>
            </div>

            <button
              onClick={dismiss}
              className="block mx-auto mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors underline"
            >
              No thanks
            </button>
          </>
        )}
      </div>
    </div>
  );
}
