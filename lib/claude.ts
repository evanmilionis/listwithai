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
import { getConditionLabel } from '@/lib/utils';

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

const MODEL = 'claude-haiku-4-5-20251001';

// Per-module token ceilings — kept tight to speed up generation
const MODULE_MAX_TOKENS = {
  timeline:       2048,
  improvements:   2048,
  pricing:        2048,
  listingCopy:    2048,
  legal:          1500,
  socialMedia:    2048,
  buyerCMA:       2048,
  openHouse:      2048,
  marketSnapshot: 1500,
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callClaude(
  systemPrompt: string,
  propertyContext: PropertyContext,
  modulePrompt: string,
  maxTokens: number
): Promise<unknown | null> {
  const anthropic = getAnthropic();

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const start = Date.now();
      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: maxTokens,

        // Cache the system prompt — identical across retries
        system: [
          {
            type: 'text',
            text: systemPrompt + '\n\nIMPORTANT: Return ONLY raw JSON. Do NOT wrap in markdown code blocks. Do NOT use ```json. Be MAXIMALLY CONCISE — keep every string value to 1 sentence. Arrays should have 3-5 items max unless the schema says otherwise. No filler, no fluff, no redundancy.',
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
          // Prefill forces the model to continue from '{' — guarantees JSON output
          {
            role: 'assistant',
            content: [{ type: 'text', text: '{' }],
          },
        ],
      });

      console.log(`Claude call succeeded in ${Date.now() - start}ms (attempt ${attempt + 1}, stop=${message.stop_reason}, tokens=${message.usage?.output_tokens})`);

      const textBlock = message.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') return null;

      // Prepend '{' because we prefilled the assistant response with it
      const fullText = '{' + textBlock.text;

      // Try normal parse first
      const parsed = extractJSON(fullText);
      if (parsed) return parsed;

      // If truncated (hit max_tokens), try repairing the JSON
      if (message.stop_reason === 'max_tokens') {
        console.warn(`Claude response truncated at ${message.usage?.output_tokens} tokens — attempting JSON repair`);
        const repaired = repairTruncatedJSON(fullText);
        const repairedParsed = extractJSON(repaired);
        if (repairedParsed) {
          console.log('Truncated JSON repaired successfully');
          return repairedParsed;
        }
        console.error('JSON repair failed');
      }

      console.error(`Claude attempt ${attempt + 1}: could not parse JSON. First 300 chars:`, fullText.substring(0, 300));
      console.error(`Claude attempt ${attempt + 1}: last 200 chars:`, fullText.substring(fullText.length - 200));
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Claude attempt ${attempt + 1} error (status=${status}): ${msg}`);

      // Exponential backoff on rate limit (429) or overload (529)
      if ((status === 429 || status === 529) && attempt < 1) {
        const delay = (attempt + 1) * 2000; // 2s, 4s
        console.log(`Rate limited — waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Truncated JSON repair — closes open strings, arrays, and objects
// ---------------------------------------------------------------------------

function repairTruncatedJSON(text: string): string {
  // Find the JSON start
  const start = text.indexOf('{');
  if (start === -1) return text;

  let json = text.substring(start);

  // If we're inside an unclosed string, close it
  let inString = false;
  let escaped = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') inString = !inString;
  }
  if (inString) json += '"';

  // Remove any trailing partial key-value (e.g. `"key": "incomple`)
  // by trimming back to the last complete value
  json = json.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}[\]]*$/, '');

  // Count open braces/brackets and close them
  let openBraces = 0;
  let openBrackets = 0;
  inString = false;
  escaped = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') openBraces++;
    if (ch === '}') openBraces--;
    if (ch === '[') openBrackets++;
    if (ch === ']') openBrackets--;
  }

  // Remove trailing comma before we close
  json = json.replace(/,\s*$/, '');

  for (let i = 0; i < openBrackets; i++) json += ']';
  for (let i = 0; i < openBraces; i++) json += '}';

  return json;
}

// ---------------------------------------------------------------------------
// JSON extraction helper
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

  const prompt = `Using the property context above, create a FSBO selling timeline. Keep it tight: MAX 6 phases (not individual weeks), MAX 3 tasks per phase, 1 sentence per description.

Return JSON with this exact structure:
{
  "timeline_summary": "1-2 sentence overview",
  "recommended_list_date": "YYYY-MM-DD",
  "recommended_list_day": "string",
  "estimated_close_date": "YYYY-MM-DD",
  "weeks": [
    {
      "week_number": 1,
      "label": "Phase name (e.g. Weeks 1-2: Prep)",
      "tasks": [
        {
          "task": "short task name",
          "description": "1 sentence",
          "priority": "high|medium|low",
          "estimated_hours": 0
        }
      ]
    }
  ],
  "florida_specific_tips": ["string (max 3)"],
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
  "full_description": "string (150-200 words)",
  "short_description": "string (40-60 words)",
  "bullet_highlights": ["string (5-6 items)"],
  "open_house_description": "string",
  "seo_keywords": ["string"],
  "buyer_persona_targeted": "string",
  "florida_lifestyle_angle": "string"
}`;

  return (await callClaude(system, ctx, prompt, MODULE_MAX_TOKENS.listingCopy)) as ListingModule | null;
}

// ---------------------------------------------------------------------------
// Module 5 — Legal / Attorney Referral
//
// No Claude call needed — returns static attorney referral guidance instantly.
// Legal document templates have been removed to speed up generation.
// ---------------------------------------------------------------------------

export async function generateLegalPackage(
  _report: Report,
  _ctx: PropertyContext
): Promise<LegalModule | null> {
  return {
    disclaimer:
      'This information is for general guidance only and does NOT constitute legal advice. Consult a licensed Florida real estate attorney before entering any binding agreement.',
    attorney_referral_note:
      'Florida law does not require an attorney for residential closings, but it is strongly recommended for FSBO sellers. A real estate attorney typically charges $400–$1,000 for contract review and closing oversight — a small cost relative to a transaction of this size.',
    florida_attorney_referral: {
      intro: 'Find a Florida Bar-certified real estate attorney in your county. Many offer free initial consultations for FSBO sellers.',
      what_to_ask_them: [
        'Do you handle FSBO closings?',
        'What is your flat fee for contract review and closing oversight?',
        'Can you act as closing agent?',
        'Do you review purchase agreements before the seller signs?',
      ],
      typical_cost: '$400–$1,000 depending on complexity',
      when_to_call: 'Before listing your property or accepting any offer',
    },
  };
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
  "instagram_caption": "string (80-120 words with emojis)",
  "instagram_hashtags": ["string (10 relevant hashtags)"],
  "facebook_post": "string (60-80 words)",
  "twitter_post": "string (under 280 characters)",
  "linkedin_post": "string (60-80 words, professional)",
  "short_form_video_script": "string (30 second script, brief shot directions)",
  "email_blast": "string (80-120 words with clear CTA)"
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
  "property_highlights": ["string (5-6 key selling points)"],
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
  "neighborhood_highlights": ["string (3-5 neighborhood selling points)"],
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
  "feature_highlights": ["string (5-6 standout features)"],
  "neighborhood_info": "string (paragraph about the neighborhood — schools, dining, shopping, lifestyle)",
  "agent_talking_points": ["string (5-6 key talking points)"],
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
  "key_insights": ["string (3-5 actionable market insights)"],
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
