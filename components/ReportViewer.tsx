'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency, getConditionLabel } from '@/lib/utils';
import type { Report } from '@/types';
import Disclaimer from '@/components/Disclaimer';
import MLSReferral from '@/components/MLSReferral';
import AttorneyCards from '@/components/AttorneyCards';
import {
  Copy,
  Download,
  Share2,
  ChevronDown,
  ChevronRight,
  Calendar,
  DollarSign,
  Home,
  FileText,
  Scale,
  MapPin,
  Users,
  Clock,
  Star,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Wrench,
} from 'lucide-react';

interface ReportViewerProps {
  report: Report;
  agentMode?: boolean;
}

const TABS = [
  { key: 'summary', label: 'Summary', icon: Home },
  { key: 'timeline', label: 'Timeline', icon: Calendar },
  { key: 'improvements', label: 'Improvements', icon: Wrench },
  { key: 'pricing', label: 'Pricing', icon: DollarSign },
  { key: 'listing', label: 'Listing Copy', icon: FileText },
  { key: 'legal', label: 'Legal', icon: Scale },
  { key: 'mls', label: 'MLS', icon: MapPin },
  { key: 'attorneys', label: 'Attorneys', icon: Users },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function StatusBadge({ status }: { status: Report['status'] }) {
  const styles: Record<Report['status'], string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    complete: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium capitalize',
        styles[status]
      )}
    >
      {status === 'processing' && (
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
      )}
      {status === 'complete' && <CheckCircle className="h-3 w-3" />}
      {status === 'failed' && <AlertTriangle className="h-3 w-3" />}
      {status}
    </span>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
    >
      <Copy className="h-3 w-3" />
      {copied ? 'Copied!' : label || 'Copy'}
    </button>
  );
}

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-red-50 text-red-700 border-red-200',
    medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    low: 'bg-green-50 text-green-700 border-green-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        styles[priority]
      )}
    >
      {priority}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Property Summary                                              */
/* ------------------------------------------------------------------ */
function PropertySummary({ report }: { report: Report }) {
  const rc = report.rentcast_data;
  const prop = rc?.property;
  return (
    <div className="space-y-6">
      {/* Address & specs */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-navy-800 mb-4 flex items-center gap-2">
          <Home className="h-5 w-5 text-slate-400" />
          Property Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoItem label="Address" value={report.property_address} />
          <InfoItem label="City" value={`${report.property_city}, ${report.property_state} ${report.property_zip}`} />
          <InfoItem label="Bedrooms" value={String(report.beds)} />
          <InfoItem label="Bathrooms" value={String(report.baths)} />
          <InfoItem label="Square Footage" value={report.sqft.toLocaleString()} />
          <InfoItem label="Condition" value={getConditionLabel(report.condition_score)} />
          <InfoItem label="Asking Price" value={formatCurrency(report.asking_price)} />
          <InfoItem label="Target Close" value={report.target_close_date} />
          <InfoItem label="Customer Type" value={report.customer_type === 'homeowner' ? 'Homeowner' : 'Agent'} />
        </div>
      </div>

      {/* Rentcast confirmed data */}
      {prop && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-navy-800 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            Confirmed Property Details (via Public Records)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prop.bedrooms != null && <InfoItem label="Bedrooms" value={String(prop.bedrooms)} />}
            {prop.bathrooms != null && <InfoItem label="Bathrooms" value={String(prop.bathrooms)} />}
            {prop.squareFootage != null && <InfoItem label="Sq Ft" value={prop.squareFootage.toLocaleString()} />}
            {prop.yearBuilt != null && <InfoItem label="Year Built" value={String(prop.yearBuilt)} />}
            {prop.lotSize != null && <InfoItem label="Lot Size" value={`${prop.lotSize.toLocaleString()} sq ft`} />}
            {prop.propertyType && <InfoItem label="Property Type" value={prop.propertyType} />}
            {prop.county && <InfoItem label="County" value={prop.county} />}
            {prop.taxAssessedValue != null && (
              <InfoItem label="Tax Assessed Value" value={formatCurrency(prop.taxAssessedValue)} />
            )}
          </div>

          {(prop.lastSalePrice != null || prop.lastSaleDate) && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Last Sale Info</h4>
              <div className="flex gap-6">
                {prop.lastSalePrice != null && (
                  <InfoItem label="Sale Price" value={formatCurrency(prop.lastSalePrice)} />
                )}
                {prop.lastSaleDate && <InfoItem label="Sale Date" value={prop.lastSaleDate} />}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Selling Timeline                                              */
/* ------------------------------------------------------------------ */
function SellingTimeline({ report }: { report: Report }) {
  const tl = report.report_output?.timeline;
  if (!tl) return <EmptyTab message="Timeline data is not yet available." />;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-navy-800 mb-3">Timeline Overview</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{tl.timeline_summary}</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500 font-medium">Recommended List Date</p>
            <p className="text-sm font-semibold text-slate-900">{tl.recommended_list_date}</p>
            <p className="text-xs text-slate-500 mt-0.5">{tl.recommended_list_day}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500 font-medium">Estimated Close</p>
            <p className="text-sm font-semibold text-slate-900">{tl.estimated_close_date}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500 font-medium">Total Weeks</p>
            <p className="text-sm font-semibold text-slate-900">{tl.weeks.length} weeks</p>
          </div>
        </div>
      </div>

      {/* Week-by-week */}
      <div className="space-y-4">
        {tl.weeks.map((week) => (
          <div
            key={week.week_number}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">
                {week.week_number}
              </span>
              <h4 className="text-sm font-semibold text-slate-900">{week.label}</h4>
            </div>
            <ul className="space-y-2">
              {week.tasks.map((task, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-lg bg-slate-50 p-3"
                >
                  <PriorityBadge priority={task.priority} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{task.task}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {task.estimated_hours}h
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Florida tips */}
      {tl.florida_specific_tips.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-navy-800 uppercase tracking-wide">
            Florida-Specific Tips
          </h3>
          {tl.florida_specific_tips.map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4"
            >
              <Star className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900">{tip}</p>
            </div>
          ))}
        </div>
      )}

      {/* Seasonal note */}
      {tl.seasonal_note && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 flex items-start gap-3">
          <Calendar className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-900">{tl.seasonal_note}</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Improvement Recommendations                                   */
/* ------------------------------------------------------------------ */
function ImprovementRecommendations({ report }: { report: Report }) {
  const imp = report.report_output?.improvements;
  if (!imp) return <EmptyTab message="Improvement data is not yet available." />;

  const sorted = [...imp.recommendations].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-navy-800 mb-2">Investment Summary</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">{imp.summary}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
            <p className="text-xs font-medium text-emerald-700">Total Estimated Investment</p>
            <p className="text-xl font-bold text-emerald-900 mt-1">{imp.total_estimated_investment}</p>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
            <p className="text-xs font-medium text-blue-700">Potential Value Increase</p>
            <p className="text-xl font-bold text-blue-900 mt-1">{imp.potential_value_increase}</p>
          </div>
        </div>
      </div>

      {/* Recommendation cards */}
      <div className="space-y-4">
        {sorted.map((rec, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  {rec.priority}
                </span>
                <h4 className="text-sm font-semibold text-slate-900">{rec.area}</h4>
              </div>
              {rec.diy_friendly && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                  <Wrench className="h-3 w-3" />
                  DIY Friendly
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">{rec.recommendation}</p>
            <p className="text-xs text-slate-500 mb-3">{rec.why}</p>
            <div className="flex flex-wrap gap-3">
              <Chip label="Cost" value={rec.estimated_cost} />
              <Chip label="ROI" value={rec.estimated_roi} />
              <Chip label="Time" value={rec.time_to_complete} />
            </div>
          </div>
        ))}
      </div>

      {/* Things to avoid */}
      {imp.things_to_avoid.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Things to Avoid
          </h3>
          {imp.things_to_avoid.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4"
            >
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-900">{item}</p>
            </div>
          ))}
        </div>
      )}

      {/* Florida staging tips */}
      {imp.florida_staging_tips.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-navy-800 uppercase tracking-wide">
            Florida Staging Tips
          </h3>
          {imp.florida_staging_tips.map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4"
            >
              <Star className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900">{tip}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 border border-slate-200 px-2.5 py-1 text-xs text-slate-700">
      <span className="font-medium text-slate-500">{label}:</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Pricing Analysis                                              */
/* ------------------------------------------------------------------ */
function PricingAnalysis({ report }: { report: Report }) {
  const pr = report.report_output?.pricing;
  if (!pr) return <EmptyTab message="Pricing data is not yet available." />;

  const rangeMin = pr.price_range.aggressive;
  const rangeMax = pr.price_range.conservative;
  const recommended = pr.recommended_list_price;
  const pct =
    rangeMax > rangeMin ? ((recommended - rangeMin) / (rangeMax - rangeMin)) * 100 : 50;

  return (
    <div className="space-y-6">
      {/* Big price */}
      <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm text-center">
        <p className="text-sm font-medium text-emerald-700 uppercase tracking-wide mb-1">
          Recommended List Price
        </p>
        <p className="text-4xl font-bold text-emerald-900 tracking-tight">
          {formatCurrency(recommended)}
        </p>
        <p className="text-sm text-slate-500 mt-2">
          {pr.price_per_sqft > 0 && `${formatCurrency(pr.price_per_sqft)}/sq ft`}
          {pr.market_avg_ppsf > 0 && ` | Market avg: ${formatCurrency(pr.market_avg_ppsf)}/sq ft`}
        </p>
      </div>

      {/* Price range bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Price Range</h3>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span>Aggressive: {formatCurrency(rangeMin)}</span>
          <span>Conservative: {formatCurrency(rangeMax)}</span>
        </div>
        <div className="relative h-3 w-full rounded-full bg-slate-100">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
            style={{ width: '100%' }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-white bg-navy-800 shadow-md"
            style={{ left: `${Math.min(Math.max(pct, 5), 95)}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
        <p className="text-center text-xs text-slate-500 mt-2">
          Recommended price position
        </p>
      </div>

      {/* Assessment & strategy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Owner Price Assessment</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-sm font-semibold text-blue-700">
            {pr.owner_price_assessment}
          </span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Days on Market Prediction</p>
          <p className="text-sm font-semibold text-slate-900">{pr.days_on_market_prediction}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Negotiation Floor</p>
          <p className="text-sm font-semibold text-slate-900">{formatCurrency(pr.negotiation_floor)}</p>
        </div>
      </div>

      {/* Pricing strategy */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-navy-800 mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-slate-400" />
          Pricing Strategy
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">{pr.pricing_strategy}</p>
      </div>

      {/* Florida market context */}
      {pr.florida_market_context && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex items-start gap-3">
          <MapPin className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-900">{pr.florida_market_context}</p>
        </div>
      )}

      {/* Comps table */}
      {pr.comparable_analysis.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-navy-800">Comparable Sales</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Address</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sq Ft</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">$/SqFt</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Beds</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Baths</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sale Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">DOM</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Distance</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Relevance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pr.comparable_analysis.map((comp, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{comp.address}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(comp.sale_price)}</td>
                    <td className="px-4 py-3 text-slate-700">{comp.sqft.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(comp.ppsf)}</td>
                    <td className="px-4 py-3 text-slate-700">{comp.beds}</td>
                    <td className="px-4 py-3 text-slate-700">{comp.baths}</td>
                    <td className="px-4 py-3 text-slate-700">{comp.sale_date}</td>
                    <td className="px-4 py-3 text-slate-700">{comp.dom}</td>
                    <td className="px-4 py-3 text-slate-700">{comp.distance}</td>
                    <td className="px-4 py-3 text-slate-700">{comp.relevance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Price reduction triggers */}
      {pr.price_reduction_triggers.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-navy-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Price Reduction Triggers
          </h3>
          <ol className="space-y-2">
            {pr.price_reduction_triggers.map((trigger, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-slate-600"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {trigger}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Listing Copy                                                  */
/* ------------------------------------------------------------------ */
function ListingCopy({ report }: { report: Report }) {
  const listing = report.report_output?.listing;
  if (!listing) return <EmptyTab message="Listing copy is not yet available." />;

  return (
    <div className="space-y-6">
      {/* Headline & tagline */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
        <h2 className="text-2xl font-bold text-navy-800 tracking-tight">{listing.headline}</h2>
        <p className="text-base text-slate-500 mt-2 italic">{listing.tagline}</p>
      </div>

      {/* Full description */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-navy-800 uppercase tracking-wide">Full Description</h3>
          <CopyButton text={listing.full_description} />
        </div>
        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{listing.full_description}</p>
      </div>

      {/* Short description */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-navy-800 uppercase tracking-wide">Short Description</h3>
          <CopyButton text={listing.short_description} />
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{listing.short_description}</p>
      </div>

      {/* Bullet highlights */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-navy-800 uppercase tracking-wide">Bullet Highlights</h3>
          <CopyButton text={listing.bullet_highlights.join('\n')} />
        </div>
        <ul className="space-y-2">
          {listing.bullet_highlights.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              {bullet}
            </li>
          ))}
        </ul>
      </div>

      {/* Open house description */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-navy-800 uppercase tracking-wide">Open House Description</h3>
          <CopyButton text={listing.open_house_description} />
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{listing.open_house_description}</p>
      </div>

      {/* SEO keywords */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-navy-800 uppercase tracking-wide mb-3">SEO Keywords</h3>
        <div className="flex flex-wrap gap-2">
          {listing.seo_keywords.map((kw, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* Buyer persona & FL angle */}
      {(listing.buyer_persona_targeted || listing.florida_lifestyle_angle) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listing.buyer_persona_targeted && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Target Buyer Persona</p>
              <p className="text-sm text-slate-700">{listing.buyer_persona_targeted}</p>
            </div>
          )}
          {listing.florida_lifestyle_angle && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Florida Lifestyle Angle</p>
              <p className="text-sm text-blue-900">{listing.florida_lifestyle_angle}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Legal Package                                                 */
/* ------------------------------------------------------------------ */
function LegalPackage({ report }: { report: Report }) {
  const legal = report.report_output?.legal;
  if (!legal) return <EmptyTab message="Legal package is not yet available." />;

  return (
    <div className="space-y-6">
      <Disclaimer variant="banner" />

      {/* Documents */}
      {legal.documents.map((doc, i) => (
        <ExpandableDocument key={i} doc={doc} />
      ))}

      {/* Florida attorney referral */}
      {legal.florida_attorney_referral && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Florida Attorney Referral</h3>
          <p className="text-sm text-blue-800 leading-relaxed mb-4">
            {legal.florida_attorney_referral.intro}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
                What to Ask Them
              </p>
              <ul className="space-y-1.5">
                {legal.florida_attorney_referral.what_to_ask_them.map((q, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-blue-900">
                    <ChevronRight className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    {q}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                  Typical Cost
                </p>
                <p className="text-sm text-blue-900 font-medium">
                  {legal.florida_attorney_referral.typical_cost}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                  When to Call
                </p>
                <p className="text-sm text-blue-900 font-medium">
                  {legal.florida_attorney_referral.when_to_call}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpandableDocument({
  doc,
}: {
  doc: NonNullable<Report['report_output']>['legal'] extends { documents: (infer D)[] } | null ? D : never;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-slate-400" />
          <div>
            <h4 className="text-sm font-semibold text-slate-900">{doc.document_name}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{doc.description}</p>
          </div>
        </div>
        {open ? (
          <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
          {/* Template text */}
          <div>
            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Template
            </h5>
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line font-mono text-xs">
              {doc.template}
            </div>
          </div>

          {/* Key clauses */}
          {doc.key_clauses_explained.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Key Clauses Explained
              </h5>
              <div className="space-y-2">
                {doc.key_clauses_explained.map((kc, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-900">{kc.clause}</p>
                    <p className="text-xs text-slate-600 mt-1">{kc.plain_english}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fields to fill */}
          {doc.what_to_fill_in.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Fields to Fill In
              </h5>
              <ul className="space-y-1.5">
                {doc.what_to_fill_in.map((field, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <ChevronRight className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                    {field}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: MLS Access                                                    */
/* ------------------------------------------------------------------ */
function MLSAccess() {
  return <MLSReferral />;
}

/* ------------------------------------------------------------------ */
/*  Tab: Attorneys                                                     */
/* ------------------------------------------------------------------ */
function AttorneysTab({ city }: { city: string }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Your Florida Real Estate Attorneys
        </h2>
        <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto">
          Florida law requires attorney involvement in real estate closings. Here are vetted attorneys near your property.
        </p>
      </div>
      <AttorneyCards city={city} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared                                                             */
/* ------------------------------------------------------------------ */
function EmptyTab({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      <Clock className="h-8 w-8 text-slate-300 mx-auto mb-3" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function ReportViewer({ report, agentMode = false }: ReportViewerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const filteredTabs = agentMode
    ? TABS.filter((t) => t.key !== 'legal' && t.key !== 'mls')
    : TABS;
  const [shareToast, setShareToast] = useState(false);

  // Processing state
  if (report.status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-navy-800 animate-spin mb-6" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Generating Your Report</h2>
        <p className="text-sm text-slate-500 max-w-md text-center">
          We are analyzing your property data and building your personalized selling toolkit. This usually takes 1-2 minutes.
        </p>
      </div>
    );
  }

  // Failed state
  if (report.status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 mb-6">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Report Generation Failed</h2>
        <p className="text-sm text-slate-500 max-w-md text-center">
          Something went wrong while generating your report. Please contact support or try again later.
        </p>
      </div>
    );
  }

  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    // Build a combined HTML document with all report sections
    const output = report.report_output;
    const rc = report.rentcast_data;
    const prop = rc?.property;

    let html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>ListAI Report - ${report.property_address}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6; padding: 40px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 28px; color: #0f172a; margin-bottom: 4px; }
  h2 { font-size: 22px; color: #0f172a; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  h3 { font-size: 16px; color: #334155; margin: 16px 0 8px; }
  p { margin-bottom: 8px; font-size: 14px; }
  .subtitle { color: #64748b; font-size: 14px; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin: 12px 0; }
  .grid-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
  .grid-item dt { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .grid-item dd { font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 2px; }
  .section { margin-bottom: 24px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 8px 0; }
  .price-big { text-align: center; font-size: 36px; font-weight: 700; color: #065f46; margin: 16px 0; }
  .badge { display: inline-block; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 12px; padding: 2px 10px; font-size: 11px; font-weight: 600; margin-right: 6px; }
  .badge-high { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
  .badge-medium { background: #fefce8; color: #854d0e; border-color: #fef08a; }
  .badge-low { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
  .tip { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; margin: 6px 0; font-size: 13px; color: #1e40af; }
  .warning { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin: 6px 0; font-size: 13px; color: #991b1b; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
  .disclaimer { background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 16px; margin: 24px 0; font-size: 12px; color: #854d0e; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
  ul { padding-left: 20px; margin: 8px 0; }
  li { margin-bottom: 4px; font-size: 14px; }
  .week-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .week-num { background: #0f172a; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
  @media print { body { padding: 20px; } }
  .page-break { page-break-before: always; }
</style>
</head><body>`;

    // Header
    html += `<h1>${report.property_address}</h1>`;
    html += `<p class="subtitle">${report.property_city}, ${report.property_state} ${report.property_zip} &bull; Generated ${new Date(report.created_at).toLocaleDateString()}</p>`;

    // Property Summary
    html += `<h2>Property Summary</h2>`;
    html += `<div class="grid">`;
    html += `<div class="grid-item"><dt>Bedrooms</dt><dd>${report.beds}</dd></div>`;
    html += `<div class="grid-item"><dt>Bathrooms</dt><dd>${report.baths}</dd></div>`;
    html += `<div class="grid-item"><dt>Square Footage</dt><dd>${report.sqft.toLocaleString()}</dd></div>`;
    html += `<div class="grid-item"><dt>Condition</dt><dd>${getConditionLabel(report.condition_score)}</dd></div>`;
    html += `<div class="grid-item"><dt>Asking Price</dt><dd>${formatCurrency(report.asking_price)}</dd></div>`;
    html += `<div class="grid-item"><dt>Target Close</dt><dd>${report.target_close_date}</dd></div>`;
    html += `</div>`;

    if (prop) {
      html += `<h3>Confirmed Details (Public Records)</h3><div class="grid">`;
      if (prop.yearBuilt) html += `<div class="grid-item"><dt>Year Built</dt><dd>${prop.yearBuilt}</dd></div>`;
      if (prop.lotSize) html += `<div class="grid-item"><dt>Lot Size</dt><dd>${prop.lotSize.toLocaleString()} sqft</dd></div>`;
      if (prop.county) html += `<div class="grid-item"><dt>County</dt><dd>${prop.county}</dd></div>`;
      if (prop.taxAssessedValue) html += `<div class="grid-item"><dt>Tax Assessed</dt><dd>${formatCurrency(prop.taxAssessedValue)}</dd></div>`;
      html += `</div>`;
    }

    // Timeline
    if (output?.timeline) {
      const tl = output.timeline;
      html += `<h2 class="page-break">Selling Timeline</h2>`;
      html += `<p>${tl.timeline_summary}</p>`;
      html += `<div class="grid">`;
      html += `<div class="grid-item"><dt>List Date</dt><dd>${tl.recommended_list_date}</dd></div>`;
      html += `<div class="grid-item"><dt>Est. Close</dt><dd>${tl.estimated_close_date}</dd></div>`;
      html += `<div class="grid-item"><dt>Total Weeks</dt><dd>${tl.weeks.length}</dd></div>`;
      html += `</div>`;
      tl.weeks.forEach(week => {
        html += `<div class="card"><div class="week-header"><span class="week-num">${week.week_number}</span><strong>${week.label}</strong></div>`;
        week.tasks.forEach(task => {
          html += `<p><span class="badge badge-${task.priority}">${task.priority}</span> <strong>${task.task}</strong> — ${task.description} <em>(${task.estimated_hours}h)</em></p>`;
        });
        html += `</div>`;
      });
      if (tl.florida_specific_tips.length > 0) {
        html += `<h3>Florida Tips</h3>`;
        tl.florida_specific_tips.forEach(tip => { html += `<div class="tip">${tip}</div>`; });
      }
      if (tl.seasonal_note) html += `<div class="tip">${tl.seasonal_note}</div>`;
    }

    // Improvements
    if (output?.improvements) {
      const imp = output.improvements;
      html += `<h2 class="page-break">Improvement Recommendations</h2>`;
      html += `<p>${imp.summary}</p>`;
      html += `<div class="grid" style="grid-template-columns: 1fr 1fr;">`;
      html += `<div class="grid-item"><dt>Total Investment</dt><dd>${imp.total_estimated_investment}</dd></div>`;
      html += `<div class="grid-item"><dt>Value Increase</dt><dd>${imp.potential_value_increase}</dd></div>`;
      html += `</div>`;
      [...imp.recommendations].sort((a, b) => a.priority - b.priority).forEach(rec => {
        html += `<div class="card"><h3>#${rec.priority} ${rec.area}${rec.diy_friendly ? ' (DIY Friendly)' : ''}</h3>`;
        html += `<p>${rec.recommendation}</p><p><em>${rec.why}</em></p>`;
        html += `<p><span class="badge">Cost: ${rec.estimated_cost}</span><span class="badge">ROI: ${rec.estimated_roi}</span><span class="badge">Time: ${rec.time_to_complete}</span></p></div>`;
      });
      if (imp.things_to_avoid.length > 0) {
        html += `<h3>Things to Avoid</h3>`;
        imp.things_to_avoid.forEach(item => { html += `<div class="warning">${item}</div>`; });
      }
      if (imp.florida_staging_tips.length > 0) {
        html += `<h3>Florida Staging Tips</h3>`;
        imp.florida_staging_tips.forEach(tip => { html += `<div class="tip">${tip}</div>`; });
      }
    }

    // Pricing
    if (output?.pricing) {
      const pr = output.pricing;
      html += `<h2 class="page-break">Pricing Analysis</h2>`;
      html += `<div class="price-big">${formatCurrency(pr.recommended_list_price)}</div>`;
      html += `<p style="text-align:center;color:#64748b;">Recommended List Price</p>`;
      html += `<div class="grid">`;
      html += `<div class="grid-item"><dt>Aggressive</dt><dd>${formatCurrency(pr.price_range.aggressive)}</dd></div>`;
      html += `<div class="grid-item"><dt>Conservative</dt><dd>${formatCurrency(pr.price_range.conservative)}</dd></div>`;
      html += `<div class="grid-item"><dt>Negotiation Floor</dt><dd>${formatCurrency(pr.negotiation_floor)}</dd></div>`;
      html += `<div class="grid-item"><dt>$/SqFt</dt><dd>${pr.price_per_sqft > 0 ? formatCurrency(pr.price_per_sqft) : 'N/A'}</dd></div>`;
      html += `<div class="grid-item"><dt>Market Avg $/SqFt</dt><dd>${pr.market_avg_ppsf > 0 ? formatCurrency(pr.market_avg_ppsf) : 'N/A'}</dd></div>`;
      html += `<div class="grid-item"><dt>DOM Prediction</dt><dd>${pr.days_on_market_prediction}</dd></div>`;
      html += `</div>`;
      html += `<div class="card"><h3>Pricing Strategy</h3><p>${pr.pricing_strategy}</p></div>`;
      if (pr.florida_market_context) html += `<div class="tip">${pr.florida_market_context}</div>`;

      if (pr.comparable_analysis.length > 0) {
        html += `<h3>Comparable Sales</h3><table><thead><tr><th>Address</th><th>Price</th><th>SqFt</th><th>$/SqFt</th><th>Beds</th><th>Baths</th><th>Date</th></tr></thead><tbody>`;
        pr.comparable_analysis.forEach(comp => {
          html += `<tr><td>${comp.address}</td><td>${formatCurrency(comp.sale_price)}</td><td>${comp.sqft.toLocaleString()}</td><td>${formatCurrency(comp.ppsf)}</td><td>${comp.beds}</td><td>${comp.baths}</td><td>${comp.sale_date}</td></tr>`;
        });
        html += `</tbody></table>`;
      }
    }

    // Listing Copy
    if (output?.listing) {
      const l = output.listing;
      html += `<h2 class="page-break">Listing Copy</h2>`;
      html += `<div class="card" style="text-align:center;"><h3 style="font-size:20px;">${l.headline}</h3><p><em>${l.tagline}</em></p></div>`;
      html += `<h3>Full Description</h3><p>${l.full_description}</p>`;
      html += `<h3>Short Description</h3><p>${l.short_description}</p>`;
      html += `<h3>Bullet Highlights</h3><ul>`;
      l.bullet_highlights.forEach(b => { html += `<li>${b}</li>`; });
      html += `</ul>`;
      html += `<h3>Open House Description</h3><p>${l.open_house_description}</p>`;
      html += `<h3>SEO Keywords</h3><p>`;
      l.seo_keywords.forEach(kw => { html += `<span class="badge">${kw}</span>`; });
      html += `</p>`;
    }

    // Legal
    if (output?.legal) {
      const legal = output.legal;
      html += `<h2 class="page-break">Legal Package</h2>`;
      html += `<div class="disclaimer">${legal.disclaimer}</div>`;
      legal.documents.forEach(doc => {
        html += `<div class="card"><h3>${doc.document_name}</h3><p><em>${doc.description}</em></p>`;
        html += `<pre style="white-space:pre-wrap;font-size:12px;background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e2e8f0;margin:8px 0;">${doc.template}</pre>`;
        if (doc.key_clauses_explained.length > 0) {
          html += `<h3>Key Clauses</h3>`;
          doc.key_clauses_explained.forEach(kc => {
            html += `<p><strong>${kc.clause}:</strong> ${kc.plain_english}</p>`;
          });
        }
        html += `</div>`;
      });
    }

    // Footer
    html += `<div class="footer">Generated by ListAI &bull; listwithai.io &bull; ${new Date().toLocaleDateString()}<br>This report is AI-generated guidance and does not constitute legal or real estate advice.</div>`;
    html += `</body></html>`;

    // Create and download the HTML file as a clean document
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ListAI-Report-${report.property_address.replace(/[^a-zA-Z0-9]/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Report header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-800 tracking-tight">
            {report.property_address}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {report.property_city}, {report.property_state} {report.property_zip}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={report.status} />
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Download Report
          </button>
          <div className="relative">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            {shareToast && (
              <div className="absolute top-full mt-2 right-0 rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg whitespace-nowrap z-10">
                Link copied!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-slate-200 -mx-1 overflow-x-auto">
        <nav className="flex gap-0 px-1 min-w-max">
          {filteredTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-navy-800 text-navy-800'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'summary' && <PropertySummary report={report} />}
        {activeTab === 'timeline' && <SellingTimeline report={report} />}
        {activeTab === 'improvements' && <ImprovementRecommendations report={report} />}
        {activeTab === 'pricing' && <PricingAnalysis report={report} />}
        {activeTab === 'listing' && <ListingCopy report={report} />}
        {activeTab === 'legal' && <LegalPackage report={report} />}
        {activeTab === 'mls' && <MLSAccess />}
        {activeTab === 'attorneys' && <AttorneysTab city={report.property_city} />}
      </div>
    </div>
  );
}
