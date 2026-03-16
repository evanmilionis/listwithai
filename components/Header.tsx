'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-navy-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="text-xl font-bold text-navy-800">
              List<span className="text-brand-accent">AI</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/homeowner"
              className="text-sm font-medium text-slate-600 hover:text-navy-800 transition-colors"
            >
              Homeowners
            </Link>
            <Link
              href="/agent"
              className="text-sm font-medium text-slate-600 hover:text-navy-800 transition-colors"
            >
              Agents
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-600 hover:text-navy-800 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/homeowner"
              className="inline-flex items-center justify-center px-4 py-2 bg-navy-800 text-white text-sm font-medium rounded-lg hover:bg-navy-900 transition-colors"
            >
              Get Started
            </Link>
          </nav>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-600"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4 space-y-3">
          <Link
            href="/homeowner"
            className="block text-sm font-medium text-slate-600 hover:text-navy-800"
            onClick={() => setMobileOpen(false)}
          >
            Homeowners
          </Link>
          <Link
            href="/agent"
            className="block text-sm font-medium text-slate-600 hover:text-navy-800"
            onClick={() => setMobileOpen(false)}
          >
            Agents
          </Link>
          <Link
            href="/dashboard"
            className="block text-sm font-medium text-slate-600 hover:text-navy-800"
            onClick={() => setMobileOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href="/homeowner"
            className="block w-full text-center px-4 py-2 bg-navy-800 text-white text-sm font-medium rounded-lg"
            onClick={() => setMobileOpen(false)}
          >
            Get Started
          </Link>
        </div>
      )}
    </header>
  );
}
