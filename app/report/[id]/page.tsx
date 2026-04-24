'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ReportViewer from '@/components/ReportViewer';
import ShareListingBanner from '@/components/ShareListingBanner';
import PropertyPhotoManager from '@/components/PropertyPhotoManager';
import InquiriesPanel from '@/components/InquiriesPanel';
import SubscriptionControls from '@/components/SubscriptionControls';
import type { Report } from '@/types';

type AccessStatus = 'trialing' | 'active' | 'expired' | 'none';

type ReportWithAccess = Report & {
  access_status?: AccessStatus;
  cancel_at_period_end?: boolean;
  current_period_end?: string | null;
  can_reactivate?: boolean;
};

export default function ReportPage() {
  const params = useParams();
  const id = params.id as string;

  const [report, setReport] = useState<ReportWithAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gateUnlocked, setGateUnlocked] = useState(false);
  const [gateEmail, setGateEmail] = useState('');
  const [gateName, setGateName] = useState('');
  const [gateLoading, setGateLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!id) return;

    async function fetchReport() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/report/${id}`);
        if (res.status === 404) {
          setError('not_found');
          return;
        }
        if (!res.ok) {
          setError('fetch_error');
          return;
        }
        const data = await res.json();
        setReport(data);

        // Check if this viewer already unlocked this report
        const unlocked = sessionStorage.getItem(`report-unlocked-${id}`);
        // If it's a homeowner report (they paid for it), auto-unlock
        if (data.customer_type === 'homeowner') {
          setGateUnlocked(true);
        } else if (unlocked) {
          setGateUnlocked(true);
        }
      } catch {
        setError('fetch_error');
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [id, refreshTick]);

  const refresh = () => setRefreshTick((n) => n + 1);

  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gateEmail) return;

    setGateLoading(true);
    try {
      await fetch('/api/leads/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: gateEmail,
          name: gateName,
          reportId: id,
        }),
      });
    } catch {
      // Don't block access if lead capture fails
    }

    sessionStorage.setItem(`report-unlocked-${id}`, 'true');
    setGateUnlocked(true);
    setGateLoading(false);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-navy-800 tracking-tight">
              Your ListAI Report
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Your personalized home selling toolkit powered by AI
            </p>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-navy-800 animate-spin mb-4" />
              <p className="text-sm text-slate-500">Loading your report...</p>
            </div>
          )}

          {/* 404 state */}
          {!loading && error === 'not_found' && (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                <span className="text-2xl font-bold text-slate-400">404</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Report Not Found</h2>
              <p className="text-sm text-slate-500 max-w-md text-center">
                We could not find a report with this ID. Please check the link and try again.
              </p>
            </div>
          )}

          {/* Error state */}
          {!loading && error === 'fetch_error' && (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 mb-4">
                <span className="text-xl text-red-500 font-bold">!</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Something Went Wrong</h2>
              <p className="text-sm text-slate-500 max-w-md text-center">
                There was an error loading your report. Please try refreshing the page.
              </p>
            </div>
          )}

          {/* Lead capture gate for shared agent reports */}
          {!loading && !error && report && !gateUnlocked && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-blue-600">L</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    View Your Property Report
                  </h2>
                  <p className="text-sm text-slate-500 mt-2">
                    Enter your email to access the full AI-powered selling report
                    for <strong>{report.property_address}</strong>.
                  </p>
                </div>

                <form onSubmit={handleGateSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="gate-name" className="block text-sm font-medium text-slate-700 mb-1">
                      Your Name
                    </label>
                    <input
                      id="gate-name"
                      type="text"
                      value={gateName}
                      onChange={(e) => setGateName(e.target.value)}
                      placeholder="John Smith"
                      className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="gate-email" className="block text-sm font-medium text-slate-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="gate-email"
                      type="email"
                      required
                      value={gateEmail}
                      onChange={(e) => setGateEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={gateLoading || !gateEmail}
                    className="w-full py-2.5 px-4 bg-navy-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {gateLoading ? 'Loading...' : 'View Report'}
                  </button>
                  <p className="text-xs text-slate-400 text-center">
                    We&apos;ll never spam you. View our{' '}
                    <a href="/privacy" className="underline">Privacy Policy</a>.
                  </p>
                </form>
              </div>
            </div>
          )}

          {/* Subscription expired — lock full report behind resubscribe / reactivate gate */}
          {!loading && !error && report && gateUnlocked && report.access_status === 'expired' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 p-10 shadow-sm text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Your report is locked
                </h2>
                <p className="text-slate-500 mb-1 text-sm">
                  Your subscription ended. Reactivate to regain full access to your
                </p>
                <p className="text-slate-900 font-semibold mb-6 text-sm">
                  {report.property_address}, {report.property_city} report
                </p>
                <SubscriptionControls
                  reportId={id}
                  accessStatus="expired"
                  cancelAtPeriodEnd={false}
                  currentPeriodEnd={null}
                  canReactivate={!!report.can_reactivate}
                  onChange={refresh}
                />
                <p className="mt-4 text-xs text-slate-400">
                  Selling a home is a multi-month process — keep your tools on hand.
                </p>
              </div>
            </div>
          )}

          {/* Report content (full access: trialing, active, or sub hasn't loaded yet) */}
          {!loading && !error && report && gateUnlocked && report.access_status !== 'expired' && (
            <>
              {/* Trial / subscription status strip — shown in all active states */}
              {(report.access_status === 'trialing' || report.access_status === 'active') && (
                <div className="mb-6 space-y-2">
                  {report.cancel_at_period_end ? (
                    // Pending cancellation — offer to keep subscription
                    <SubscriptionControls
                      reportId={id}
                      accessStatus={report.access_status}
                      cancelAtPeriodEnd
                      currentPeriodEnd={report.current_period_end ?? null}
                      canReactivate={false}
                      onChange={refresh}
                    />
                  ) : report.access_status === 'trialing' ? (
                    // Active trial — banner + inline cancel button
                    <div className="flex items-center justify-between gap-4 px-5 py-3 rounded-xl bg-blue-50 border border-blue-100">
                      <div className="flex items-center gap-3 text-sm text-blue-900">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">i</span>
                        <span>
                          You&apos;re on the free trial.
                          {report.current_period_end ? (
                            <> Cancel before{' '}
                              <strong>
                                {new Date(report.current_period_end).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                              </strong>
                              {' '}to avoid the $100/mo charge.
                            </>
                          ) : ' Cancel before day 3 to avoid the $100/mo charge.'}
                        </span>
                      </div>
                      <SubscriptionControls
                        reportId={id}
                        accessStatus="trialing"
                        cancelAtPeriodEnd={false}
                        currentPeriodEnd={report.current_period_end ?? null}
                        canReactivate={false}
                        onChange={refresh}
                      />
                    </div>
                  ) : null}
                </div>
              )}
              {/* Public listing share link — surfaced for both homeowners and agents */}
              <ShareListingBanner reportId={id} />

              {/* Photo upload + inquiries — owner's workspace on the report page */}
              <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <PropertyPhotoManager reportId={id} />
                <InquiriesPanel reportId={id} />
              </div>

              <ReportViewer report={report} accessStatus={report.access_status} />

              {/* Account footer — gives homeowners a subtle cancel anchor when
                  the top strip isn't showing (e.g. access_status = 'none') */}
              {report.customer_type === 'homeowner' && (
                <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                  <p>
                    Need help? Email{' '}
                    <a href="mailto:hello@listwithai.io" className="text-blue-600 hover:text-blue-700">
                      hello@listwithai.io
                    </a>
                  </p>
                  {(report.access_status === 'active' || report.access_status === 'trialing') && !report.cancel_at_period_end && (
                    <SubscriptionControls
                      reportId={id}
                      accessStatus={report.access_status}
                      cancelAtPeriodEnd={false}
                      currentPeriodEnd={report.current_period_end ?? null}
                      canReactivate={false}
                      onChange={refresh}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
