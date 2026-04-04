'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';

export default function HomeownerLoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback/homeowner`,
        },
      });

      if (otpError) throw otpError;
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#0A0F1E"/>
          <path d="M7 16L16 8L25 16" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 16V23H22V16" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="14" y="18" width="4" height="5" rx="1" fill="#3B82F6"/>
        </svg>
        <span className="text-lg font-bold text-[#0A0F1E]">List<span className="text-blue-500">AI</span></span>
      </Link>

      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="text-emerald-500" size={28} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Check your inbox</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              We sent a sign-in link to <span className="font-medium text-slate-700">{email}</span>.
              Click it to access your report. Check your spam folder if you don&apos;t see it.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(''); }}
              className="mt-6 text-sm text-slate-400 hover:text-slate-600 transition-colors underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-7">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Your Report</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Enter the email you used when you purchased. We&apos;ll send you a link to access your dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#0A0F1E] text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? 'Sending...' : 'Send My Access Link'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-400">
              Don&apos;t have an account?{' '}
              <Link href="/homeowner" className="text-blue-600 hover:underline">
                Get your report
              </Link>
            </p>
          </>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Need help? Email{' '}
        <a href="mailto:evangelos@univentureprop.com" className="underline hover:text-slate-600">
          evangelos@univentureprop.com
        </a>
      </p>
    </div>
  );
}
