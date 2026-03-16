import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sell Your Florida Home Without an Agent — FSBO Toolkit',
  description:
    'Get your personalized AI home selling report: data-driven pricing, professional listing copy, week-by-week timeline, improvement ROI, and Florida legal templates. Flat $500 — no agent commission.',
  alternates: {
    canonical: 'https://listwithai.io/homeowner',
  },
  openGraph: {
    title: 'Sell Your Florida Home — AI-Powered FSBO Toolkit | ListAI',
    description:
      'Everything you need to sell your Florida home yourself. AI pricing analysis, listing copy, legal docs, and more for $500.',
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
