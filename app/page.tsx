import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Clock,
  DollarSign,
  FileText,
  Home,
  PenTool,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Star,
} from 'lucide-react';

const features = [
  {
    icon: Clock,
    title: 'Custom Selling Timeline',
    description:
      'Week-by-week action plan tailored to your property, condition, and Florida market timing.',
  },
  {
    icon: TrendingUp,
    title: 'Data-Driven Pricing',
    description:
      'AI-powered CMA using real comparable sales, market trends, and neighborhood data.',
  },
  {
    icon: PenTool,
    title: 'Premium Listing Copy',
    description:
      'MLS-ready descriptions that target the right Florida buyers — snowbirds, families, or investors.',
  },
  {
    icon: Home,
    title: 'Improvement ROI Guide',
    description:
      'Prioritized upgrades ranked by return on investment. Know exactly where every dollar counts.',
  },
  {
    icon: FileText,
    title: 'Legal Document Templates',
    description:
      'Florida AS-IS contract, seller disclosure, and counter-offer templates with plain-English explanations.',
  },
];

const steps = [
  {
    number: '1',
    title: 'Tell Us About Your Home',
    description:
      'Fill out our simple intake form with your property details, condition, and target price.',
  },
  {
    number: '2',
    title: 'AI Builds Your Report',
    description:
      'We pull real market data, run comps, and generate your personalized 5-module selling toolkit.',
  },
  {
    number: '3',
    title: 'Sell With Confidence',
    description:
      'Use your report to price, list, and negotiate. Get on the MLS for under $300 with our partners.',
  },
];

const faqs = [
  {
    q: 'Is this legal advice?',
    a: 'No. ListAI provides AI-generated informational templates and guidance only. All legal documents must be reviewed by a licensed Florida real estate attorney before use. We include attorney referrals in every report.',
  },
  {
    q: 'What do I get for $500?',
    a: 'A comprehensive 5-module report: selling timeline, improvement recommendations with ROI, data-driven pricing analysis, premium MLS listing copy, and Florida legal document templates with attorney referrals.',
  },
  {
    q: 'Do I still need to get on the MLS?',
    a: 'Yes — and we make it easy. Your report includes ready-to-use listing copy and we partner with flat-fee MLS services (Houzeo and ListWithFreedom) that get you listed for $99-$299.',
  },
  {
    q: 'How accurate is the pricing analysis?',
    a: "Our pricing analysis uses real comparable sales data from Rentcast, current market statistics, and AI analysis. It's based on the same data agents use for CMAs, but you should always validate with local market knowledge.",
  },
  {
    q: 'Is this only for Florida?',
    a: 'Yes. ListAI is built specifically for the Florida real estate market, with Florida-specific legal templates, market insights, and seasonal buyer analysis.',
  },
  {
    q: "What if I'm a real estate agent?",
    a: 'We offer an Agent plan at $150/month with unlimited report generation, a client dashboard, and professional CMA-style output. Perfect for scaling your listing presentations.',
  },
];

export default function LandingPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full blur-[120px]" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500 rounded-full blur-[120px]" />
          </div>
          <div className="relative max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-300 text-sm mb-6 border border-white/10">
              <Star size={14} />
              <span>As featured in NBC Miami</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
              Sell Your Florida Home.
              <br />
              <span className="text-blue-400">Keep the Commission.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              The AI toolkit that handles pricing, listing copy, timeline, and
              contracts — for a flat $500. No realtor needed.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/homeowner"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-navy-800 text-lg font-semibold rounded-xl hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl"
              >
                Start My Home Sale — $500
                <ArrowRight size={20} />
              </Link>
              <Link
                href="/agent"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white/30 text-white text-lg font-semibold rounded-xl hover:bg-white/10 transition-all"
              >
                I&apos;m an Agent
                <ArrowRight size={20} />
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-400">
              Florida homeowners have saved an average of $15,000 in agent
              commissions
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-navy-800">
                Everything You Need to Sell FSBO
              </h2>
              <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
                Five AI-powered modules backed by real market data, delivered in
                one comprehensive report.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                    <feature.icon className="text-blue-600" size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-navy-800 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-navy-800 to-navy-900 text-white flex flex-col justify-center">
                <DollarSign className="text-blue-400 mb-4" size={32} />
                <h3 className="text-lg font-semibold mb-2">
                  Save $15,000+ in Commissions
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  The average Florida listing agent commission is 2.5-3%. On a
                  $350K home, that&apos;s $8,750-$10,500 — gone. Keep it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-navy-800">
                How It Works
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                From intake to listed in three simple steps.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step) => (
                <div key={step.number} className="text-center">
                  <div className="w-14 h-14 rounded-full bg-navy-800 text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-semibold text-navy-800 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-navy-800">
                Simple, Transparent Pricing
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Homeowner */}
              <div className="rounded-2xl border-2 border-navy-800 p-8 relative">
                <div className="absolute -top-3 left-8 px-3 py-1 bg-navy-800 text-white text-xs font-semibold rounded-full">
                  MOST POPULAR
                </div>
                <h3 className="text-xl font-bold text-navy-800">Homeowner</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-navy-800">$500</span>
                  <span className="text-slate-500">one-time</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Everything you need to sell your Florida home without an agent.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    'Custom selling timeline',
                    'Data-driven pricing analysis',
                    'Premium MLS listing copy',
                    'Improvement ROI guide',
                    'FL legal document templates',
                    'Attorney referrals by region',
                    'MLS partner access ($99-299)',
                    'Post-sale email support',
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
                <Link
                  href="/homeowner"
                  className="mt-8 block w-full text-center px-6 py-3 bg-navy-800 text-white font-semibold rounded-xl hover:bg-navy-900 transition-colors"
                >
                  Start My Home Sale
                </Link>
              </div>

              {/* Agent */}
              <div className="rounded-2xl border border-slate-200 p-8">
                <h3 className="text-xl font-bold text-navy-800">Agent</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-navy-800">$150</span>
                  <span className="text-slate-500">/month</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Unlimited AI reports for licensed Florida real estate agents.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    'Unlimited report generation',
                    'Agent dashboard & history',
                    'Professional CMA output',
                    'Client presentation mode',
                    'Branded PDF exports',
                    'Negotiation talking points',
                    'Priority data processing',
                    'Cancel anytime',
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
                <Link
                  href="/agent"
                  className="mt-8 block w-full text-center px-6 py-3 border-2 border-navy-800 text-navy-800 font-semibold rounded-xl hover:bg-navy-800 hover:text-white transition-colors"
                >
                  Subscribe & Start
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy-800 text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {faqs.map((faq) => (
                <div
                  key={faq.q}
                  className="bg-white rounded-xl p-6 border border-slate-200"
                >
                  <h3 className="font-semibold text-navy-800 mb-2">{faq.q}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-navy-800">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Ready to Sell Your Florida Home?
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              Get your AI-powered selling toolkit in minutes. No agent needed.
            </p>
            <Link
              href="/homeowner"
              className="mt-8 inline-flex items-center gap-2 px-8 py-4 bg-white text-navy-800 text-lg font-semibold rounded-xl hover:bg-slate-100 transition-all"
            >
              Start My Home Sale — $500
              <ArrowRight size={20} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
