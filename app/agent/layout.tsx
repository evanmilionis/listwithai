import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Tools for Real Estate Agents — Unlimited CMA Reports',
  description:
    'Generate unlimited AI-powered CMA reports, social media content, buyer presentations, and open house materials. Built for real estate agents who want to close more deals.',
  alternates: {
    canonical: 'https://listwithai.io/agent',
  },
  openGraph: {
    title: 'AI Real Estate Agent Toolkit — Unlimited Reports | ListAI',
    description:
      'Unlimited AI CMA reports, listing copy, social media content, and client presentations for real estate agents.',
    url: 'https://listwithai.io/agent',
  },
};

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
