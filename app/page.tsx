import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CommissionCalculator from '@/components/CommissionCalculator';
import {
  Clock,
  FileText,
  Home,
  PenTool,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Play,
  BarChart3,
  Gavel,
  Sparkles,
  MapPin,
  Shield,
} from 'lucide-react';

const faqs = [
  {
    q: 'Is this legal advice?',
    a: 'No. ListAI provides AI-generated informational templates and guidance only. All legal documents must be reviewed by a licensed real estate attorney before use. We include attorney referrals in every report.',
  },
  {
    q: 'What do I get for $100/mo?',
    a: 'A comprehensive AI report: selling timeline, improvement recommendations with ROI, data-driven pricing analysis, premium MLS listing copy, legal guidance, virtual staging, and real estate attorney referrals.',
  },
  {
    q: 'Do I still need to get on the MLS?',
    a: 'Yes — and we make it easy. Your report includes ready-to-use listing copy and we partner with flat-fee MLS services (Houzeo and ListWithFreedom) that get you listed for $99–$299.',
  },
  {
    q: 'How accurate is the pricing analysis?',
    a: "Our pricing analysis uses real comparable sales data from Rentcast, current market statistics, and AI analysis. It's based on the same data agents use for CMAs.",
  },
  {
    q: 'What states do you cover?',
    a: 'All 50 states. ListAI generates state-specific reports tailored to your local market, laws, and buyer demographics.',
  },
  {
    q: "What if I'm a real estate agent?",
    a: 'We offer an Agent plan at $150/month with unlimited report generation, a client dashboard, and professional CMA-style output. Perfect for scaling your listing presentations.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
};

const reportModules = [
  {
    icon: TrendingUp,
    label: 'Pricing Strategy',
    desc: 'AI-powered CMA using real comp sales and live market data — same inputs your agent uses.',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    icon: Clock,
    label: 'Selling Timeline',
    desc: 'Week-by-week action plan built around your property condition and local market timing.',
    color: 'text-violet-500',
    bg: 'bg-violet-50',
  },
  {
    icon: PenTool,
    label: 'Listing Copy',
    desc: 'MLS-ready descriptions targeting families, investors, or relocators — written to convert.',
    color: 'text-sky-500',
    bg: 'bg-sky-50',
  },
  {
    icon: Home,
    label: 'Improvement ROI',
    desc: 'Ranked upgrades by return on investment. Know exactly where every dollar counts.',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    icon: Gavel,
    label: 'Legal Guidance',
    desc: 'State-specific contracts, disclosure templates, and closing cost breakdowns.',
    color: 'text-rose-500',
    bg: 'bg-rose-50',
  },
  {
    icon: Sparkles,
    label: 'Virtual Staging',
    desc: 'AI-enhanced photos that show your home at its best before a single penny is spent.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
  {
    icon: BarChart3,
    label: 'Market Snapshot',
    desc: 'Live neighborhood stats, days-on-market, absorption rate, and buyer demand signals.',
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
  },
  {
    icon: MapPin,
    label: 'Attorney Referrals',
    desc: 'Vetted real estate attorneys near you, pre-filtered by rating and proximity.',
    color: 'text-teal-500',
    bg: 'bg-teal-50',
  },
  {
    icon: FileText,
    label: 'Buyer CMA',
    desc: 'Understand what buyers see when they run comps — and price one step ahead.',
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
];

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Header />
      <main>

        {/* ─── HERO ─── */}
        <section className="relative pt-28 pb-24 px-4 sm:px-6 lg:px-8 bg-[#0A0F1E] overflow-hidden">
          {/* grid texture */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
          {/* glow orbs */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[160px] opacity-10 pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-600 rounded-full blur-[160px] opacity-10 pointer-events-none" />

          <div className="relative max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/8 text-blue-300 text-xs font-medium mb-8 border border-white/10 backdrop-blur-sm">
              <Shield size={12} />
              All 50 states · Cancel anytime · $100/mo
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.08]">
              Sell Your Home.
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
                Keep the Commission.
              </span>
            </h1>

            <p className="mt-7 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              The AI toolkit that replaces your listing agent — pricing, copy,
              timeline, legal, and staging in one report delivered to your inbox.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/homeowner"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-white text-[#0A0F1E] text-base font-semibold rounded-2xl hover:bg-slate-100 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)]"
              >
                Start My Home Sale — $100/mo
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/agent"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-slate-300 text-base font-medium rounded-2xl hover:bg-white/6 hover:border-white/30 transition-all"
              >
                I&apos;m an Agent
              </Link>
            </div>

            <p className="mt-6 text-sm text-slate-500">
              Homeowners save an average of <span className="text-slate-300 font-medium">$15,000</span> in agent commissions
            </p>
          </div>

          {/* Stats strip */}
          <div className="relative mt-20 max-w-3xl mx-auto grid grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/10 bg-white/10">
            {[
              { value: '2,400+', label: 'Reports generated' },
              { value: '$15K', label: 'Avg. commission saved' },
              { value: '50', label: 'States covered' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 backdrop-blur-sm py-6 text-center">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── VIDEO SECTION ─── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">See It In Action</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              From form to full report in 3 minutes
            </h2>
            <p className="text-slate-500 mb-10 max-w-xl mx-auto">
              Watch a walkthrough of the complete FSBO toolkit — pricing, timeline, legal, and more.
            </p>
            <div className="relative rounded-3xl overflow-hidden bg-[#0A0F1E] aspect-video shadow-2xl shadow-slate-200 border border-slate-200">
              <video
                src="/demo.mp4"
                className="absolute inset-0 w-full h-full object-cover"
                controls
                playsInline
                preload="metadata"
                poster=""
              />
            </div>
          </div>
        </section>

        {/* ─── WHAT'S IN YOUR REPORT ─── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">The Report</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
                9 modules. One complete toolkit.
              </h2>
              <p className="mt-4 text-slate-500 max-w-xl mx-auto">
                Everything your listing agent would charge 3% for — delivered by AI in minutes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {reportModules.map((mod) => (
                <div
                  key={mod.label}
                  className="group p-6 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100/80 transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl ${mod.bg} flex items-center justify-center mb-4`}>
                    <mod.icon className={mod.color} size={20} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1.5">{mod.label}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{mod.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── COMMISSION CALCULATOR ─── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Do the Math</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
                Your agent is expensive.
              </h2>
              <p className="mt-3 text-slate-500">
                See exactly how much you can keep by selling FSBO with ListAI.
              </p>
            </div>
            <CommissionCalculator />
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Process</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
                From intake to listed in 3 steps
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* connector line */}
              <div className="hidden md:block absolute top-7 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-slate-200" />
              {[
                {
                  n: '01',
                  title: 'Fill Out Your Property Form',
                  desc: 'Takes 3 minutes. Tell us your address, bedrooms, condition, and goals.',
                },
                {
                  n: '02',
                  title: 'AI Generates Your Report',
                  desc: 'We pull live market data, run comps, and build your 9-module toolkit. Delivered in ~3 minutes.',
                },
                {
                  n: '03',
                  title: 'List, Sell, Keep the Cash',
                  desc: 'Use your report to price, stage, and list on the MLS for under $300. No agent required.',
                },
              ].map((step) => (
                <div key={step.n} className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#0A0F1E] text-white text-sm font-bold flex items-center justify-center mb-5 relative z-10 shadow-lg shadow-slate-200">
                    {step.n}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PRICING ─── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Pricing</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Simple, transparent pricing</h2>
              <p className="mt-3 text-slate-500">No hidden fees. No commissions taken. Cancel anytime.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Homeowner */}
              <div className="rounded-3xl bg-[#0A0F1E] p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600 rounded-full blur-[80px] opacity-10 pointer-events-none" />
                <div className="relative">
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-5">
                    Most Popular
                  </span>
                  <h3 className="text-xl font-bold text-white">Homeowner</h3>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold text-white">$100</span>
                    <span className="text-slate-400 text-sm">/month</span>
                  </div>
                  <p className="mt-3 text-slate-400 text-sm">
                    Everything you need to sell your home without an agent.
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {[
                      'Full 9-module AI report',
                      'Data-driven pricing analysis',
                      'MLS-ready listing copy',
                      'Virtual staging tool',
                      'State-specific legal guidance',
                      'Real estate attorney referrals',
                      'Improvement ROI guide',
                      'Cancel anytime',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                        <CheckCircle size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/homeowner"
                    className="mt-8 flex items-center justify-center gap-2 w-full py-3.5 bg-white text-[#0A0F1E] font-semibold rounded-xl hover:bg-slate-100 transition-colors text-sm"
                  >
                    Start My Home Sale
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>

              {/* Agent */}
              <div className="rounded-3xl bg-white border border-slate-200 p-8">
                <h3 className="text-xl font-bold text-slate-900 mt-6">Agent</h3>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold text-slate-900">$150</span>
                  <span className="text-slate-400 text-sm">/month</span>
                </div>
                <p className="mt-3 text-slate-500 text-sm">
                  Unlimited AI reports for licensed real estate agents.
                </p>
                <ul className="mt-6 space-y-2.5">
                  {[
                    'Unlimited report generation',
                    'Agent dashboard & history',
                    'Professional CMA output',
                    'Client presentation mode',
                    'Branded PDF exports',
                    'Negotiation talking points',
                    'Buyer CMA & open house kit',
                    'Cancel anytime',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <CheckCircle size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/agent"
                  className="mt-8 flex items-center justify-center gap-2 w-full py-3.5 border-2 border-[#0A0F1E] text-[#0A0F1E] font-semibold rounded-xl hover:bg-[#0A0F1E] hover:text-white transition-colors text-sm"
                >
                  Subscribe as Agent
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ─── TESTIMONIALS ─── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Reviews</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
                Homeowners who kept the commission
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  quote:
                    "The pricing report alone was worth it. I listed at exactly what the AI suggested and had 3 offers in a week. Saved $14,200 in agent fees.",
                  name: 'Marcus T.',
                  location: 'Tampa, FL',
                },
                {
                  quote:
                    "I was terrified to sell without an agent. The legal templates and step-by-step timeline made it completely manageable. Closed in 28 days.",
                  name: 'Sarah K.',
                  location: 'Austin, TX',
                },
                {
                  quote:
                    "The listing copy it wrote was better than anything I could have done. Got multiple showings the first weekend. $11,500 saved.",
                  name: 'David R.',
                  location: 'Denver, CO',
                },
              ].map((t) => (
                <div key={t.name} className="rounded-2xl border border-slate-100 p-7 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 fill-amber-400" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{t.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">FAQ</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Common questions</h2>
            </div>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.q} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <h3 className="font-semibold text-slate-900 mb-2 text-sm sm:text-base">{faq.q}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0A0F1E] relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600 rounded-full blur-[160px] opacity-8 pointer-events-none" />
          <div className="relative max-w-2xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              Your report is
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
                3 minutes away.
              </span>
            </h2>
            <p className="mt-5 text-slate-400 text-lg">
              Stop paying 3% for a service AI can replicate — better, faster, cheaper.
            </p>
            <Link
              href="/homeowner"
              className="mt-10 inline-flex items-center gap-2.5 px-10 py-4 bg-white text-[#0A0F1E] text-base font-semibold rounded-2xl hover:bg-slate-100 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)]"
            >
              Start My Home Sale — $100/mo
              <ArrowRight size={18} />
            </Link>
            <p className="mt-4 text-slate-500 text-sm">Cancel anytime. No long-term commitment.</p>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
