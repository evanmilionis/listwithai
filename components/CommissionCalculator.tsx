'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const AGENT_COMMISSION = 0.03; // 3% listing agent
const LISTAI_COST = 100;
const FLAT_FEE_MLS = 200;

export default function CommissionCalculator() {
  const [homeValue, setHomeValue] = useState(400000);

  const commission = Math.round(homeValue * AGENT_COMMISSION);
  const saved = commission - LISTAI_COST - FLAT_FEE_MLS;
  const savedFormatted = saved.toLocaleString();
  const commissionFormatted = commission.toLocaleString();

  return (
    <div className="rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-100/80 p-8 sm:p-10">
      <div className="text-center mb-8">
        <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-2">Savings Calculator</p>
        <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
          How much will you save?
        </h3>
        <p className="text-slate-500 text-sm mt-2">Drag the slider to estimate your commission savings</p>
      </div>

      {/* Slider */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-slate-600">Your home value</label>
          <span className="text-xl font-bold text-slate-900">${homeValue.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={150000}
          max={2000000}
          step={10000}
          value={homeValue}
          onChange={(e) => setHomeValue(Number(e.target.value))}
          className="w-full h-2 rounded-full bg-slate-200 appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #0F172A ${((homeValue - 150000) / (2000000 - 150000)) * 100}%, #e2e8f0 ${((homeValue - 150000) / (2000000 - 150000)) * 100}%)`,
          }}
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1.5">
          <span>$150K</span>
          <span>$2M</span>
        </div>
      </div>

      {/* Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl bg-red-50 border border-red-100 p-5 text-center">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-1">With an Agent</p>
          <p className="text-2xl sm:text-3xl font-bold text-red-600">${commissionFormatted}</p>
          <p className="text-xs text-red-400 mt-1">3% commission lost</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 text-center">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">With ListAI</p>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600">$300</p>
          <p className="text-xs text-emerald-500 mt-1">$100/mo + ~$200 MLS</p>
        </div>
      </div>

      {/* Savings banner */}
      <div className="rounded-2xl bg-[#0A0F1E] p-5 text-center mb-6">
        <p className="text-slate-400 text-sm mb-1">You keep</p>
        <p className="text-4xl sm:text-5xl font-bold text-white">${savedFormatted}</p>
        <p className="text-blue-400 text-sm mt-1">in your pocket</p>
      </div>

      <Link
        href="/homeowner"
        className="flex items-center justify-center gap-2 w-full py-4 bg-[#0A0F1E] text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors text-sm"
      >
        Start My Home Sale — $100/mo
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
