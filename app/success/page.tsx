'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CheckCircle, Mail, Clock, FileText, LayoutDashboard } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'homeowner';

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
              Your subscription is active. Check your email — we sent you a sign-in link to access your dashboard.
            </p>

            <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6 text-left space-y-4">
              <div className="flex gap-3">
                <Mail className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm font-medium text-navy-800">Check your email</p>
                  <p className="text-xs text-slate-500">We sent a sign-in link to the email you used at checkout.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <LayoutDashboard className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm font-medium text-navy-800">Access your dashboard</p>
                  <p className="text-xs text-slate-500">Click the link in your email to sign in and start creating reports.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <FileText className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm font-medium text-navy-800">9-module agent report</p>
                  <p className="text-xs text-slate-500">Pricing, timeline, listing copy, legal, social media, buyer CMA, open house kit, market snapshot, and virtual staging.</p>
                </div>
              </div>
            </div>

            <p className="mt-6 text-xs text-slate-500">
              Questions? Contact us at evangelos@univentureprop.com
            </p>
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
            You&apos;re all set!
          </h1>
          <p className="mt-4 text-slate-600">
            Your $100/mo subscription is confirmed. Your AI-powered selling report is being generated now.
          </p>

          <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6 text-left space-y-4">
            <div className="flex gap-3">
              <Clock className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-medium text-navy-800">Report generating now</p>
                <p className="text-xs text-slate-500">Takes about 2–3 minutes. We&apos;ll email you the moment it&apos;s ready.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Mail className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-medium text-navy-800">Email delivery</p>
                <p className="text-xs text-slate-500">Your report link will be sent to the email you used at checkout. Check your spam folder if you don&apos;t see it.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <FileText className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-medium text-navy-800">What&apos;s in your report</p>
                <p className="text-xs text-slate-500">Pricing strategy, selling timeline, listing copy, improvement recommendations, legal guidance, and more.</p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Questions? Contact us at evangelos@univentureprop.com
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
