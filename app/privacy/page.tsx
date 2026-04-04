import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — ListAI',
  description: 'How ListAI collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-900 transition-colors mb-8 inline-block"
        >
          &larr; Back to ListAI
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: March 16, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Who We Are</h2>
            <p>
              ListAI (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the website{' '}
              <strong>listwithai.io</strong> and provides AI-powered home selling tools for
              homeowners and real estate agents. Our contact email is{' '}
              <a href="mailto:evangelos@univentureprop.com" className="text-blue-600 hover:underline">
                evangelos@univentureprop.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Information We Collect</h2>
            <p>We collect the following categories of information:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Property information</strong> — address, bedrooms, bathrooms, square footage,
                condition, asking price, target close date, improvements, and other details you
                provide through our intake form.
              </li>
              <li>
                <strong>Contact information</strong> — your name and email address.
              </li>
              <li>
                <strong>Payment information</strong> — processed securely by Stripe. We never
                store your credit card number, CVV, or full card details on our servers.
              </li>
              <li>
                <strong>Usage data</strong> — standard web analytics such as pages visited,
                browser type, and referring URL.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To generate your personalized AI home selling report.</li>
              <li>To process your payment through Stripe.</li>
              <li>To deliver your report via email.</li>
              <li>To provide customer support if you contact us.</li>
              <li>To improve our products and services.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Third-Party Services</h2>
            <p>We use the following third-party services that may process your data:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Stripe</strong> — payment processing (<a href="https://stripe.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Stripe Privacy Policy</a>)</li>
              <li><strong>Supabase</strong> — database and authentication</li>
              <li><strong>Anthropic (Claude AI)</strong> — AI report generation</li>
              <li><strong>Rentcast</strong> — property valuation and comparable sales data</li>
              <li><strong>Google Places API</strong> — nearby amenities data</li>
              <li><strong>Resend</strong> — email delivery</li>
              <li><strong>Vercel</strong> — website hosting</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Data Retention</h2>
            <p>
              We retain your report data and contact information for as long as needed to provide
              our services and for up to 24 months after your last interaction. Payment records
              are retained as required by applicable tax and financial regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Data Security</h2>
            <p>
              We implement industry-standard security measures including encrypted data
              transmission (HTTPS/TLS), secure payment processing via Stripe, and restricted
              access to personal data. However, no method of transmission over the Internet is
              100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Request access to the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data (subject to legal retention requirements).</li>
              <li>Opt out of marketing communications.</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, email us at{' '}
              <a href="mailto:evangelos@univentureprop.com" className="text-blue-600 hover:underline">
                evangelos@univentureprop.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Cookies</h2>
            <p>
              We use essential cookies required for the website to function (e.g., authentication
              sessions). We may also use analytics cookies to understand how visitors interact
              with our site. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Children&apos;s Privacy</h2>
            <p>
              ListAI is not intended for use by individuals under the age of 18. We do not
              knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of
              significant changes by posting the new policy on this page and updating the
              &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:{' '}
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
