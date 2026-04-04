import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy — ListAI',
  description: 'ListAI refund and cancellation policy.',
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
        <p className="text-sm text-slate-500 mb-10">Last updated: April 4, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <p className="text-blue-900 text-sm leading-relaxed">
              <strong>Summary:</strong> Subscriptions can be cancelled anytime. We do not offer refunds
              for partial months or previously generated reports, as AI generation consumes computational
              resources at the time of generation. If you experienced a technical failure, contact us and
              we will make it right.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Subscription Cancellation</h2>
            <p>
              You may cancel your ListAI subscription at any time through your dashboard or by
              emailing{' '}
              <a href="mailto:hello@listwithai.io" className="text-blue-600 hover:underline">
                hello@listwithai.io
              </a>. Cancellation takes effect at the end of your current billing period. You will
              retain access to your dashboard and generated reports until the period ends.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">No Partial-Month Refunds</h2>
            <p>
              We do not issue refunds for partial subscription months. If you cancel mid-month, you
              will continue to have access until the end of the billing period, after which your
              subscription will not renew.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Report Generation</h2>
            <p>
              AI report generation requires significant computational resources that are consumed at
              the time of generation. For this reason, <strong>completed reports are non-refundable</strong>,
              regardless of whether you are satisfied with the output. We encourage you to review the
              product description carefully before purchasing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Technical Failures</h2>
            <p>
              If your report failed to generate due to a technical error on our end (e.g., never arrived,
              incomplete, or corrupted), we will either regenerate it at no additional charge or issue a
              full refund at our discretion. Contact us within 7 days of your purchase at{' '}
              <a href="mailto:hello@listwithai.io" className="text-blue-600 hover:underline">
                hello@listwithai.io
              </a>{' '}
              with your order details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Chargebacks</h2>
            <p>
              If you initiate a chargeback without first contacting us, we reserve the right to dispute
              it and provide all transaction and delivery records to your financial institution. Please
              reach out before escalating — we always prefer to resolve issues directly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Contact</h2>
            <p>
              For refund requests or billing questions:{' '}
              <a href="mailto:hello@listwithai.io" className="text-blue-600 hover:underline">
                hello@listwithai.io
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
