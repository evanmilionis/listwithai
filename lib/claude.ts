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

// Per-module token ceilings.
// These are starting limits — callClaude() auto-bumps by 50% on truncation.
// Note: max_tokens only charges for tokens actually GENERATED, not reserved,
// so setting these a bit higher than needed has zero cost impact.
const MODULE_MAX_TOKENS = {
  timeline:       12000,
  improvements:   10000,
  pricing:        10000,
  listingCopy:    8192,
  legal:          12000,
  socialMedia:    8192,
  buyerCMA:       10000,
  openHouse:      8192,
  marketSnapshot: 8192,
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

/** Trim Rentcast payload to only the fields Claude actually uses.
 *  Returns a safe object even when all Rentcast endpoints returned null. */
function trimRentcast(r: RentcastData) {
  return {
    estimatedValue: r.valuation?.price ?? null,
    priceRangeLow:  r.valuation?.priceLow ?? null,
    priceRangeHigh: r.valuation?.priceHigh ?? null,
    yearBuilt:      r.property?.yearBuilt ?? null,
    comps: (r.valuation?.comparables ?? []).slice(0, 5).map((c) => ({
      address:    c.formattedAddress ?? c.addressLine1 ?? 'Unknown',
      price:      c.price ?? c.lastSalePrice ?? null,
      sqft:       c.squareFootage ?? null,
      beds:       c.bedrooms ?? null,
      baths:      c.bathrooms ?? null,
      soldDate:   c.lastSaleDate ?? null,
      dom:        c.daysOnMarket ?? null,
      distanceMi: c.distance ?? null,
    })),
    market: {
      medianDom:        r.market?.medianDaysOnMarket ?? null,
      averagePrice:     r.market?.averagePrice ?? null,
      avgPricePerSqft:  r.market?.averagePricePerSquareFoot ?? null,
      activeListings:   r.market?.activeListingCount ?? null,
      saleToListRatio:  r.market?.saleToListPriceRatio ?? null,
    },
    _dataAvailable: !!(r.valuation || r.market),
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

  const trimmedRentcast = trimRentcast(rentcastData);
  const trimmedAmenities = trimAmenities(amenities);

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
    rentcast:   trimmedRentcast,
    amenities:  trimmedAmenities,
    // Tell Claude explicitly when external data is missing so it adapts
    _dataFlags: {
      hasValuation: !!rentcastData.valuation,
      hasComps:     (rentcastData.valuation?.comparables?.length ?? 0) > 0,
      hasMarket:    !!rentcastData.market,
      hasAmenities: !!amenities,
    },
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
  maxTokens: number,
  moduleName: string = 'unknown'
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
            text: systemPrompt + '\n\nIMPORTANT: Return ONLY raw JSON. Do NOT wrap in markdown code blocks. Do NOT use ```json. Start your response with { and end with }. Keep your total response under 8000 characters. Be concise in all string values — favor clarity over length.',
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

      // Check for refusal or empty response
      if (message.stop_reason === 'end_turn' && message.content.length === 0) {
        console.error(`[${moduleName}] attempt ${attempt + 1}: empty response from Claude`);
        continue;
      }

      const textBlock = message.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        console.error(`[${moduleName}] attempt ${attempt + 1}: no text block in response. stop_reason=${message.stop_reason}`);
        continue;
      }

      // ── Truncation detection ──────────────────────────────────────
      // If stop_reason is 'max_tokens', the JSON is incomplete — parsing
      // will always fail. Retry with a higher ceiling and a "be concise"
      // nudge so the model fits within the limit.
      if (message.stop_reason === 'max_tokens') {
        console.warn(`[${moduleName}] attempt ${attempt + 1}: TRUNCATED (hit max_tokens=${maxTokens}, output=${textBlock.text.length} chars). Retrying with +50% tokens and conciseness nudge.`);
        // Bump limit by 50% for the next attempt (capped at 16384)
        maxTokens = Math.min(Math.ceil(maxTokens * 1.5), 16384);
        // Append conciseness instruction for next attempt
        if (!modulePrompt.includes('TOKEN BUDGET WARNING')) {
          modulePrompt += '\n\nTOKEN BUDGET WARNING: Your previous response was too long and got cut off. Be MORE CONCISE. Use shorter descriptions. Limit each task description to 1-2 sentences. Do NOT sacrifice required JSON fields — just use fewer words in string values.';
        }
        continue;
      }

      const parsed = extractJSON(textBlock.text);
      if (parsed) return parsed;

      console.error(`[${moduleName}] attempt ${attempt + 1}: JSON parse failed. stop_reason=${message.stop_reason}, length=${textBlock.text.length}`);
      console.error(`[${moduleName}] first 300 chars:`, textBlock.text.substring(0, 300));
      console.error(`[${moduleName}] last 200 chars:`, textBlock.text.substring(textBlock.text.length - 200));
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const statusCode = (error as { status?: number })?.status;
      console.error(`[${moduleName}] attempt ${attempt + 1} error (status=${statusCode}): ${errMsg}`);

      // Don't retry on auth/model errors — they won't resolve
      if (statusCode === 401 || statusCode === 403 || statusCode === 404) {
        console.error(`[${moduleName}] non-retryable error (${statusCode}), aborting`);
        return null;
      }

      // Back off before retry on rate limits
      if (statusCode === 429 && attempt < 2) {
        const wait = (attempt + 1) * 2000;
        console.log(`[${moduleName}] rate limited, waiting ${wait}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, wait));
      }
    }
  }

  console.error(`[${moduleName}] all 3 attempts failed`);
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

  const prompt = `Using the property context above, create a FSBO selling timeline organized by phase (not individual weeks).

Note: Check _dataFlags — if market data is unavailable, use your knowledge of Florida market norms for timeline estimates.

STRICT OUTPUT CONSTRAINTS:
- Use 4-6 phases (e.g., "Pre-Listing Prep", "Active Marketing", "Offer & Negotiation", "Under Contract", "Closing"), NOT individual weeks
- Each phase: 3-5 tasks MAX
- Each task description: 1-2 sentences MAX (under 30 words)
- timeline_summary: 2-3 sentences MAX
- florida_specific_tips: exactly 4 tips
- Keep total response under 3000 words

Return JSON with this exact structure:
{
  "timeline_summary": "string (2-3 sentences)",
  "recommended_list_date": "YYYY-MM-DD",
  "recommended_list_day": "string",
  "estimated_close_date": "YYYY-MM-DD",
  "phases": [
    {
      "phase_number": 1,
      "label": "string (e.g. Pre-Listing Prep)",
      "duration": "string (e.g. Weeks 1-2)",
      "tasks": [
        {
          "task": "string (short action item)",
          "description": "string (1-2 sentences, under 30 words)",
          "priority": "high|medium|low",
          "estimated_hours": 0
        }
      ]
    }
  ],
  "florida_specific_tips": ["string"],
  "seasonal_note": "string"
}`;

  return (await callClaude(system, ctx, prompt, MODULE_MAX_TOKENS.timeline, 'timeline')) as TimelineModule | null;
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

IMPORTANT: If the property context includes "otherImprovements" (e.g., pool added, new lanai, solar panels), factor those into your analysis. Acknowledge what the seller has already done and do NOT recommend improvements already completed.

STRICT OUTPUT CONSTRAINTS:
- summary: 2-3 sentences MAX
- recommendations: exactly 5-7 items (not more)
- Each "recommendation", "why" field: 1 sentence MAX
- things_to_avoid: exactly 3-4 items, 1 sentence each
- florida_staging_tips: exactly 3-4 items, 1 sentence each

Return JSON with this exact structure:
{
  "summary": "string (2-3 sentences)",
  "total_estimated_investment": "string",
  "potential_value_increase": "string",
  "recommendations": [
    {
      "area": "string",
      "recommendation": "string (1 sentence)",
      "why": "string (1 sentence)",
      "estimated_cost": "string",
      "estimated_roi": "string",
      "priority": 1,
      "diy_friendly": true,
      "time_to_complete": "string"
    }
  ],
  "things_to_avoid": ["string (1 sentence each, 3-4 items)"],
  "florida_staging_tips": ["string (1 sentence each, 3-4 items)"]
}`;

  return (await callClaude(system, ctx, prompt, MODULE_MAX_TOKENS.improvements, 'improvements')) as ImprovementsModule | null;
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

  const prompt = `Using the property context above, perform a Comparative Market Analysis for this Florida FSBO property.

IMPORTANT: Check the _dataFlags in the context. If hasComps or hasMarket is false, the external market data API was unavailable. In that case:
- Use the seller's asking price and your knowledge of the Florida market.
- Note in pricing_summary that comp data was limited.
- Do NOT fabricate comparable sales — leave comparable_analysis as an empty array.

STRICT OUTPUT CONSTRAINTS:
- pricing_summary: 2-3 sentences MAX
- owner_price_assessment: 1-2 sentences
- pricing_strategy: 2-3 sentences MAX
- comparable_analysis: MAX 5 comps. "relevance" field: 1 sentence each
- florida_market_context: 2-3 sentences MAX
- price_reduction_triggers: exactly 3-4 items, 1 sentence each

Return JSON with this exact structure:
{
  "pricing_summary": "string (2-3 sentences)",
  "recommended_list_price": 0,
  "price_range": { "aggressive": 0, "conservative": 0 },
  "price_per_sqft": 0,
  "market_avg_ppsf": 0,
  "owner_price_assessment": "string (1-2 sentences)",
  "days_on_market_prediction": "string",
  "negotiation_floor": 0,
  "pricing_strategy": "string (2-3 sentences)",
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
      "relevance": "string (1 sentence)"
    }
  ],
  "florida_market_context": "string (2-3 sentences)",
  "price_reduction_triggers": ["string (1 sentence each, 3-4 items)"]
}`;

  return (await callClaude(system, ctx, prompt, MODULE_MAX_TOKENS.pricing, 'pricing')) as PricingModule | null;
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

STRICT OUTPUT CONSTRAINTS:
- headline: under 15 words
- full_description: 200-250 words MAX (not 350)
- short_description: 50-75 words
- bullet_highlights: exactly 8 items, each under 10 words
- seo_keywords: exactly 6 keywords
- buyer_persona_targeted: 1 sentence
- florida_lifestyle_angle: 1-2 sentences

Return JSON with this exact structure:
{
  "headline": "string (under 15 words)",
  "tagline": "string",
  "full_description": "string (200-250 words MAX)",
  "short_description": "string (50-75 words)",
  "bullet_highlights": ["string (exactly 8 items, under 10 words each)"],
  "open_house_description": "string (2-3 sentences)",
  "seo_keywords": ["string (exactly 6)"],
  "buyer_persona_targeted": "string (1 sentence)",
  "florida_lifestyle_angle": "string (1-2 sentences)"
}`;

  return (await callClaude(system, ctx, prompt, MODULE_MAX_TOKENS.listingCopy, 'listing')) as ListingModule | null;
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

  const advisory = await callClaude(system, ctx, prompt, 1500, 'legal') as {
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

STRICT OUTPUT CONSTRAINTS:
- instagram_caption: 100-150 words MAX
- instagram_hashtags: exactly 10 hashtags
- facebook_post: 80-100 words MAX
- twitter_post: under 280 characters
- linkedin_post: 80-100 words MAX
- short_form_video_script: 100 words MAX
- email_blast: 100-150 words MAX

Return JSON with this exact structure:
{
  "instagram_caption": "string (100-150 words)",
  "instagram_hashtags": ["string (exactly 10)"],
  "facebook_post": "string (80-100 words)",
  "twitter_post": "string (under 280 chars)",
  "linkedin_post": "string (80-100 words)",
  "short_form_video_script": "string (100 words MAX)",
  "email_blast": "string (100-150 words)"
}`;

  return (await callClaude(system, ctx, prompt, MODULE_MAX_TOKENS.socialMedia, 'socialMedia')) as SocialMediaModule | null;
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

  const prompt = `Using the property context above, create a buyer-facing CMA presentation.

STRICT OUTPUT CONSTRAINTS:
- executive_summary: 2-3 sentences MAX
- property_highlights: exactly 6 items, under 10 words each
- comparable_sales: MAX 5 comps, condition_comparison and price_adjustment: 1 sentence each
- market_position: 2 sentences MAX
- value_justification: 2-3 sentences MAX
- investment_outlook: 2 sentences MAX
- neighborhood_highlights: exactly 5 items, under 10 words each
- price_per_sqft_analysis: 1-2 sentences MAX

Return JSON with this exact structure:
{
  "executive_summary": "string (2-3 sentences)",
  "property_highlights": ["string (exactly 6 items)"],
  "comparable_sales": [
    {
      "address": "string",
      "sale_price": 0,
      "sqft": 0,
      "ppsf": 0,
      "beds": 0,
      "baths": 0,
      "sale_date": "string",
      "condition_comparison": "string (1 sentence)",
      "price_adjustment": "string (1 sentence)"
    }
  ],
  "market_position": "string (2 sentences)",
  "value_justification": "string (2-3 sentences)",
  "investment_outlook": "string (2 sentences)",
  "neighborhood_highlights": ["string (exactly 5 items)"],
  "price_per_sqft_analysis": "string (1-2 sentences)"
}`;

  return (await callClaude(system, ctx, prompt, MODULE_MAX_TOKENS.buyerCMA, 'buyerCMA')) as BuyerCMAModule | null;
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

  const prompt = `Using the property context above, create an open house package.

STRICT OUTPUT CONSTRAINTS:
- property_fact_sheet: 150 words MAX (bullet-style, not paragraphs)
- feature_highlights: exactly 8 items, under 10 words each
- neighborhood_info: 3-4 sentences MAX
- agent_talking_points: exactly 6 items, 1 sentence each
- objection_handlers: exactly 4 items, response: 1-2 sentences each
- follow_up_email_template: 100 words MAX

Return JSON with this exact structure:
{
  "property_fact_sheet": "string (150 words MAX, bullet-style)",
  "feature_highlights": ["string (exactly 8 items)"],
  "neighborhood_info": "string (3-4 sentences)",
  "agent_talking_points": ["string (exactly 6 items)"],
  "objection_handlers": [
    {
      "objection": "string",
      "response": "string (1-2 sentences)"
    }
  ],
  "follow_up_email_template": "string (100 words MAX)"
}`;

  return (await callClaude(system, ctx, prompt, MODULE_MAX_TOKENS.openHouse, 'openHouse')) as OpenHouseModule | null;
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

  const prompt = `Using the property context above (which includes real market data), create a market snapshot.

STRICT OUTPUT CONSTRAINTS:
- market_summary: 2-3 sentences MAX
- inventory_level: 1 sentence
- buyer_vs_seller_market: 1 sentence
- price_trend_narrative: 2 sentences MAX
- best_time_to_list: 1-2 sentences
- key_insights: exactly 5 items, 1 sentence each
- comparable_recent_sales: MAX 5 comps

Return JSON with this exact structure:
{
  "market_summary": "string (2-3 sentences)",
  "median_price": 0,
  "avg_price_per_sqft": 0,
  "avg_days_on_market": 0,
  "inventory_level": "string (1 sentence)",
  "market_trend": "Rising|Stable|Declining",
  "buyer_vs_seller_market": "string (1 sentence)",
  "price_trend_narrative": "string (2 sentences)",
  "best_time_to_list": "string (1-2 sentences)",
  "key_insights": ["string (exactly 5 items, 1 sentence each)"],
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

  return (await callClaude(system, ctx, prompt, MODULE_MAX_TOKENS.marketSnapshot, 'marketSnapshot')) as MarketSnapshotModule | null;
}
