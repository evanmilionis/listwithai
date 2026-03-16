import Anthropic from '@anthropic-ai/sdk';
import type {
  Report,
  RentcastData,
  NearbyAmenities,
  TimelineModule,
  ImprovementsModule,
  PricingModule,
  ListingModule,
  LegalModule,
} from '@/types';
import { getConditionLabel, formatCurrency } from '@/lib/utils';
import { buildLegalDocuments, type TemplateVars } from '@/lib/legalTemplates';

// ---------------------------------------------------------------------------
// Client (singleton — one instance for the entire report generation run)
// ---------------------------------------------------------------------------

let _anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!_anthropic) {
    const apiKey = process.env.LISTAI_CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('LISTAI_CLAUDE_API_KEY (or ANTHROPIC_API_KEY) is not set');
    }
    _anthropic = new Anthropic({ apiKey });
  }
  return _anthropic;
}

const MODEL = 'claude-sonnet-4-6';

// Per-module token ceilings — sized to what each module actually needs.
// Cuts wasteful reserved-but-unused tokens billed on every call.
const MODULE_MAX_TOKENS = {
  timeline:     3000,
  improvements: 2500,
  pricing:      2500,
  listingCopy:  2000,
  legal:        8192, // templates are genuinely long; was 16384 — halved
} as const;

// ---------------------------------------------------------------------------
// Shared property context block (CACHED across all 5 module calls)
//
// This is the key cost lever. All 5 modules receive identical property data.
// By marking it cache_control: ephemeral, calls 2-5 pay ~10% of input cost
// for this block instead of 100%. Cache TTL is 5 min — well within the
// sequential run window.
// ---------------------------------------------------------------------------

export interface PropertyContext {
  /** Pre-built, trimmed string sent as the first (cached) user content block */
  text: string;
}

/** Trim Rentcast payload to only the fields Claude actually uses */
function trimRentcast(r: RentcastData) {
  return {
    estimatedValue: r.valuation?.price,
    priceRangeLow:  r.valuation?.priceLow,
    priceRangeHigh: r.valuation?.priceHigh,
    yearBuilt:      r.property?.yearBuilt,
    comps: (r.valuation?.comparables ?? []).slice(0, 5).map((c) => ({
      address:    c.formattedAddress ?? c.addressLine1 ?? 'Unknown',
      price:      c.price ?? c.lastSalePrice,
      sqft:       c.squareFootage,
      beds:       c.bedrooms,
      baths:      c.bathrooms,
      soldDate:   c.lastSaleDate,
      dom:        c.daysOnMarket,
      distanceMi: c.distance,
    })),
    market: {
      medianDom:        r.market?.medianDaysOnMarket,
      averagePrice:     r.market?.averagePrice,
      avgPricePerSqft:  r.market?.averagePricePerSquareFoot,
      activeListings:   r.market?.activeListingCount,
      saleToListRatio:  r.market?.saleToListPriceRatio,
    },
  };
}

/** Trim Google Places payload to only the fields Claude actually uses */
function trimAmenities(a: NearbyAmenities | null) {
  if (!a) return null;
  const pick = (item: { name?: string; distance_miles?: number } | null | undefined) =>
    item ? { name: item.name, distMi: item.distance_miles } : null;
  return {
    grocery:           pick(a.grocery),
    hospital:          pick(a.hospital),
    school:            pick(a.school),
    beach:             pick(a.beach),
    shopping:          pick(a.shopping),
    restaurantsCount:  a.restaurants_count,
  };
}

/**
 * Build the shared property context string once, before running any modules.
 * Pass the result into every generate* call so the cached block is identical.
 */
export function buildPropertyContext(
  report: Report,
  rentcastData: RentcastData,
  amenities: NearbyAmenities | null
): PropertyContext {
  const text = JSON.stringify({
    property: {
      address:      `${report.property_address}, ${report.property_city}, ${report.property_state} ${report.property_zip}`,
      beds:         report.beds,
      baths:        report.baths,
      sqft:         report.sqft,
      conditionScore: report.condition_score,
      conditionLabel: getConditionLabel(report.condition_score),
      askingPrice:  report.asking_price,
      targetClose:  report.target_close_date,
      sellerName:   report.customer_name,
    },
    rentcast:   trimRentcast(rentcastData),
    amenities:  trimAmenities(amenities),
    today:      new Date().toISOString().split('T')[0],
  }, null, 0); // no pretty-print — saves tokens

  return { text };
}

// ---------------------------------------------------------------------------
// Core callClaude — uses prompt caching on both system + property context
// ---------------------------------------------------------------------------

async function callClaude(
  systemPrompt: string,
  propertyContext: PropertyContext,
  modulePrompt: string,
  maxTokens: number
): Promise<unknown | null> {
  const anthropic = getAnthropic();

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: maxTokens,

        // Cache the system prompt — identical across retries
        system: [
          {
            type: 'text',
            text: systemPrompt + '\n\nIMPORTANT: Return ONLY raw JSON. Do NOT wrap in markdown code blocks. Do NOT use ```json. Start your response with { and end with }.',
            cache_control: { type: 'ephemeral' },
          },
        ],

        messages: [
          {
            role: 'user',
            content: [
              // Block 1: shared property data — CACHED across all 5 module calls
              {
                type: 'text',
                text: `PROPERTY CONTEXT (structured data for this report):\n${propertyContext.text}`,
                cache_control: { type: 'ephemeral' },
              },
              // Block 2: module-specific instruction — NOT cached (unique per module)
              {
                type: 'text',
                text: modulePrompt,
              },
            ],
          },
        ],
      });

      const textBlock = message.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') return null;

      const parsed = extractJSON(textBlock.text);
      if (parsed) return parsed;

      console.error(`Claude attempt ${attempt + 1}: could not parse JSON`);
    } catch (error) {
      console.error(`Claude attempt ${attempt + 1} error:`, error);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// JSON extraction helper (unchanged — already solid)
// ---------------------------------------------------------------------------

function extractJSON(text: string): unknown | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const jsonStr = text.substring(start, end + 1);
    try {
      return JSON.parse(jsonStr);
    } catch {
      let cleaned = jsonStr.replace(/,\s*([}\]])/g, '$1');
      try {
        return JSON.parse(cleaned);
      } catch {
        cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (ch) =>
          ch === '\n' || ch === '\r' || ch === '\t' ? ch : ''
        );
        try {
          return JSON.parse(cleaned);
        } catch (e) {
          console.error('Failed to parse JSON:', (e as Error).message, jsonStr.substring(0, 300));
          return null;
        }
      }
    }
  }
  console.error('No JSON object found. First 200 chars:', text.substring(0, 200));
  return null;
}

// ---------------------------------------------------------------------------
// Module 1 — Timeline
// ---------------------------------------------------------------------------

export async function generateTimeline(
  report: Report,
  rentcastData: RentcastData,
  ctx: PropertyContext
): Promise<TimelineModule | null> {
  const system =
    'You are an expert Florida real estate consultant creating a personalized home selling timeline. Be specific, practical, and Florida-market aware. Format output as structured JSON.';

  const prompt = `Using the property context above, create a detailed week-by-week FSBO selling timeline.

Return JSON with this exact structure:
{
  "timeline_summary": "string",
  "recommended_list_date": "YYYY-MM-DD",
  "recommended_list_day": "string",
  "estimated_close_date": "YYYY-MM-DD",
  "weeks": [
    {
      "week_number": 1,
      "label": "string",
      "tasks": [
        {
          "task": "string",
          "description": "string",
          "priority": "high|medium|low",
          "estimated_hours": 0
        }
      ]
    }
  ],
  "florida_specific_tips": ["string"],
  "seasonal_note": "string"
}`;

  return (await callClaude(system, ctx, prompt, MODULE_MAX_TOKENS.timeline)) as TimelineModule | null;
}

// ---------------------------------------------------------------------------
// Module 2 — Improvements
// ---------------------------------------------------------------------------

export async function generateImprovements(
  report: Report,
  rentcastData: RentcastData,
  ctx: PropertyContext
): Promise<ImprovementsModule | null> {
  const system =
    'You are an expert Florida home stager and real estate consultant who specializes in maximizing FSBO sale prices through strategic low-cost improvements. Always prioritize ROI.';

  const prompt = `Using the property context above, recommend specific improvements to maximize sale price.

Return JSON with this exact structure:
{
  "summary": "string",
  "total_estimated_investment": "string",
  "potential_value_increase": "string",
  "recommendations": [
    {
      "area": "string",
      "recommendation": "string",
      "why": "string",
      "estimated_cost": "string",
      "estimated_roi": "string",
      "priority": 1,
      "diy_friendly": true,
      "time_to_complete": "string"
    }
  ],
  "things_to_avoid": ["string"],
  "florida_staging_tips": ["string"]
}`;

  return (await callClaude(system, ctx, prompt, MODULE_MAX_TOKENS.improvements)) as ImprovementsModule | null;
}

// ---------------------------------------------------------------------------
// Module 3 — Pricing Analysis
// ---------------------------------------------------------------------------

export async function generatePricingAnalysis(
  report: Report,
  rentcastData: RentcastData,
  ctx: PropertyContext
): Promise<PricingModule | null> {
  const system =
    'You are a Florida real estate pricing expert with deep knowledge of CMA (Comparative Market Analysis). Provide specific, data-driven pricing guidance based on real comp data.';

  const prompt = `Using the property context above (which includes comp sales and market data), perform a Comparative Market Analysis for this Florida FSBO property.

Return JSON with this exact structure:
{
  "pricing_summary": "string",
  "recommended_list_price": 0,
  "price_range": { "aggressive": 0, "conservative": 0 },
  "price_per_sqft": 0,
  "market_avg_ppsf": 0,
  "owner_price_assessment": "string",
  "days_on_market_prediction": "string",
  "negotiation_floor": 0,
  "pricing_strategy": "string",
  "comparable_analysis": [
    {
      "address": "string",
      "sale_price": 0,
      "sqft": 0,
      "ppsf": 0,
      "beds": 0,
      "baths": 0,
      "sale_date": "string",
      "dom": 0,
      "distance": "string",
      "relevance": "string"
    }
  ],
  "florida_market_context": "string",
  "price_reduction_triggers": ["string"]
}`;

  return (await callClaude(system, ctx, prompt, MODULE_MAX_TOKENS.pricing)) as PricingModule | null;
}

// ---------------------------------------------------------------------------
// Module 4 — Listing Copy
// ---------------------------------------------------------------------------

export async function generateListingCopy(
  report: Report,
  rentcastData: RentcastData,
  amenities: NearbyAmenities | null,
  ctx: PropertyContext
): Promise<ListingModule | null> {
  const system =
    "You are an elite Florida real estate copywriter who writes MLS listing descriptions that generate immediate buyer interest. You understand Florida buyer psychology — snowbirds, retirees, young families, investors. You never use generic phrases like 'must see' or 'won't last long'.";

  const prompt = `Using the property context above (which includes amenity data), write compelling listing copy for this Florida FSBO property.

Return JSON with this exact structure:
{
  "headline": "string",
  "tagline": "string",
  "full_description": "string (250-350 words)",
  "short_description": "string (50-75 words)",
  "bullet_highlights": ["string (8-10 items)"],
  "open_house_description": "string",
  "seo_keywords": ["string"],
  "buyer_persona_targeted": "string",
  "florida_lifestyle_angle": "string"
}`;

  return (await callClaude(system, ctx, prompt, MODULE_MAX_TOKENS.listingCopy)) as ListingModule | null;
}

// ---------------------------------------------------------------------------
// Module 5 — Legal Package
//
// Templates are pre-written in lib/legalTemplates.ts — variables are filled
// at runtime. Claude only generates the plain-English clause explanations and
// attorney referral advisory, which is a much smaller / faster call.
// ---------------------------------------------------------------------------

export async function generateLegalPackage(
  report: Report,
  ctx: PropertyContext
): Promise<LegalModule | null> {

  // Step 1: Fill templates instantly — no Claude needed for the document text
  const vars: TemplateVars = {
    PROPERTY_ADDRESS: report.property_address,
    PROPERTY_CITY:    report.property_city,
    PROPERTY_STATE:   report.property_state ?? 'FL',
    PROPERTY_ZIP:     report.property_zip,
    SELLER_NAME:      report.customer_name,
    ASKING_PRICE:     formatCurrency(report.asking_price),
    TARGET_CLOSE_DATE: report.target_close_date ?? 'TBD',
    CURRENT_DATE:     new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    COUNTY:           report.property_city, // best approximation without county field
  };

  const documents = buildLegalDocuments(vars);

  // Step 2: Small Claude call — only for clause explanations + attorney advisory
  // This replaces the massive "write entire contracts from scratch" call
  const system =
    'You are a Florida real estate paralegal. Explain legal concepts in plain English for FSBO sellers. Be concise and practical. Return only raw JSON.';

  const prompt = `For a Florida FSBO home sale at ${vars.PROPERTY_ADDRESS}, provide:
1. Plain-English explanations of the 5 most important clauses in a FL purchase agreement
2. Attorney referral guidance

Return JSON with this exact structure:
{
  "key_clauses_explained": [
    { "clause": "string", "plain_english": "string" }
  ],
  "florida_attorney_referral": {
    "intro": "string",
    "what_to_ask_them": ["string"],
    "typical_cost": "string",
    "when_to_call": "string"
  }
}`;

  const advisory = await callClaude(system, ctx, prompt, 1500) as {
    key_clauses_explained: { clause: string; plain_english: string }[];
    florida_attorney_referral: {
      intro: string;
      what_to_ask_them: string[];
      typical_cost: string;
      when_to_call: string;
    };
  } | null;

  // Step 3: Attach clause explanations to the first document (Purchase Agreement)
  const documentsWithExplanations = documents.map((doc, i) => ({
    ...doc,
    key_clauses_explained: i === 0 ? (advisory?.key_clauses_explained ?? []) : [],
  }));

  return {
    disclaimer:
      'IMPORTANT: These are template documents for informational purposes only. They do NOT constitute legal advice and MUST be reviewed by a licensed Florida real estate attorney before use.',
    attorney_referral_note:
      'Florida law does not require an attorney for residential closings, but it is strongly recommended for FSBO sellers. A real estate attorney typically charges $400–$1,000 for contract review and closing oversight — a small cost relative to a transaction of this size.',
    documents: documentsWithExplanations,
    florida_attorney_referral: advisory?.florida_attorney_referral ?? {
      intro: 'Find a Florida Bar-certified real estate attorney in your county.',
      what_to_ask_them: [
        'Do you handle FSBO closings?',
        'What is your flat fee for contract review?',
        'Can you act as closing agent?',
      ],
      typical_cost: '$400–$1,000 depending on complexity',
      when_to_call: 'Before accepting any offer',
    },
  } as unknown as LegalModule;
}
