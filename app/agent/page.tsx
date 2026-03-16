'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createClient } from '@/lib/supabase';
import { CheckCircle, ArrowRight, Zap, BarChart3, Users, FileText, Mail, Send } from 'lucide-react';

const agentFeatures = [
  {
    icon: Zap,
    title: 'Unlimited AI Reports',
    description: 'Generate as many reports as you need. No per-report fees.',
  },
  {
    icon: BarChart3,
    title: 'Professional CMA Output',
    description: 'Institutional-grade analysis with data-driven pricing guidance.',
  },
  {
    icon: Users,
    title: 'Client Presentation Mode',
    description: 'Clean, branded PDFs ready to share with your clients.',
  },
  {
    icon: FileText,
    title: 'Negotiation Talking Points',
    description: 'AI-generated strategies tailored to each property and market.',
  },
];

export default function AgentPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [signInEmail, setSignInEmail] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInSent, setSignInSent] = useState(false);
  const [signInError, setSignInError] = useState('');

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!signInEmail) return;

    setSignInLoading(true);
    setSignInError('');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: signInEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setSignInError(error.message);
      } else {
        setSignInSent(true);
      }
    } catch {
      setSignInError('Something went wrong. Please try again.');
    } finally {
      setSignInLoading(false);
    }
  }

  async function handleSubscribe() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_type: 'agent' }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      window.location.href = result.url;
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 min-h-screen">
        {/* Hero */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm mb-6">
              For Licensed Florida Agents
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-800 tracking-tight">
              Work Faster. List Smarter.
            </h1>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Generate AI-powered listing reports in minutes. Pricing analysis,
              listing copy, improvement guides, and negotiation talking points —
              unlimited.
            </p>
          </div>
        </section>

        {/* Features grid */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16 bg-slate-50 py-16">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {agentFeatures.map((f) => (
                <div
                  key={f.title}
                  className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <f.icon className="text-blue-600 mb-3" size={28} />
                  <h3 className="text-lg font-semibold text-navy-800 mb-1">
                    {f.title}
                  </h3>
                  <p className="text-sm text-slate-600">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing CTA */}
        <section className="px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl border-2 border-navy-800 p-8 text-center">
              <h2 className="text-2xl font-bold text-navy-800">Agent Plan</h2>
              <div className="mt-4 flex items-baseline gap-1 justify-center">
                <span className="text-5xl font-bold text-navy-800">$150</span>
                <span className="text-slate-500 text-lg">/month</span>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Cancel anytime. No long-term commitment.
              </p>
              <ul className="mt-6 space-y-3 text-left">
                {[
                  'Unlimited AI report generation',
                  'Agent dashboard with report history',
                  'Professional CMA-style output',
                  'Client presentation PDF export',
                  'Negotiation talking points module',
                  'Priority data processing',
                  'Magic link login — no passwords',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <CheckCircle
                      size={18}
                      className="text-green-500 flex-shrink-0 mt-0.5"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className="mt-8 w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-navy-800 text-white font-semibold rounded-xl hover:bg-navy-900 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Redirecting...' : 'Subscribe & Start'}
                {!isLoading && <ArrowRight size={18} />}
              </button>
              <p className="mt-4 text-xs text-slate-500">
                You&apos;ll be redirected to Stripe for secure payment. After
                subscribing, you&apos;ll receive a magic link to access your
                dashboard.
              </p>
            </div>
          </div>
        </section>

        {/* Already subscribed? Sign in */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
              <Mail className="text-blue-600 mx-auto mb-3" size={24} />
              <h3 className="text-lg font-semibold text-navy-800 mb-1">
                Already subscribed?
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Sign in with your magic link to access the dashboard.
              </p>

              {signInSent ? (
                <div>
                  <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
                    Magic link sent to{' '}
                    <span className="font-medium">{signInEmail}</span>. Check
                    your email and click the link to sign in.
                  </p>
                  <button
                    onClick={() => setSignInSent(false)}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-3">
                  <input
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {signInError && (
                    <p className="text-sm text-red-600">{signInError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={signInLoading || !signInEmail}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm"
                  >
                    {signInLoading ? (
                      'Sending...'
                    ) : (
                      <>
                        <Send size={16} />
                        Send Magic Link
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
