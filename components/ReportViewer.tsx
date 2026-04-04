'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency, getConditionLabel } from '@/lib/utils';
import type { Report, SocialMediaModule, BuyerCMAModule, OpenHouseModule, MarketSnapshotModule, PricingModule, TimelineModule, ImprovementsModule, LegalModule } from '@/types';
import Disclaimer from '@/components/Disclaimer';
import MLSReferral from '@/components/MLSReferral';
import AttorneyCards from '@/components/AttorneyCards';
import StagingTab from '@/components/StagingTab';
import {
  Copy,
  Download,
  Share2,
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
  BarChart3,
  Building,
  Megaphone,
  Sofa,
  ClipboardCheck,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  ArrowLeftRight,
} from 'lucide-react';

interface ReportViewerProps {
  report: Report;
  agentMode?: boolean;
  stagingCredits?: number;
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
  { key: 'staging', label: 'Virtual Staging', icon: Sofa },
  { key: 'offer', label: 'Offer Review', icon: ClipboardCheck },
] as const;

const AGENT_TABS = [
  { key: 'social', label: 'Social Media', icon: Megaphone },
  { key: 'buyercma', label: 'Buyer CMA', icon: BarChart3 },
  { key: 'openhouse', label: 'Open House', icon: Building },
  { key: 'market', label: 'Market', icon: TrendingUp },
] as const;

type TabKey = (typeof TABS)[number]['key'] | (typeof AGENT_TABS)[number]['key'];

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
          {report.hoa_monthly_amount && (
            <InfoItem label="Monthly HOA" value={`$${report.hoa_monthly_amount}/mo`} />
          )}
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
            <p className="text-xs text-slate-500 font-medium">{tl.phases ? 'Phases' : 'Total Weeks'}</p>
            <p className="text-sm font-semibold text-slate-900">{(tl.phases ?? tl.weeks ?? []).length} {tl.phases ? 'phases' : 'weeks'}</p>
          </div>
        </div>
      </div>

      {/* Phase-based (new) or week-by-week (legacy) */}
      <div className="space-y-4">
        {(tl.phases ?? tl.weeks ?? []).map((item) => {
          const num = 'phase_number' in item ? item.phase_number : (item as { week_number: number }).week_number;
          const duration = 'duration' in item ? (item as { duration: string }).duration : null;
          return (
            <div
              key={num}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">
                  {num}
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{item.label}</h4>
                  {duration && <p className="text-xs text-slate-500">{duration}</p>}
                </div>
              </div>
              <ul className="space-y-2">
                {item.tasks.map((task, i) => (
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
          );
        })}
      </div>

      {/* Local tips */}
      {(tl.local_tips ?? tl.florida_specific_tips ?? []).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-navy-800 uppercase tracking-wide">
            Local Tips
          </h3>
          {(tl.local_tips ?? tl.florida_specific_tips ?? []).map((tip, i) => (
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

  const sorted = [...(imp.recommendations ?? [])].sort((a, b) => a.priority - b.priority);

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
      {(imp.things_to_avoid ?? []).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Things to Avoid
          </h3>
          {(imp.things_to_avoid ?? []).map((item, i) => (
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

      {/* Staging tips */}
      {(imp.staging_tips ?? imp.florida_staging_tips ?? []).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-navy-800 uppercase tracking-wide">
            Staging Tips
          </h3>
          {(imp.staging_tips ?? imp.florida_staging_tips ?? []).map((tip, i) => (
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
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Owner Price Assessment</p>
          <p className="text-sm text-slate-700 leading-relaxed">{pr.owner_price_assessment}</p>
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

      {/* Market context */}
      {(pr.market_context ?? pr.florida_market_context) && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Market Context</p>
          <p className="text-sm text-slate-700 leading-relaxed">{pr.market_context ?? pr.florida_market_context}</p>
        </div>
      )}

      {/* Comps table */}
      {(pr.comparable_analysis ?? []).length > 0 && (
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
                {(pr.comparable_analysis ?? []).map((comp, i) => (
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
      {(pr.price_reduction_triggers ?? []).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-navy-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Price Reduction Triggers
          </h3>
          <ol className="space-y-2">
            {(pr.price_reduction_triggers ?? []).map((trigger, i) => (
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
          <CopyButton text={(listing.bullet_highlights ?? []).join('\n')} />
        </div>
        <ul className="space-y-2">
          {(listing.bullet_highlights ?? []).map((bullet, i) => (
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
          {(listing.seo_keywords ?? []).map((kw, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* Buyer persona & lifestyle angle */}
      {(listing.buyer_persona_targeted || listing.lifestyle_angle || listing.florida_lifestyle_angle) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listing.buyer_persona_targeted && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Target Buyer Persona</p>
              <p className="text-sm text-slate-700">{listing.buyer_persona_targeted}</p>
            </div>
          )}
          {(listing.lifestyle_angle || listing.florida_lifestyle_angle) && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Lifestyle Angle</p>
              <p className="text-sm text-blue-900">{listing.lifestyle_angle ?? listing.florida_lifestyle_angle}</p>
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

  const attyRef = legal.attorney_referral ?? legal.florida_attorney_referral;

  return (
    <div className="space-y-6">
      <Disclaimer variant="banner" />

      {/* Required Documents (new format) */}
      {(legal.required_documents ?? []).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-navy-800 mb-4">Required Documents</h3>
          <div className="space-y-3">
            {legal.required_documents.map((doc, i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{doc.document_name}</h4>
                    <p className="text-xs text-slate-600 mt-1">{doc.description}</p>
                    <p className="text-xs text-slate-500 mt-1"><strong>Why:</strong> {doc.why_needed}</p>
                    <p className="text-xs text-slate-500 mt-0.5"><strong>Where to get:</strong> {doc.where_to_get}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* State Disclosures (new format) */}
      {(legal.state_disclosures ?? []).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-navy-800 mb-4">State-Specific Disclosures</h3>
          <div className="space-y-3">
            {legal.state_disclosures.map((d, i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-900">{d.disclosure}</p>
                {d.statute_reference && (
                  <p className="text-xs text-blue-600 mt-0.5">{d.statute_reference}</p>
                )}
                <p className="text-xs text-slate-600 mt-1">{d.plain_english}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Clauses (new format) */}
      {(legal.key_clauses_explained ?? []).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-navy-800 mb-4">Key Clauses Explained</h3>
          <div className="space-y-2">
            {legal.key_clauses_explained.map((kc, i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-900">{kc.clause}</p>
                <p className="text-xs text-slate-600 mt-1">{kc.plain_english}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closing Costs (new format) */}
      {(legal.closing_costs ?? []).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-navy-800 mb-4">Estimated Closing Costs</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">Who Pays</th>
                  <th className="py-2">Estimated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {legal.closing_costs.map((c, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 text-slate-900 font-medium">{c.item}</td>
                    <td className="py-2 pr-4 text-slate-600">{c.who_pays}</td>
                    <td className="py-2 text-slate-600">{c.estimated_amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legacy documents (old FL reports) */}
      {(legal.documents ?? []).map((doc: { document_name: string; description: string; template: string; key_clauses_explained: { clause: string; plain_english: string }[]; what_to_fill_in: string[] }, i: number) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="h-5 w-5 text-slate-400" />
            <div>
              <h4 className="text-sm font-semibold text-slate-900">{doc.document_name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{doc.description}</p>
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-line font-mono">
            {doc.template}
          </div>
        </div>
      ))}

      {/* Attorney Referral (works for both new and legacy) */}
      {attyRef && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Attorney Referral</h3>
          <p className="text-sm text-blue-800 leading-relaxed mb-4">
            {attyRef.intro}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
                What to Ask Them
              </p>
              <ul className="space-y-1.5">
                {(attyRef.what_to_ask_them ?? []).map((q: string, j: number) => (
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
                  {attyRef.typical_cost}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                  When to Call
                </p>
                <p className="text-sm text-blue-900 font-medium">
                  {attyRef.when_to_call}
                </p>
              </div>
            </div>
          </div>
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
function AttorneysTab({ city, state }: { city: string; state: string }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Real Estate Attorneys Near You
        </h2>
        <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto">
          An attorney can help protect your interests in your real estate closing. Here are attorneys near your property.
        </p>
      </div>
      <AttorneyCards city={city} state={state} />
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
/*  Offer Review Tab                                                   */
/* ------------------------------------------------------------------ */
interface OfferAnalysis {
  verdict: 'accept' | 'counter' | 'reject';
  verdict_reason: string;
  strength_score: number;
  red_flags: string[];
  green_flags: string[];
  counter_strategy: {
    recommended_counter_price: number;
    concessions_counter: number;
    closing_date_notes: string;
    contingency_notes: string;
  };
  negotiation_talking_points: string[];
  bottom_line: string;
}

function OfferReviewTab({ report }: { report: Report }) {
  const [form, setForm] = useState({
    offerPrice: '',
    downPayment: '20',
    financingType: 'Conventional',
    inspectionContingency: true,
    financingContingency: true,
    appraisalContingency: true,
    closingDate: '',
    earnestMoney: '',
    sellerConcessions: '0',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<OfferAnalysis | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const res = await fetch('/api/report/analyze-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          offer: {
            offerPrice: Number(form.offerPrice.replace(/,/g, '')),
            downPayment: Number(form.downPayment),
            financingType: form.financingType,
            inspectionContingency: form.inspectionContingency,
            financingContingency: form.financingContingency,
            appraisalContingency: form.appraisalContingency,
            closingDate: form.closingDate,
            earnestMoney: Number(form.earnestMoney.replace(/,/g, '')),
            sellerConcessions: Number(form.sellerConcessions.replace(/,/g, '')),
            notes: form.notes,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const verdictStyles = {
    accept: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: ThumbsUp, label: 'Accept This Offer' },
    counter: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: ArrowLeftRight, label: 'Counter This Offer' },
    reject: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: ThumbsDown, label: 'Reject This Offer' },
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardCheck className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900">Analyze an Offer</h3>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Enter the offer details and AI will tell you whether to accept, counter, or reject — with specific negotiation guidance.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Offer Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="text"
                  required
                  placeholder="450,000"
                  value={form.offerPrice}
                  onChange={e => setForm(f => ({ ...f, offerPrice: e.target.value }))}
                  className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Earnest Money</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="text"
                  placeholder="5,000"
                  value={form.earnestMoney}
                  onChange={e => setForm(f => ({ ...f, earnestMoney: e.target.value }))}
                  className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Down Payment %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.downPayment}
                onChange={e => setForm(f => ({ ...f, downPayment: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Financing Type</label>
              <select
                value={form.financingType}
                onChange={e => setForm(f => ({ ...f, financingType: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              >
                <option>Conventional</option>
                <option>FHA</option>
                <option>VA</option>
                <option>USDA</option>
                <option>Cash</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Closing Date</label>
              <input
                type="date"
                value={form.closingDate}
                onChange={e => setForm(f => ({ ...f, closingDate: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Seller Concessions Requested</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="text"
                  placeholder="0"
                  value={form.sellerConcessions}
                  onChange={e => setForm(f => ({ ...f, sellerConcessions: e.target.value }))}
                  className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Contingencies</label>
            <div className="flex flex-wrap gap-4">
              {[
                { key: 'inspectionContingency', label: 'Inspection' },
                { key: 'financingContingency', label: 'Financing' },
                { key: 'appraisalContingency', label: 'Appraisal' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key as keyof typeof form] as boolean}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Additional Notes (inclusions, exclusions, special terms)</label>
            <textarea
              rows={3}
              placeholder="e.g. Buyer wants refrigerator included. Requested 60-day leaseback..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !form.offerPrice}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing offer...
              </>
            ) : (
              <>
                <ClipboardCheck className="h-4 w-4" />
                Analyze This Offer
              </>
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {analysis && (() => {
        const verdict = verdictStyles[analysis.verdict];
        const VerdictIcon = verdict.icon;
        return (
          <div className="space-y-5">
            {/* Verdict banner */}
            <div className={cn('rounded-xl border p-5', verdict.bg, verdict.border)}>
              <div className="flex items-center gap-3 mb-2">
                <VerdictIcon className={cn('h-6 w-6', verdict.text)} />
                <p className={cn('text-lg font-bold', verdict.text)}>{verdict.label}</p>
                <span className="ml-auto text-sm font-medium text-slate-600">
                  Offer strength: <span className="font-bold text-slate-900">{analysis.strength_score}/10</span>
                </span>
              </div>
              <p className={cn('text-sm', verdict.text)}>{analysis.verdict_reason}</p>
            </div>

            {/* Bottom line */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Bottom Line</p>
              <p className="text-sm text-slate-700 leading-relaxed">{analysis.bottom_line}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Green flags */}
              {analysis.green_flags.length > 0 && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-3">Positives</p>
                  <ul className="space-y-2">
                    {analysis.green_flags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Red flags */}
              {analysis.red_flags.length > 0 && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-5">
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-3">Red Flags</p>
                  <ul className="space-y-2">
                    {analysis.red_flags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Counter strategy */}
            {analysis.verdict === 'counter' && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Counter Strategy</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 mb-1">Counter Price</p>
                    <p className="text-base font-bold text-slate-900">${analysis.counter_strategy.recommended_counter_price.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 mb-1">Concessions</p>
                    <p className="text-base font-bold text-slate-900">${analysis.counter_strategy.concessions_counter.toLocaleString()}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <p><span className="font-medium">Closing Date:</span> {analysis.counter_strategy.closing_date_notes}</p>
                  <p><span className="font-medium">Contingencies:</span> {analysis.counter_strategy.contingency_notes}</p>
                </div>
              </div>
            )}

            {/* Negotiation talking points */}
            {analysis.negotiation_talking_points.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Negotiation Talking Points</p>
                <ul className="space-y-2">
                  {analysis.negotiation_talking_points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Next Steps Panel                                                   */
/* ------------------------------------------------------------------ */
function formatStepDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      .format(new Date(dateStr + 'T00:00:00'));
  } catch {
    return dateStr;
  }
}

function NextStepsPanel({ report }: { report: Report }) {
  const output = report.report_output;
  const pricing = output?.pricing as PricingModule | null | undefined;
  const timeline = output?.timeline as TimelineModule | null | undefined;
  const improvements = output?.improvements as ImprovementsModule | null | undefined;
  const legal = output?.legal as LegalModule | null | undefined;

  const steps: { label: string; detail: string }[] = [];

  // 1. Recommended list price
  if (pricing?.recommended_list_price) {
    const range = pricing.price_range;
    const rangeDetail = range
      ? `Price range: $${range.aggressive.toLocaleString()} – $${range.conservative.toLocaleString()}. See the Pricing tab for your full strategy.`
      : `Based on comparable sales in ${report.property_city}. See the Pricing tab for details.`;
    steps.push({
      label: `List your home at $${pricing.recommended_list_price.toLocaleString()}`,
      detail: rangeDetail,
    });
  }

  // 2. Target list date
  if (timeline?.recommended_list_date) {
    steps.push({
      label: `Target list date: ${formatStepDate(timeline.recommended_list_date)}`,
      detail: timeline.timeline_summary || 'See your full timeline for a week-by-week action plan.',
    });
  }

  // 3. Top improvement — skip any "Pricing Strategy" items the AI may put in improvements
  const topImprovement = improvements?.recommendations?.find(
    (r) => !r.area.toLowerCase().includes('pric')
  ) ?? improvements?.recommendations?.[0];
  if (topImprovement) {
    steps.push({
      label: `Improvement: ${topImprovement.area} — ${topImprovement.recommendation}`,
      detail: `Est. cost ${topImprovement.estimated_cost} · Est. ROI ${topImprovement.estimated_roi}. ${topImprovement.diy_friendly ? 'DIY-friendly.' : 'Hire a contractor.'}`,
    });
  }

  // 4. Get on the MLS
  steps.push({
    label: 'List on the MLS without an agent for under $300',
    detail: 'Use a flat-fee MLS service like Houzeo or ListWithFreedom. They put your home on Zillow, Realtor.com, and your local MLS. See the MLS tab.',
  });

  // 5. Use listing copy + virtual staging for photos
  if (output?.listing) {
    steps.push({
      label: 'Copy your AI-written listing & stage your photos',
      detail: 'Get your headline and description from the Listing Copy tab. Then use the Virtual Staging tab to generate AI-enhanced photos for your listing — no photographer needed.',
    });
  }

  // 6. First required document
  const firstDoc = legal?.required_documents?.[0];
  if (firstDoc?.document_name) {
    steps.push({
      label: `Gather: ${firstDoc.document_name}`,
      detail: firstDoc.description || 'Required for your sale. See the Legal tab for the full documents list.',
    });
  }

  // 7. Hire an attorney — always last
  steps.push({
    label: 'Hire a real estate attorney before signing anything',
    detail: 'Have them review all contracts and disclosures. See the Attorneys tab for options near you.',
  });

  if (steps.length === 0) return null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="h-5 w-5 text-blue-600 shrink-0" />
        <h2 className="text-base font-semibold text-blue-900">Your Next Steps</h2>
        <span className="ml-auto text-xs text-blue-500 font-medium">{steps.length} action items</span>
      </div>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white mt-0.5">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{step.label}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function ReportViewer({ report, agentMode = false, stagingCredits = 0 }: ReportViewerProps) {
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

  const output = report.report_output;
  const socialMedia = output?.social_media as SocialMediaModule | null | undefined;
  const buyerCMA = output?.buyer_cma as BuyerCMAModule | null | undefined;
  const openHouse = output?.open_house as OpenHouseModule | null | undefined;
  const marketSnapshot = output?.market_snapshot as MarketSnapshotModule | null | undefined;

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
      const items = tl.phases ?? tl.weeks ?? [];
      html += `<div class="grid-item"><dt>${tl.phases ? 'Phases' : 'Total Weeks'}</dt><dd>${items.length}</dd></div>`;
      html += `</div>`;
      items.forEach((item) => {
        const num = 'phase_number' in item ? item.phase_number : (item as { week_number: number }).week_number;
        const duration = 'duration' in item ? ` (${(item as { duration: string }).duration})` : '';
        html += `<div class="card"><div class="week-header"><span class="week-num">${num}</span><strong>${item.label}${duration}</strong></div>`;
        item.tasks.forEach(task => {
          html += `<p><span class="badge badge-${task.priority}">${task.priority}</span> <strong>${task.task}</strong> — ${task.description} <em>(${task.estimated_hours}h)</em></p>`;
        });
        html += `</div>`;
      });
      const localTips = tl.local_tips ?? tl.florida_specific_tips ?? [];
      if (localTips.length > 0) {
        html += `<h3>Local Tips</h3>`;
        localTips.forEach(tip => { html += `<div class="tip">${tip}</div>`; });
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
      const stagingTips = imp.staging_tips ?? imp.florida_staging_tips ?? [];
      if (stagingTips.length > 0) {
        html += `<h3>Staging Tips</h3>`;
        stagingTips.forEach(tip => { html += `<div class="tip">${tip}</div>`; });
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
      const mktCtx = pr.market_context ?? pr.florida_market_context;
      if (mktCtx) html += `<div class="tip">${mktCtx}</div>`;

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
      // New format: required documents + state disclosures + closing costs
      (legal.required_documents ?? []).forEach(doc => {
        html += `<div class="card"><h3>${doc.document_name}</h3><p>${doc.description}</p><p><em>Why: ${doc.why_needed}</em></p><p><em>Where: ${doc.where_to_get}</em></p></div>`;
      });
      if ((legal.state_disclosures ?? []).length > 0) {
        html += `<h3>State Disclosures</h3>`;
        legal.state_disclosures.forEach(d => {
          html += `<div class="card"><p><strong>${d.disclosure}</strong>${d.statute_reference ? ` (${d.statute_reference})` : ''}</p><p>${d.plain_english}</p></div>`;
        });
      }
      if ((legal.key_clauses_explained ?? []).length > 0) {
        html += `<h3>Key Clauses</h3>`;
        legal.key_clauses_explained.forEach(kc => {
          html += `<p><strong>${kc.clause}:</strong> ${kc.plain_english}</p>`;
        });
      }
      if ((legal.closing_costs ?? []).length > 0) {
        html += `<h3>Closing Costs</h3><table><thead><tr><th>Item</th><th>Who Pays</th><th>Estimated</th></tr></thead><tbody>`;
        legal.closing_costs.forEach(c => {
          html += `<tr><td>${c.item}</td><td>${c.who_pays}</td><td>${c.estimated_amount}</td></tr>`;
        });
        html += `</tbody></table>`;
      }
      // Legacy format: old FL template documents
      (legal.documents ?? []).forEach((doc: { document_name: string; description: string; template: string; key_clauses_explained: { clause: string; plain_english: string }[] }) => {
        html += `<div class="card"><h3>${doc.document_name}</h3><p><em>${doc.description}</em></p>`;
        html += `<pre style="white-space:pre-wrap;font-size:12px;background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e2e8f0;margin:8px 0;">${doc.template}</pre>`;
        if ((doc.key_clauses_explained ?? []).length > 0) {
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
          {agentMode && (
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Download Report
            </button>
          )}
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

      {/* Next Steps panel — only show when report is complete */}
      {report.status === 'complete' && <NextStepsPanel report={report} />}

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
          {agentMode && AGENT_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === key
                  ? 'border-navy-800 text-navy-800'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
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
        {activeTab === 'attorneys' && <AttorneysTab city={report.property_city} state={report.property_state} />}

        {activeTab === 'social' && socialMedia && (
          <div className="space-y-6">
            {/* Instagram */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Instagram Caption</p>
                <CopyButton text={socialMedia.instagram_caption + '\n\n' + (socialMedia.instagram_hashtags ?? []).join(' ')} label="Copy" />
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{socialMedia.instagram_caption}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(socialMedia.instagram_hashtags ?? []).map((tag, i) => (
                  <span key={i} className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">#{tag.replace('#', '')}</span>
                ))}
              </div>
            </div>

            {/* Facebook */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Facebook Post</p>
                <CopyButton text={socialMedia.facebook_post} label="Copy" />
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{socialMedia.facebook_post}</p>
            </div>

            {/* Twitter/X */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">X (Twitter) Post</p>
                <CopyButton text={socialMedia.twitter_post} label="Copy" />
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{socialMedia.twitter_post}</p>
              <p className="text-xs text-slate-400 mt-1">{socialMedia.twitter_post.length}/280 characters</p>
            </div>

            {/* LinkedIn */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">LinkedIn Post</p>
                <CopyButton text={socialMedia.linkedin_post} label="Copy" />
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{socialMedia.linkedin_post}</p>
            </div>

            {/* Video Script */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Reels / TikTok Script</p>
                <CopyButton text={socialMedia.short_form_video_script} label="Copy" />
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{socialMedia.short_form_video_script}</p>
            </div>

            {/* Email Blast */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email Blast</p>
                <CopyButton text={socialMedia.email_blast} label="Copy" />
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{socialMedia.email_blast}</p>
            </div>
          </div>
        )}

        {activeTab === 'buyercma' && buyerCMA && (
          <div className="space-y-6">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-2">Executive Summary</p>
              <p className="text-sm text-emerald-900 leading-relaxed">{buyerCMA.executive_summary}</p>
            </div>

            {/* Property Highlights */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Property Highlights</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(buyerCMA.property_highlights ?? []).map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparable Sales */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Comparable Sales Analysis</p>
                <CopyButton text={(buyerCMA.comparable_sales ?? []).map(c => `${c.address} - $${c.sale_price.toLocaleString()} (${c.condition_comparison})`).join('\n')} label="Copy" />
              </div>
              <div className="space-y-4">
                {(buyerCMA.comparable_sales ?? []).map((comp, i) => (
                  <div key={i} className="border border-slate-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-slate-900">{comp.address}</p>
                      <p className="text-sm font-bold text-slate-900">${comp.sale_price.toLocaleString()}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-2">
                      <span>{comp.beds}bd / {comp.baths}ba</span>
                      <span>{comp.sqft.toLocaleString()} sqft</span>
                      <span>${comp.ppsf}/sqft</span>
                      <span>Sold {comp.sale_date}</span>
                    </div>
                    <p className="text-xs text-slate-600"><strong>Comparison:</strong> {comp.condition_comparison}</p>
                    <p className="text-xs text-slate-600"><strong>Adjustment:</strong> {comp.price_adjustment}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Value Justification */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Market Position</p>
                <p className="text-sm text-slate-700 leading-relaxed">{buyerCMA.market_position}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Price Per Sqft Analysis</p>
                <p className="text-sm text-slate-700 leading-relaxed">{buyerCMA.price_per_sqft_analysis}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Value Justification</p>
              <p className="text-sm text-slate-700 leading-relaxed">{buyerCMA.value_justification}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Investment Outlook</p>
              <p className="text-sm text-slate-700 leading-relaxed">{buyerCMA.investment_outlook}</p>
            </div>

            {/* Neighborhood */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Neighborhood Highlights</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(buyerCMA.neighborhood_highlights ?? []).map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <MapPin className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'openhouse' && openHouse && (
          <div className="space-y-6">
            {/* Fact Sheet */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Property Fact Sheet</p>
                <CopyButton text={openHouse.property_fact_sheet} label="Copy" />
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{openHouse.property_fact_sheet}</p>
            </div>

            {/* Feature Highlights */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Feature Highlights</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(openHouse.feature_highlights ?? []).map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <Star className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Neighborhood Info */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Neighborhood Info</p>
              <p className="text-sm text-slate-700 leading-relaxed">{openHouse.neighborhood_info}</p>
            </div>

            {/* Talking Points */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Agent Talking Points</p>
                <CopyButton text={(openHouse.agent_talking_points ?? []).join('\n• ')} label="Copy" />
              </div>
              <ul className="space-y-2">
                {(openHouse.agent_talking_points ?? []).map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <ChevronRight className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Objection Handlers */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Objection Handlers</p>
              <div className="space-y-4">
                {(openHouse.objection_handlers ?? []).map((obj, i) => (
                  <div key={i} className="border-l-2 border-amber-300 pl-4">
                    <p className="text-sm font-medium text-slate-900">&ldquo;{obj.objection}&rdquo;</p>
                    <p className="text-sm text-slate-600 mt-1">{obj.response}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Follow-up Email */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Post Open House Follow-up Email</p>
                <CopyButton text={openHouse.follow_up_email_template} label="Copy" />
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{openHouse.follow_up_email_template}</p>
            </div>
          </div>
        )}

        {activeTab === 'market' && marketSnapshot && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-sm text-emerald-900 leading-relaxed">{marketSnapshot.market_summary}</p>
            </div>

            {/* Key Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Median Price</p>
                <p className="text-xl font-bold text-slate-900 mt-1">${marketSnapshot.median_price.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Avg $/Sqft</p>
                <p className="text-xl font-bold text-slate-900 mt-1">${marketSnapshot.avg_price_per_sqft}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Avg DOM</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{marketSnapshot.avg_days_on_market}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Market Trend</p>
                <p className={`text-xl font-bold mt-1 ${
                  marketSnapshot.market_trend === 'Rising' ? 'text-emerald-600' :
                  marketSnapshot.market_trend === 'Declining' ? 'text-red-600' :
                  'text-amber-600'
                }`}>{marketSnapshot.market_trend}</p>
              </div>
            </div>

            {/* Market Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Inventory Level</p>
                <p className="text-sm text-slate-700">{marketSnapshot.inventory_level}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Buyer vs Seller Market</p>
                <p className="text-sm text-slate-700">{marketSnapshot.buyer_vs_seller_market}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Price Trend</p>
              <p className="text-sm text-slate-700 leading-relaxed">{marketSnapshot.price_trend_narrative}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Best Time to List</p>
              <p className="text-sm text-slate-700 leading-relaxed">{marketSnapshot.best_time_to_list}</p>
            </div>

            {/* Key Insights */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Key Market Insights</p>
              <ul className="space-y-2">
                {(marketSnapshot.key_insights ?? []).map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <TrendingUp className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recent Sales */}
            {marketSnapshot.comparable_recent_sales && marketSnapshot.comparable_recent_sales.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Recent Sales in Area</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        <th className="px-5 py-3 font-medium">Address</th>
                        <th className="px-5 py-3 font-medium">Price</th>
                        <th className="px-5 py-3 font-medium">Sqft</th>
                        <th className="px-5 py-3 font-medium">Bed/Bath</th>
                        <th className="px-5 py-3 font-medium">Sold</th>
                        <th className="px-5 py-3 font-medium">DOM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {marketSnapshot.comparable_recent_sales.map((sale, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-5 py-3 text-slate-900 font-medium">{sale.address}</td>
                          <td className="px-5 py-3 text-slate-900">${sale.price.toLocaleString()}</td>
                          <td className="px-5 py-3 text-slate-600">{sale.sqft.toLocaleString()}</td>
                          <td className="px-5 py-3 text-slate-600">{sale.beds}/{sale.baths}</td>
                          <td className="px-5 py-3 text-slate-600">{sale.sold_date}</td>
                          <td className="px-5 py-3 text-slate-600">{sale.dom}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'staging' && (
          <StagingTab
            reportId={report.id}
            stagingCredits={stagingCredits}
          />
        )}

        {activeTab === 'offer' && <OfferReviewTab report={report} />}
      </div>

      {/* Support banner */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Something not right?</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            If your property details are incorrect or you need changes to your report, contact us and we&apos;ll get it fixed.
          </p>
        </div>
        <a
          href={`mailto:evangelos@univentureprop.com?subject=Report Issue — ${report.property_address}&body=Report ID: ${report.id}%0A%0APlease describe the issue:%0A`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 whitespace-nowrap"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
