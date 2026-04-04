'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="#0A0F1E"/>
              {/* House roofline */}
              <path d="M7 16L16 8L25 16" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              {/* House body */}
              <path d="M10 16V23H22V16" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              {/* Door */}
              <rect x="14" y="18" width="4" height="5" rx="1" fill="#3B82F6"/>
            </svg>
            <span className="text-lg font-bold text-[#0A0F1E] tracking-tight">
              List<span className="text-blue-500">AI</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/homeowner"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Homeowners
            </Link>
            <Link
              href="/agent"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Agents
            </Link>
            <Link
              href="/homeowner"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0A0F1E] text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors"
            >
              Get Started
              <ArrowRight size={14} />
            </Link>
          </nav>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-5 space-y-3">
          <Link
            href="/homeowner"
            className="block text-sm font-medium text-slate-600 hover:text-slate-900 py-1"
            onClick={() => setMobileOpen(false)}
          >
            Homeowners
          </Link>
          <Link
            href="/agent"
            className="block text-sm font-medium text-slate-600 hover:text-slate-900 py-1"
            onClick={() => setMobileOpen(false)}
          >
            Agents
          </Link>
          <Link
            href="/homeowner"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#0A0F1E] text-white text-sm font-medium rounded-xl mt-2"
            onClick={() => setMobileOpen(false)}
          >
            Get Started
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </header>
  );
}
