import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy — ListAI',
  description: 'ListAI refund and cancellation policy for homeowner reports and agent subscriptions.',
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-900 transition-colors mb-8 inline-block"
        >
          &larr; Back to ListAI
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Refund Policy</h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: March 16, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Homeowner Reports ($500)</h2>
            <p>
              Because our AI reports are generated instantly upon payment and involve
              third-party API costs, we generally do not offer refunds for completed reports.
              However, we stand behind our product:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                <strong>Report failed to generate</strong> — If your report fails to generate
                or is missing sections due to a technical error on our end, we will either
                regenerate the report at no cost or issue a full refund.
              </li>
              <li>
                <strong>Incorrect property data</strong> — If you entered incorrect property
                information, contact us and we will work with you to regenerate the report with
                corrected data at no additional charge.
              </li>
              <li>
                <strong>Duplicate purchase</strong> — If you were accidentally charged twice for
                the same property, we will refund the duplicate charge immediately.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Agent Subscriptions ($150/month)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                You may cancel your subscription at any time from your dashboard or by
                contacting us.
              </li>
              <li>
                Cancellation takes effect at the end of your current billing period — you will
                retain access until then.
              </li>
              <li>
                We do not prorate partial months. No refunds are issued for the current billing
                period after cancellation.
              </li>
              <li>
                If you cancel within the first 7 days of your initial subscription and have not
                generated any reports, you may request a full refund.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">How to Request a Refund</h2>
            <p>
              Email us at{' '}
              <a href="mailto:evangelos@univentureprop.com" className="text-blue-600 hover:underline">
                evangelos@univentureprop.com
              </a>{' '}
              with your name, email address used at checkout, and the reason for your refund
              request. We aim to respond within 1-2 business days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Chargebacks</h2>
            <p>
              We encourage you to contact us directly before filing a chargeback with your bank
              or credit card company. We are committed to resolving issues fairly and quickly.
              Filing a chargeback without contacting us first may result in suspension of your
              account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Contact</h2>
            <p>
              Questions about our refund policy? Reach us at{' '}
              <a href="mailto:evangelos@univentureprop.com" className="text-blue-600 hover:underline">
                evangelos@univentureprop.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
