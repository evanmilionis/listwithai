'use client';

import React, { useState, useCallback, useRef } from 'react';
import { cn, getConditionLabel } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import type { IntakeFormData, PropertyType } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntakeFormProps {
  mode: 'homeowner' | 'agent';
  onSubmit: (data: IntakeFormData) => Promise<void>;
  isLoading?: boolean;
}

type StepErrors = Record<string, string>;

const STEPS = ['Property Details', 'Selling Details', 'Contact & Payment'] as const;

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'Single Family', label: 'Single Family' },
  { value: 'Condo', label: 'Condo' },
  { value: 'Townhouse', label: 'Townhouse' },
  { value: 'Multi-Family', label: 'Multi-Family' },
];

const BEDROOM_OPTIONS = Array.from({ length: 8 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

const BATHROOM_OPTIONS = ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5+'].map(
  (v) => ({ value: v, label: v })
);

const TIMELINE_OPTIONS = [
  { value: 'ASAP', label: 'ASAP' },
  { value: '30 days', label: '30 days' },
  { value: '60 days', label: '60 days' },
  { value: '90 days', label: '90 days' },
  { value: '6+ months', label: '6+ months' },
];

const MORTGAGE_OPTIONS = [
  { value: 'Own free & clear', label: 'Own free & clear' },
  { value: 'Has mortgage', label: 'Has mortgage' },
  { value: 'Unknown', label: 'Unknown' },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
].map((s) => ({ value: s, label: s }));

const REFERRAL_OPTIONS = [
  { value: 'Google', label: 'Google' },
  { value: 'Social Media', label: 'Social Media' },
  { value: 'News Story', label: 'News Story' },
  { value: 'Friend', label: 'Friend' },
  { value: 'Other', label: 'Other' },
];

const UPDATE_AREAS = [
  'Kitchen',
  'Bathrooms',
  'Flooring',
  'Roof',
  'HVAC',
  'Windows',
  'Other',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getConditionColor(score: number): string {
  if (score <= 3) return 'text-red-600';
  if (score <= 6) return 'text-yellow-600';
  if (score <= 8) return 'text-green-600';
  return 'text-blue-600';
}

function getConditionTrackColor(score: number): string {
  if (score <= 3) return 'accent-red-600';
  if (score <= 6) return 'accent-yellow-500';
  if (score <= 8) return 'accent-green-600';
  return 'accent-blue-600';
}

function parseCurrencyInput(raw: string): number {
  return Number(raw.replace(/[^0-9]/g, '')) || 0;
}

function formatPriceDisplay(value: number): string {
  if (!value) return '';
  return '$' + value.toLocaleString('en-US');
}

// ---------------------------------------------------------------------------
// Default form state
// ---------------------------------------------------------------------------

function getDefaultFormData(): IntakeFormData {
  return {
    property_address: '',
    property_city: '',
    property_state: 'FL',
    property_zip: '',
    property_type: 'Single Family',
    beds: 3,
    baths: 2,
    sqft: 0,
    year_built: 0,
    lot_size: null,
    home_features: '',
    condition_score: 5,
    asking_price: 0,
    target_close_date: '30 days',
    recently_updated: false,
    updated_areas: [],
    other_improvements: '',
    mortgage_status: 'Has mortgage',
    hoa_monthly_amount: undefined,
    flexible_on_price: false,
    customer_name: '',
    customer_email: '',
    phone: '',
    referral_source: '',
    disclaimer_accepted: false,
    client_name: '',
    client_email: '',
    report_notes: '',
  };
}

// ---------------------------------------------------------------------------
// Progress Indicator
// ---------------------------------------------------------------------------

function ProgressIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1;
        const isCompleted = currentStep > stepNum;
        const isActive = currentStep === stepNum;

        return (
          <React.Fragment key={label}>
            {/* Connector line */}
            {idx > 0 && (
              <div
                className={cn(
                  'h-0.5 w-8 sm:w-16',
                  isCompleted || isActive ? 'bg-slate-900' : 'bg-slate-300'
                )}
              />
            )}
            {/* Step circle + label */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors',
                  isCompleted && 'bg-slate-900 text-white',
                  isActive && 'bg-slate-900 text-white',
                  !isCompleted && !isActive && 'bg-slate-200 text-slate-500'
                )}
              >
                {isCompleted ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={cn(
                  'mt-1.5 text-xs font-medium whitespace-nowrap',
                  isActive || isCompleted ? 'text-slate-900' : 'text-slate-400'
                )}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IntakeForm
// ---------------------------------------------------------------------------

export default function IntakeForm({
  mode,
  onSubmit,
  isLoading = false,
}: IntakeFormProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<IntakeFormData>(getDefaultFormData);
  const [errors, setErrors] = useState<StepErrors>({});
  const [priceDisplay, setPriceDisplay] = useState('');
  const [addressValidating, setAddressValidating] = useState(false);
  const leadIdRef = useRef<string | null>(null);

  // ------- lead capture (silent, non-blocking) -------

  const captureLeadData = useCallback(
    (stepReached: number, extraData?: Record<string, unknown>) => {
      const payload: Record<string, unknown> = {
        form_step_reached: stepReached,
        ...extraData,
      };

      if (leadIdRef.current) {
        payload.lead_id = leadIdRef.current;
      }

      // Step 1 data
      if (stepReached >= 1) {
        payload.property_address = form.property_address;
        payload.property_city = form.property_city;
        payload.property_zip = form.property_zip;
        payload.beds = form.beds;
        payload.baths = form.baths;
        payload.sqft = form.sqft;
      }

      // Step 2 data
      if (stepReached >= 2) {
        payload.asking_price = form.asking_price;
        payload.hoa_monthly_amount = form.hoa_monthly_amount;
      }

      // Step 3 data
      if (stepReached >= 3) {
        payload.email = form.customer_email;
        payload.name = form.customer_name;
        payload.phone = form.phone;
      }

      fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.id && !leadIdRef.current) {
            leadIdRef.current = data.id;
          }
        })
        .catch(() => {
          // Silently fail — don't block the user
        });
    },
    [form]
  );

  // ------- field updaters -------

  const set = useCallback(
    <K extends keyof IntakeFormData>(key: K, value: IntakeFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (prev[key]) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return prev;
      });
    },
    []
  );

  const toggleArea = useCallback((area: string) => {
    setForm((prev) => {
      const areas = prev.updated_areas.includes(area)
        ? prev.updated_areas.filter((a) => a !== area)
        : [...prev.updated_areas, area];
      return { ...prev, updated_areas: areas };
    });
  }, []);

  // ------- price formatting -------

  const handlePriceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const num = parseCurrencyInput(e.target.value);
      set('asking_price', num);
      setPriceDisplay(formatPriceDisplay(num));
    },
    [set]
  );

  // ------- validation -------

  const validateStep1 = (): boolean => {
    const errs: StepErrors = {};
    if (!form.property_address.trim()) errs.property_address = 'Address is required';
    if (!form.property_city.trim()) errs.property_city = 'City is required';
    if (!/^\d{5}$/.test(form.property_zip)) errs.property_zip = 'Enter a valid 5-digit ZIP';
    if (!form.sqft || form.sqft <= 0) errs.sqft = 'Square footage is required';
    if (!form.year_built || form.year_built < 1800 || form.year_built > new Date().getFullYear())
      errs.year_built = 'Enter a valid year';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: StepErrors = {};
    if (!form.asking_price || form.asking_price <= 0)
      errs.asking_price = 'Target asking price is required';
    if (!form.target_close_date) errs.target_close_date = 'Select a closing timeline';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errs: StepErrors = {};
    if (!form.customer_name.trim()) errs.customer_name = 'Full name is required';
    if (
      !form.customer_email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email)
    )
      errs.customer_email = 'Valid email is required';
    if (!form.disclaimer_accepted)
      errs.disclaimer_accepted = 'You must accept the disclaimer';
    if (mode === 'agent') {
      if (!form.client_name?.trim()) errs.client_name = 'Client name is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validators = [validateStep1, validateStep2, validateStep3];

  // ------- navigation -------

  const goNext = async () => {
    if (!validators[step - 1]()) return;

    // Validate address when leaving Step 1
    if (step === 1) {
      setAddressValidating(true);
      try {
        const res = await fetch('/api/validate-address', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: form.property_address,
            city: form.property_city,
            state: form.property_state,
            zipCode: form.property_zip,
          }),
        });
        const data = await res.json();
        if (!data.valid) {
          setErrors({ property_address: data.message || 'We couldn\'t verify this address. Please double-check and try again.' });
          setAddressValidating(false);
          return;
        }
      } catch {
        // If validation service is down, don't block the user
      }
      setAddressValidating(false);
    }

    // Silently capture lead data for the completed step
    captureLeadData(step);
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;
    // Capture step 3 data before submitting
    captureLeadData(3);
    await onSubmit(form);
  };

  // ------- render steps -------

  const renderStep1 = () => (
    <div className="space-y-5">
      <Input
        id="property_address"
        label="Full Street Address"
        placeholder="123 Main St"
        value={form.property_address}
        onChange={(e) => set('property_address', e.target.value)}
        error={errors.property_address}
        required
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          id="property_city"
          label="City"
          placeholder="Miami"
          value={form.property_city}
          onChange={(e) => set('property_city', e.target.value)}
          error={errors.property_city}
          required
        />
        <Select
          id="property_state"
          label="State"
          value={form.property_state}
          onChange={(e) => set('property_state', e.target.value)}
          options={US_STATES}
        />
        <Input
          id="property_zip"
          label="ZIP Code"
          placeholder="33101"
          value={form.property_zip}
          onChange={(e) => set('property_zip', e.target.value)}
          error={errors.property_zip}
          maxLength={5}
          required
        />
      </div>

      <Select
        id="property_type"
        label="Property Type"
        value={form.property_type}
        onChange={(e) => set('property_type', e.target.value as PropertyType)}
        options={PROPERTY_TYPES.map((pt) => ({ value: pt.value, label: pt.label }))}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          id="beds"
          label="Bedrooms"
          value={String(form.beds)}
          onChange={(e) => set('beds', Number(e.target.value))}
          options={BEDROOM_OPTIONS}
        />
        <Select
          id="baths"
          label="Bathrooms"
          value={form.baths >= 5.5 ? '5+' : String(form.baths)}
          onChange={(e) => {
            const val = e.target.value;
            set('baths', val === '5+' ? 5.5 : Number(val));
          }}
          options={BATHROOM_OPTIONS}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          id="sqft"
          label="Square Footage"
          type="number"
          placeholder="1,800"
          value={form.sqft || ''}
          onChange={(e) => set('sqft', Number(e.target.value))}
          error={errors.sqft}
          required
        />
        <Input
          id="year_built"
          label="Year Built"
          type="number"
          placeholder="2005"
          value={form.year_built || ''}
          onChange={(e) => set('year_built', Number(e.target.value))}
          error={errors.year_built}
          required
        />
        <Input
          id="lot_size"
          label="Lot Size (sqft)"
          type="number"
          placeholder="Optional"
          value={form.lot_size ?? ''}
          onChange={(e) =>
            set('lot_size', e.target.value ? Number(e.target.value) : null)
          }
        />
      </div>

      {/* Home features */}
      <div>
        <label
          htmlFor="home_features"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Notable Home Features
        </label>
        <textarea
          id="home_features"
          rows={3}
          placeholder="e.g., Pool, marble countertops, impact windows, new roof (2024), hardwood floors, smart home system, waterfront..."
          value={form.home_features}
          onChange={(e) => set('home_features', e.target.value)}
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
        />
        <p className="mt-1 text-xs text-slate-500">
          List any features that add value — pools, upgrades, premium finishes, views, etc. This directly impacts your pricing and listing analysis.
        </p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Condition slider */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Overall Property Condition
        </label>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={form.condition_score}
          onChange={(e) => set('condition_score', Number(e.target.value))}
          className={cn('w-full h-2 rounded-lg cursor-pointer', getConditionTrackColor(form.condition_score))}
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-slate-400">1</span>
          <span
            className={cn(
              'text-sm font-semibold',
              getConditionColor(form.condition_score)
            )}
          >
            {form.condition_score} — {getConditionLabel(form.condition_score)}
          </span>
          <span className="text-xs text-slate-400">10</span>
        </div>
      </div>

      {/* Asking price */}
      <Input
        id="asking_price"
        label="Target Asking Price"
        placeholder="$250,000"
        value={priceDisplay}
        onChange={handlePriceChange}
        error={errors.asking_price}
        required
      />

      {/* HOA */}
      <Input
        id="hoa_monthly_amount"
        label="Monthly HOA Fee (optional)"
        type="number"
        placeholder="e.g. 350"
        value={form.hoa_monthly_amount || ''}
        onChange={(e) => set('hoa_monthly_amount', e.target.value ? Number(e.target.value) : undefined)}
      />

      {/* Timeline */}
      <Select
        id="target_close_date"
        label="Desired Closing Timeline"
        value={form.target_close_date}
        onChange={(e) => set('target_close_date', e.target.value)}
        options={TIMELINE_OPTIONS}
        error={errors.target_close_date}
      />

      {/* Recently updated toggle */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Has the home been recently updated?
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => set('recently_updated', true)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              form.recently_updated
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            )}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => {
              set('recently_updated', false);
              setForm((prev) => ({ ...prev, updated_areas: [] }));
            }}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              !form.recently_updated
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            )}
          >
            No
          </button>
        </div>

        {form.recently_updated && (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {UPDATE_AREAS.map((area) => (
                <label
                  key={area}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors',
                    form.updated_areas.includes(area)
                      ? 'bg-slate-100 border-slate-900 text-slate-900'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={form.updated_areas.includes(area)}
                    onChange={() => toggleArea(area)}
                    className="sr-only"
                  />
                  {form.updated_areas.includes(area) && (
                    <svg
                      className="w-3.5 h-3.5 text-slate-900"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {area}
                </label>
              ))}
            </div>

            {/* Other improvements text input */}
            {form.updated_areas.includes('Other') && (
              <div className="mt-3">
                <label
                  htmlFor="other_improvements"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Describe other improvements
                </label>
                <textarea
                  id="other_improvements"
                  rows={3}
                  placeholder="e.g., Added a pool, new lanai/screen enclosure, solar panels, impact windows..."
                  value={form.other_improvements}
                  onChange={(e) => set('other_improvements', e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Be specific — this helps our AI accurately factor improvements into your pricing and report.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mortgage status */}
      <Select
        id="mortgage_status"
        label="Current Mortgage Status"
        value={form.mortgage_status}
        onChange={(e) =>
          set(
            'mortgage_status',
            e.target.value as IntakeFormData['mortgage_status']
          )
        }
        options={MORTGAGE_OPTIONS}
      />

      {/* Flexible on price */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Are you flexible on price?
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => set('flexible_on_price', true)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              form.flexible_on_price
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            )}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => set('flexible_on_price', false)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              !form.flexible_on_price
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            )}
          >
            No
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5">
      {/* Agent-specific fields first */}
      {mode === 'agent' && (
        <div className="space-y-5 pb-5 border-b border-slate-200">
          <Input
            id="client_name"
            label="Client Name"
            placeholder="Client's full name"
            value={form.client_name ?? ''}
            onChange={(e) => set('client_name', e.target.value)}
            error={errors.client_name}
            required
          />
          <Input
            id="client_email"
            label="Client Email"
            type="email"
            placeholder="client@example.com"
            value={form.client_email ?? ''}
            onChange={(e) => set('client_email', e.target.value)}
          />
          <div className="w-full">
            <label
              htmlFor="report_notes"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Report Notes
            </label>
            <textarea
              id="report_notes"
              rows={3}
              placeholder="Any notes for this report..."
              value={form.report_notes ?? ''}
              onChange={(e) => set('report_notes', e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Standard contact fields */}
      <Input
        id="customer_name"
        label="Full Name"
        placeholder="John Smith"
        value={form.customer_name}
        onChange={(e) => set('customer_name', e.target.value)}
        error={errors.customer_name}
        required
      />

      <Input
        id="customer_email"
        label="Email Address"
        type="email"
        placeholder="john@example.com"
        value={form.customer_email}
        onChange={(e) => set('customer_email', e.target.value)}
        error={errors.customer_email}
        required
      />

      {/* Homeowner-only fields */}
      {mode === 'homeowner' && (
        <>
          <Input
            id="phone"
            label="Phone Number"
            type="tel"
            placeholder="(555) 123-4567"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
          <Select
            id="referral_source"
            label="How did you hear about us?"
            value={form.referral_source}
            onChange={(e) => set('referral_source', e.target.value)}
            options={REFERRAL_OPTIONS}
            placeholder="Select one"
          />
        </>
      )}

      {/* Disclaimer */}
      <div className="pt-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.disclaimer_accepted}
            onChange={(e) => set('disclaimer_accepted', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <span className="text-sm text-slate-600 leading-snug">
            I understand this is AI-generated guidance and not legal or real estate
            advice.
          </span>
        </label>
        {errors.disclaimer_accepted && (
          <p className="mt-1 ml-7 text-xs text-red-600">
            {errors.disclaimer_accepted}
          </p>
        )}
      </div>
    </div>
  );

  const stepRenderers = [renderStep1, renderStep2, renderStep3];

  // ------- main render -------

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <ProgressIndicator currentStep={step} />

        <form onSubmit={handleSubmit}>
          {stepRenderers[step - 1]()}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-100">
            {step > 1 ? (
              <Button type="button" variant="secondary" onClick={goBack}>
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button type="button" onClick={goNext} disabled={addressValidating}>
                {addressValidating ? 'Verifying Address...' : 'Next'}
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? 'Submitting...'
                  : mode === 'homeowner'
                  ? 'Start Free 3-Day Trial'
                  : 'Generate Report'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
