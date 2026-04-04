import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Analytics from "@/components/Analytics";
import CookieBanner from "@/components/CookieBanner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://listwithai.io"),
  title: {
    default: "ListAI — Sell Your Home Without an Agent | AI-Powered FSBO Toolkit",
    template: "%s | ListAI",
  },
  description:
    "Sell your home and keep the commission. ListAI gives you AI-powered pricing analysis, professional listing copy, a selling timeline, legal templates, and market data — all for just $100/mo. No agent needed.",
  keywords: [
    "FSBO",
    "sell home without agent",
    "for sale by owner",
    "sell my house",
    "FSBO toolkit",
    "AI real estate",
    "AI home selling",
    "flat fee MLS",
    "home pricing",
    "CMA",
    "sell home no commission",
    "real estate agent tools",
    "listing copy generator",
    "home value",
    "ListAI",
    "listwithai",
  ],
  authors: [{ name: "ListAI", url: "https://listwithai.io" }],
  creator: "ListAI",
  publisher: "ListAI",
  openGraph: {
    title: "ListAI — Sell Your Home. Keep the Commission.",
    description:
      "AI-powered pricing analysis, listing copy, selling timeline, and legal templates — all for just $100/mo. No agent commission.",
    url: "https://listwithai.io",
    siteName: "ListAI",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ListAI — AI-Powered Home Selling Toolkit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ListAI — Sell Your Home Without an Agent",
    description:
      "AI pricing, listing copy, timeline & legal docs for just $100/mo. Keep your commission.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://listwithai.io",
  },
};

// JSON-LD structured data for Google rich results
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ListAI",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://listwithai.io",
  description:
    "AI-powered home selling toolkit. Get pricing analysis, listing copy, selling timeline, and legal templates to sell your home without an agent.",
  offers: {
    "@type": "Offer",
    price: "100",
    priceCurrency: "USD",
    description: "Monthly subscription for a complete AI home selling toolkit",
  },
  aggregateRating: undefined, // Add when you have reviews
  provider: {
    "@type": "Organization",
    name: "ListAI",
    url: "https://listwithai.io",
  },
  areaServed: {
    "@type": "Country",
    name: "United States",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
        <CookieBanner />
        <Analytics />
        {/* Tidio live chat */}
        <script src="//code.tidio.co/6zzwdlmfpwkavqhkhrt81zt2rsqbensr.js" async />
      </body>
    </html>
  );
}
