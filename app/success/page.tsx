'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createClient } from '@/lib/supabase';
import { CheckCircle, Mail, Clock, FileText, Send } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const type = searchParams.get('type') || 'homeowner';
  const prefillEmail = searchParams.get('email') || '';
  const [email, setEmail] = useState<string | null>(null);
  const [agentEmail, setAgentEmail] = useState(prefillEmail);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [magicLinkError, setMagicLinkError] = useState('');

  useEffect(() => {
    // Optionally fetch session details to show email
    if (sessionId) {
      setEmail(null); // Will be populated by webhook
    }
  }, [sessionId]);

  async function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!agentEmail) return;

    setMagicLinkLoading(true);
    setMagicLinkError('');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: agentEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMagicLinkError(error.message);
      } else {
        setMagicLinkSent(true);
      }
    } catch {
      setMagicLinkError('Something went wrong. Please try again.');
    } finally {
      setMagicLinkLoading(false);
    }
  }

  if (type === 'agent') {
    return (
      <>
        <Header />
        <main className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen bg-slate-50">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-navy-800">
              Welcome to ListAI Agent!
            </h1>
            <p className="mt-4 text-slate-600">
              Your subscription is active! Create your account to access the
              dashboard.
            </p>

            {/* Magic link sign-up form */}
            <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6 text-left">
              {magicLinkSent ? (
                <div className="text-center">
                  <Mail className="text-blue-600 mx-auto mb-3" size={32} />
                  <h3 className="font-semibold text-navy-800 mb-2">
                    Check your email!
                  </h3>
                  <p className="text-sm text-slate-600">
                    We sent a magic link to{' '}
                    <span className="font-medium">{agentEmail}</span>. Click the
                    link to sign in and access your dashboard.
                  </p>
                  <button
                    onClick={() => setMagicLinkSent(false)}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-semibold text-navy-800 mb-2">
                    Create your account
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Enter the email you used for payment. We&apos;ll send a
                    magic link to set up your account.
                  </p>
                  <form onSubmit={handleSendMagicLink} className="space-y-3">
                    <input
                      type="email"
                      value={agentEmail}
                      onChange={(e) => setAgentEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {magicLinkError && (
                      <p className="text-sm text-red-600">{magicLinkError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={magicLinkLoading || !agentEmail}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-navy-800 text-white font-semibold rounded-lg hover:bg-navy-900 transition-colors disabled:opacity-50 text-sm"
                    >
                      {magicLinkLoading ? (
                        'Sending...'
                      ) : (
                        <>
                          <Send size={16} />
                          Send Magic Link
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>

            <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6 text-left">
              <h3 className="font-semibold text-navy-800 mb-4">Next steps:</h3>
              <ul className="space-y-3">
                <li className="flex gap-3 text-sm text-slate-600">
                  <Mail className="text-blue-600 flex-shrink-0" size={18} />
                  Click the magic link in your email to sign in
                </li>
                <li className="flex gap-3 text-sm text-slate-600">
                  <FileText className="text-blue-600 flex-shrink-0" size={18} />
                  Create your first report from the dashboard
                </li>
              </ul>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen bg-slate-50">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-navy-800">
            Payment Successful!
          </h1>
          <p className="mt-4 text-slate-600">
            Your $500 payment has been received. We&apos;re generating your
            AI-powered selling report now.
          </p>

          <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6 text-left space-y-4">
            <div className="flex gap-3">
              <Clock className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-medium text-navy-800">
                  Report generating...
                </p>
                <p className="text-xs text-slate-500">
                  This typically takes 2-5 minutes
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Mail className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-medium text-navy-800">
                  Email delivery
                </p>
                <p className="text-xs text-slate-500">
                  {email
                    ? `We'll send your report link to ${email}`
                    : "We'll email your report link when it's ready"}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <FileText
                className="text-blue-600 flex-shrink-0 mt-0.5"
                size={18}
              />
              <div>
                <p className="text-sm font-medium text-navy-800">
                  5-module report
                </p>
                <p className="text-xs text-slate-500">
                  Timeline, pricing, listing copy, improvements, legal templates
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Questions? Contact us at hello@listwithai.io
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-navy-800 animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
