import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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
  title: "ListAI — Sell Your Florida Home. Keep the Commission.",
  description:
    "AI-powered home selling toolkit for Florida homeowners and real estate agents. Get pricing analysis, listing copy, timeline, and legal templates for a flat $500.",
  keywords: [
    "FSBO Florida",
    "sell home without agent",
    "Florida real estate",
    "AI home selling",
    "flat fee MLS Florida",
    "ListAI",
  ],
  openGraph: {
    title: "ListAI — Sell Your Florida Home. Keep the Commission.",
    description:
      "The AI toolkit that handles pricing, listing copy, timeline, and contracts — for a flat $500.",
    url: "https://listwithai.io",
    siteName: "ListAI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
