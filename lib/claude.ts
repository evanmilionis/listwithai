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
  SocialMediaModule,
  BuyerCMAModule,
  OpenHouseModule,
  MarketSnapshotModule,
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
  timeline:       8192,
  improvements:   6000,
  pricing:        6000,
  listingCopy:    4096,
  legal:          8192,
  socialMedia:    4096,
  buyerCMA:       6000,
  openHouse:      4096,
  marketSnapshot: 4096,
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
  // Extract form metadata if stored in report_output
  const formMeta = (report.report_output as unknown as Record<string, unknown>)?.form_metadata as Record<string, unknown> | undefined;

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
      ...(formMeta ? {
        recentlyUpdated: formMeta.recently_updated,
        updatedAreas:    formMeta.updated_areas,
        otherImprovements: formMeta.other_improvements,
        homeFeatures:    formMeta.home_features,
        propertyType:    formMeta.property_type,
        yearBuilt:       formMeta.year_built,
        lotSize:         formMeta.lot_size,
        mortgageStatus:  formMeta.mortgage_status,
        flexibleOnPrice: formMeta.flexible_on_price,
      } : {}),
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

  for (let attempt = 0; attempt < 3; attempt++) {
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

      console.error(`Claude attempt ${attempt + 1}: could not parse JSON. First 300 chars:`, textBlock.text.substring(0, 300));
      console.error(`Claude attempt ${attempt + 1}: last 200 chars:`, textBlock.text.substring(textBlock.text.length - 200));
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
  // Strip markdown code fences if present
  const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '');

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    let jsonStr = cleaned.substring(start, end + 1);
    try {
      return JSON.parse(jsonStr);
    } catch {
      // Remove trailing commas before } or ]
      jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
      try {
        return JSON.parse(jsonStr);
      } catch {
        // Remove control characters (keep newlines/tabs)
        jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, (ch) =>
          ch === '\n' || ch === '\r' || ch === '\t' ? ch : ''
        );
        try {
          return JSON.parse(jsonStr);
        } catch {
          // Replace unescaped newlines inside string values
          jsonStr = jsonStr.replace(/"(?:[^"\\]|\\.)*"/g, (match) =>
            match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
          );
          try {
            return JSON.parse(jsonStr);
          } catch (e) {
            console.error('Failed to parse JSON:', (e as Error).message, jsonStr.substring(0, 300));
            return null;
          }
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

IMPORTANT: If the property context includes "otherImprovements" (e.g., pool added, new lanai, solar panels), factor those into your analysis. Acknowledge what the seller has already done, estimate how those improvements affect value, and adjust your recommendations accordingly. Do NOT recommend improvements the seller has already completed.

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

// ---------------------------------------------------------------------------
// Module 6 — Social Media
// ---------------------------------------------------------------------------

export async function generateSocialMedia(
  report: Report,
  rentcastData: RentcastData,
  amenities: NearbyAmenities | null,
  ctx: PropertyContext
): Promise<SocialMediaModule | null> {
  const system =
    'You are a top-performing real estate social media marketer. Write engaging, scroll-stopping social media content that drives inquiries. Know Florida buyer demographics. Never use generic cliches.';

  const prompt = `Using the property context above, create social media marketing content for this listing.

Return JSON with this exact structure:
{
  "instagram_caption": "string (engaging, emoji-friendly, 150-200 words with line breaks)",
  "instagram_hashtags": ["string (15-20 relevant hashtags)"],
  "facebook_post": "string (conversational, 100-150 words, designed for engagement)",
  "twitter_post": "string (under 280 characters, punchy)",
  "linkedin_post": "string (professional tone, 100-150 words, targets investors/relocators)",
  "short_form_video_script": "string (30-60 second script for Reels/TikTok with shot directions)",
  "email_blast": "string (HTML-friendly email body, 150-200 words, with clear CTA)"
}`;

  return (await callClaude(system, ctx, prompt, MODULE_MAX_TOKENS.socialMedia)) as SocialMediaModule | null;
}

// ---------------------------------------------------------------------------
// Module 7 — Buyer CMA
// ---------------------------------------------------------------------------

export async function generateBuyerCMA(
  report: Report,
  rentcastData: RentcastData,
  ctx: PropertyContext
): Promise<BuyerCMAModule | null> {
  const system =
    'You are a Florida real estate agent creating a buyer-facing CMA presentation. Your goal is to justify the listing price with data and position the property as a strong value. Be professional, data-driven, and persuasive without being pushy.';

  const prompt = `Using the property context above, create a buyer-facing Comparative Market Analysis presentation that an agent can share with potential buyers to justify the listing price.

Return JSON with this exact structure:
{
  "executive_summary": "string (2-3 sentences positioning the property and price)",
  "property_highlights": ["string (8-10 key selling points)"],
  "comparable_sales": [
    {
      "address": "string",
      "sale_price": 0,
      "sqft": 0,
      "ppsf": 0,
      "beds": 0,
      "baths": 0,
      "sale_date": "string",
      "condition_comparison": "string (how this comp compares to subject property)",
      "price_adjustment": "string (why subject is priced higher/lower than this comp)"
    }
  ],
  "market_position": "string (where this property sits in the market — above/below/at market value and why)",
  "value_justification": "string (3-4 sentences explaining why the price is fair/competitive)",
  "investment_outlook": "string (appreciation potential, rental potential, market trajectory)",
  "neighborhood_highlights": ["string (5-7 neighborhood selling points)"],
  "price_per_sqft_analysis": "string (how this property's $/sqft compares to area average)"
}`;

  return (await callClaude(system, ctx, prompt, MODULE_MAX_TOKENS.buyerCMA)) as BuyerCMAModule | null;
}

// ---------------------------------------------------------------------------
// Module 8 — Open House
// ---------------------------------------------------------------------------

export async function generateOpenHouse(
  report: Report,
  rentcastData: RentcastData,
  amenities: NearbyAmenities | null,
  ctx: PropertyContext
): Promise<OpenHouseModule | null> {
  const system =
    'You are an experienced Florida listing agent preparing for an open house. Create practical, professional materials that help the agent run a successful open house and convert visitors to offers.';

  const prompt = `Using the property context above, create a complete open house package.

Return JSON with this exact structure:
{
  "property_fact_sheet": "string (formatted property overview suitable for a one-page handout — include address, beds, baths, sqft, year built, lot size, price, key features, HOA info if applicable)",
  "feature_highlights": ["string (10-12 standout features to emphasize during tours)"],
  "neighborhood_info": "string (paragraph about the neighborhood — schools, dining, shopping, lifestyle)",
  "agent_talking_points": ["string (8-10 key talking points for the agent during showings)"],
  "objection_handlers": [
    {
      "objection": "string (common buyer objection)",
      "response": "string (professional response)"
    }
  ],
  "follow_up_email_template": "string (email to send to open house visitors after the event)"
}`;

  return (await callClaude(system, ctx, prompt, MODULE_MAX_TOKENS.openHouse)) as OpenHouseModule | null;
}

// ---------------------------------------------------------------------------
// Module 9 — Market Snapshot
// ---------------------------------------------------------------------------

export async function generateMarketSnapshot(
  report: Report,
  rentcastData: RentcastData,
  ctx: PropertyContext
): Promise<MarketSnapshotModule | null> {
  const system =
    'You are a Florida real estate market analyst. Provide clear, data-driven market insights that help agents and sellers understand current conditions. Use the actual market data provided — do not fabricate statistics.';

  const prompt = `Using the property context above (which includes real market data), create a neighborhood/market snapshot report.

Return JSON with this exact structure:
{
  "market_summary": "string (3-4 sentence overview of current market conditions in this area)",
  "median_price": 0,
  "avg_price_per_sqft": 0,
  "avg_days_on_market": 0,
  "inventory_level": "string (Low/Moderate/High with context)",
  "market_trend": "Rising|Stable|Declining",
  "buyer_vs_seller_market": "string (which type and why)",
  "price_trend_narrative": "string (how prices have moved recently and where they're heading)",
  "best_time_to_list": "string (seasonal advice for this specific Florida market)",
  "key_insights": ["string (5-7 actionable market insights)"],
  "comparable_recent_sales": [
    {
      "address": "string",
      "price": 0,
      "sqft": 0,
      "beds": 0,
      "baths": 0,
      "sold_date": "string",
      "dom": 0
    }
  ]
}`;

  return (await callClaude(system, ctx, prompt, MODULE_MAX_TOKENS.marketSnapshot)) as MarketSnapshotModule | null;
}
