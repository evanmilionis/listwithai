import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sell Your Home Without an Agent — FSBO Toolkit',
  description:
    'Get your personalized AI home selling report: data-driven pricing, professional listing copy, week-by-week timeline, improvement ROI, and state-specific legal guidance. Start free — 3-day trial, then $100/mo. No agent commission.',
  alternates: {
    canonical: 'https://listwithai.io/homeowner',
  },
  openGraph: {
    title: 'Sell Your Home — AI-Powered FSBO Toolkit | ListAI',
    description:
      'Everything you need to sell your home yourself. AI pricing analysis, listing copy, legal docs, and more. Free 3-day trial, then $100/mo.',
    url: 'https://listwithai.io/homeowner',
  },
};

export default function HomeownerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
