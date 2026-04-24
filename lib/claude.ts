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

// Model routing
// Sonnet 4.6 for quality-critical modules (pricing, legal, listing copy, improvements, buyer CMA, market snapshot)
// Haiku 4.5 for lower-stakes modules (timeline, social media, open house) — ~35-45% cost reduction
const MODEL_SONNET = 'claude-sonnet-4-6';
const MODEL_HAIKU  = 'claude-haiku-4-5-20251001';

// Per-module token ceilings. callClaude() auto-bumps by 50% on truncation.
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
// Shared property context block (CACHED across all module calls)
// ---------------------------------------------------------------------------

export interface PropertyContext {
  text: string;
}

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

export function buildPropertyContext(
  report: Report,
  rentcastData: RentcastData,
  amenities: NearbyAmenities | null
): PropertyContext {
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
        hoaMonthlyAmount: formMeta?.hoa_monthly_amount ?? report.hoa_monthly_amount ?? null,
      } : {
        hoaMonthlyAmount: report.hoa_monthly_amount ?? null,
      }),
    },
    rentcast:   trimmedRentcast,
    amenities:  trimmedAmenities,
    _dataFlags: {
      hasValuation: !!rentcastData.valuation,
      hasComps:     (rentcastData.valuation?.comparables?.length ?? 0) > 0,
      hasMarket:    !!rentcastData.market,
      hasAmenities: !!amenities,
    },
    today:      new Date().toISOString().split('T')[0],
  }, null, 0);

  return { text };
}

// ---------------------------------------------------------------------------
// Core callClaude — uses forced tool-use for reliable structured JSON output
//
// Instead of prompting "return raw JSON" and regex-parsing the response,
// we define a tool with a JSON schema and force Claude to call it. The SDK
// returns the structured input directly, eliminating all parsing failures.
// ---------------------------------------------------------------------------

interface CallClaudeOpts {
  systemPrompt: string;
  propertyContext: PropertyContext;
  modulePrompt: string;
  maxTokens: number;
  moduleName: string;
  outputSchema: Record<string, unknown>;
  model?: string;
  enableWebSearch?: boolean;
}

async function callClaude(opts: CallClaudeOpts): Promise<unknown | null> {
  const {
    systemPrompt,
    propertyContext,
    modulePrompt,
    moduleName,
    outputSchema,
    model = MODEL_SONNET,
    enableWebSearch = false,
  } = opts;
  let maxTokens = opts.maxTokens;

  const anthropic = getAnthropic();

  const returnTool = {
    name: 'return_module',
    description: `Return the structured ${moduleName} module output.`,
    input_schema: outputSchema,
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Build tools list — optionally include web search
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tools: any[] = [returnTool];
      if (enableWebSearch) {
        tools.push({
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3,
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages: any[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `PROPERTY CONTEXT (structured data for this report):\n${propertyContext.text}`,
              cache_control: { type: 'ephemeral' },
            },
            { type: 'text', text: modulePrompt },
          ],
        },
      ];

      // Multi-turn loop to handle web_search tool calls before final return_module
      const MAX_TURNS = enableWebSearch ? 5 : 1;
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const message = await anthropic.messages.create({
          model,
          max_tokens: maxTokens,
          system: [{
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          }],
          tools,
          tool_choice: enableWebSearch
            ? { type: 'auto' }
            : { type: 'tool', name: 'return_module' },
          messages,
        });

        // Check for return_module call first (terminal)
        const returnCall = message.content.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (b: any) => b.type === 'tool_use' && b.name === 'return_module'
        );
        if (returnCall && returnCall.type === 'tool_use') {
          return returnCall.input;
        }

        // Handle truncation
        if (message.stop_reason === 'max_tokens') {
          console.warn(`[${moduleName}] attempt ${attempt + 1} turn ${turn + 1}: truncated (max_tokens=${maxTokens})`);
          maxTokens = Math.min(Math.ceil(maxTokens * 1.5), 16384);
          break; // restart outer attempt with higher token budget
        }

        // If web search is enabled, loop: append assistant response + any tool_results
        // The SDK server-side handles web_search tool execution automatically in
        // newer API versions — we just pass through by appending the assistant message.
        if (enableWebSearch && message.stop_reason === 'tool_use') {
          messages.push({ role: 'assistant', content: message.content });
          // For server-executed tools (like web_search) the tool_result blocks are
          // already embedded in the response. Continue the loop and ask for final answer.
          messages.push({
            role: 'user',
            content: [{
              type: 'text',
              text: 'Now call return_module with the final structured output based on your research.',
            }],
          });
          continue;
        }

        console.error(`[${moduleName}] attempt ${attempt + 1} turn ${turn + 1}: no return_module block. stop_reason=${message.stop_reason}`);
        break;
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const statusCode = (error as { status?: number })?.status;
      console.error(`[${moduleName}] attempt ${attempt + 1} error (status=${statusCode}): ${errMsg}`);

      // If web search is the culprit (e.g., not enabled on account), disable it
      // and retry once without it rather than failing the module entirely.
      if (opts.enableWebSearch && /web_search|tool.*not.*available|invalid.*tool/i.test(errMsg)) {
        console.warn(`[${moduleName}] web search unavailable — falling back without it`);
        return callClaude({ ...opts, enableWebSearch: false });
      }

      if (statusCode === 401 || statusCode === 403 || statusCode === 404) {
        console.error(`[${moduleName}] non-retryable error (${statusCode}), aborting`);
        return null;
      }

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
// JSON Schemas for each module (enforced via tool-use)
// ---------------------------------------------------------------------------

const timelineSchema = {
  type: 'object',
  required: ['timeline_summary', 'recommended_list_date', 'phases', 'local_tips'],
  properties: {
    timeline_summary: { type: 'string' },
    recommended_list_date: { type: 'string' },
    recommended_list_day: { type: 'string' },
    estimated_close_date: { type: 'string' },
    phases: {
      type: 'array',
      items: {
        type: 'object',
        required: ['phase_number', 'label', 'duration', 'tasks'],
        properties: {
          phase_number: { type: 'integer' },
          label: { type: 'string' },
          duration: { type: 'string' },
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              required: ['task', 'description', 'priority', 'estimated_hours'],
              properties: {
                task: { type: 'string' },
                description: { type: 'string' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                estimated_hours: { type: 'number' },
              },
            },
          },
        },
      },
    },
    local_tips: { type: 'array', items: { type: 'string' } },
    seasonal_note: { type: 'string' },
  },
};

const improvementsSchema = {
  type: 'object',
  required: ['summary', 'recommendations', 'things_to_avoid', 'staging_tips'],
  properties: {
    summary: { type: 'string' },
    total_estimated_investment: { type: 'string' },
    potential_value_increase: { type: 'string' },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['area', 'recommendation', 'why', 'estimated_cost', 'estimated_roi', 'priority', 'diy_friendly', 'time_to_complete'],
        properties: {
          area: { type: 'string' },
          recommendation: { type: 'string' },
          why: { type: 'string' },
          estimated_cost: { type: 'string' },
          estimated_roi: { type: 'string' },
          priority: { type: 'integer' },
          diy_friendly: { type: 'boolean' },
          time_to_complete: { type: 'string' },
        },
      },
    },
    things_to_avoid: { type: 'array', items: { type: 'string' } },
    staging_tips: { type: 'array', items: { type: 'string' } },
  },
};

const pricingSchema = {
  type: 'object',
  required: ['pricing_summary', 'recommended_list_price', 'price_range', 'comparable_analysis', 'market_context', 'price_reduction_triggers'],
  properties: {
    pricing_summary: { type: 'string' },
    recommended_list_price: { type: 'number' },
    price_range: {
      type: 'object',
      required: ['aggressive', 'conservative'],
      properties: {
        aggressive: { type: 'number' },
        conservative: { type: 'number' },
      },
    },
    price_per_sqft: { type: 'number' },
    market_avg_ppsf: { type: 'number' },
    owner_price_assessment: { type: 'string' },
    days_on_market_prediction: { type: 'string' },
    negotiation_floor: { type: 'number' },
    pricing_strategy: { type: 'string' },
    comparable_analysis: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          address: { type: 'string' },
          sale_price: { type: 'number' },
          sqft: { type: 'number' },
          ppsf: { type: 'number' },
          beds: { type: 'number' },
          baths: { type: 'number' },
          sale_date: { type: 'string' },
          dom: { type: 'number' },
          distance: { type: 'string' },
          relevance: { type: 'string' },
        },
      },
    },
    market_context: { type: 'string' },
    price_reduction_triggers: { type: 'array', items: { type: 'string' } },
  },
};

const listingSchema = {
  type: 'object',
  required: ['headline', 'full_description', 'short_description', 'bullet_highlights', 'seo_keywords'],
  properties: {
    headline: { type: 'string' },
    tagline: { type: 'string' },
    full_description: { type: 'string' },
    short_description: { type: 'string' },
    bullet_highlights: { type: 'array', items: { type: 'string' } },
    open_house_description: { type: 'string' },
    seo_keywords: { type: 'array', items: { type: 'string' } },
    buyer_persona_targeted: { type: 'string' },
    lifestyle_angle: { type: 'string' },
  },
};

const legalSchema = {
  type: 'object',
  required: ['disclaimer', 'required_documents', 'state_disclosures', 'key_clauses_explained', 'closing_costs', 'attorney_referral'],
  properties: {
    disclaimer: { type: 'string' },
    attorney_referral_note: { type: 'string' },
    required_documents: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'description', 'why_needed', 'where_to_get'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          why_needed: { type: 'string' },
          where_to_get: { type: 'string' },
        },
      },
    },
    state_disclosures: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'description', 'statute_reference'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          statute_reference: { type: 'string' },
        },
      },
    },
    key_clauses_explained: {
      type: 'array',
      items: {
        type: 'object',
        required: ['clause', 'plain_english'],
        properties: {
          clause: { type: 'string' },
          plain_english: { type: 'string' },
        },
      },
    },
    closing_costs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['item', 'typical_range', 'paid_by'],
        properties: {
          item: { type: 'string' },
          typical_range: { type: 'string' },
          paid_by: { type: 'string', enum: ['Seller', 'Buyer', 'Negotiable'] },
        },
      },
    },
    attorney_referral: {
      type: 'object',
      required: ['intro', 'what_to_ask_them', 'typical_cost', 'when_to_call'],
      properties: {
        intro: { type: 'string' },
        what_to_ask_them: { type: 'array', items: { type: 'string' } },
        typical_cost: { type: 'string' },
        when_to_call: { type: 'string' },
      },
    },
  },
};

const socialMediaSchema = {
  type: 'object',
  required: ['instagram_caption', 'instagram_hashtags', 'facebook_post', 'twitter_post', 'linkedin_post', 'short_form_video_script', 'email_blast'],
  properties: {
    instagram_caption: { type: 'string' },
    instagram_hashtags: { type: 'array', items: { type: 'string' } },
    facebook_post: { type: 'string' },
    twitter_post: { type: 'string' },
    linkedin_post: { type: 'string' },
    short_form_video_script: { type: 'string' },
    email_blast: { type: 'string' },
  },
};

const buyerCMASchema = {
  type: 'object',
  required: ['executive_summary', 'property_highlights', 'comparable_sales', 'market_position', 'value_justification', 'investment_outlook', 'neighborhood_highlights', 'price_per_sqft_analysis'],
  properties: {
    executive_summary: { type: 'string' },
    property_highlights: { type: 'array', items: { type: 'string' } },
    comparable_sales: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          address: { type: 'string' },
          sale_price: { type: 'number' },
          sqft: { type: 'number' },
          ppsf: { type: 'number' },
          beds: { type: 'number' },
          baths: { type: 'number' },
          sale_date: { type: 'string' },
          condition_comparison: { type: 'string' },
          price_adjustment: { type: 'string' },
        },
      },
    },
    market_position: { type: 'string' },
    value_justification: { type: 'string' },
    investment_outlook: { type: 'string' },
    neighborhood_highlights: { type: 'array', items: { type: 'string' } },
    price_per_sqft_analysis: { type: 'string' },
  },
};

const openHouseSchema = {
  type: 'object',
  required: ['property_fact_sheet', 'feature_highlights', 'neighborhood_info', 'agent_talking_points', 'objection_handlers', 'follow_up_email_template'],
  properties: {
    property_fact_sheet: { type: 'string' },
    feature_highlights: { type: 'array', items: { type: 'string' } },
    neighborhood_info: { type: 'string' },
    agent_talking_points: { type: 'array', items: { type: 'string' } },
    objection_handlers: {
      type: 'array',
      items: {
        type: 'object',
        required: ['objection', 'response'],
        properties: {
          objection: { type: 'string' },
          response: { type: 'string' },
        },
      },
    },
    follow_up_email_template: { type: 'string' },
  },
};

const marketSnapshotSchema = {
  type: 'object',
  required: ['market_summary', 'inventory_level', 'market_trend', 'buyer_vs_seller_market', 'price_trend_narrative', 'best_time_to_list', 'key_insights'],
  properties: {
    market_summary: { type: 'string' },
    median_price: { type: 'number' },
    avg_price_per_sqft: { type: 'number' },
    avg_days_on_market: { type: 'number' },
    inventory_level: { type: 'string' },
    market_trend: { type: 'string', enum: ['Rising', 'Stable', 'Declining'] },
    buyer_vs_seller_market: { type: 'string' },
    price_trend_narrative: { type: 'string' },
    best_time_to_list: { type: 'string' },
    key_insights: { type: 'array', items: { type: 'string' } },
    comparable_recent_sales: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          address: { type: 'string' },
          price: { type: 'number' },
          sqft: { type: 'number' },
          beds: { type: 'number' },
          baths: { type: 'number' },
          sold_date: { type: 'string' },
          dom: { type: 'number' },
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Module 1 — Timeline  (Haiku 4.5)
// ---------------------------------------------------------------------------

export async function generateTimeline(
  report: Report,
  rentcastData: RentcastData,
  ctx: PropertyContext
): Promise<TimelineModule | null> {
  const state = report.property_state || 'the property\'s state';

  const system =
    'You are an expert real estate consultant creating a personalized home selling timeline. Be specific, practical, and market-aware for the property\'s state and region.';

  const prompt = `Using the property context above, create a FSBO selling timeline organized by phase.

The property is in ${state}. Provide advice specific to that state's market, laws, and buyer demographics.

Note: Check _dataFlags — if market data is unavailable, use your knowledge of regional market norms.

CONSTRAINTS:
- Use 4-6 phases (e.g., "Pre-Listing Prep", "Active Marketing", "Offer & Negotiation", "Under Contract", "Closing"), NOT individual weeks
- Each phase: 3-5 tasks MAX
- Each task description: 1-2 sentences MAX (under 30 words)
- timeline_summary: 2-3 sentences MAX
- local_tips: exactly 4 tips

Call the return_module tool with the structured output.`;

  return (await callClaude({
    systemPrompt: system,
    propertyContext: ctx,
    modulePrompt: prompt,
    maxTokens: MODULE_MAX_TOKENS.timeline,
    moduleName: 'timeline',
    outputSchema: timelineSchema,
    model: MODEL_HAIKU,
  })) as TimelineModule | null;
}

// ---------------------------------------------------------------------------
// Module 2 — Improvements  (Sonnet 4.6)
// ---------------------------------------------------------------------------

export async function generateImprovements(
  report: Report,
  rentcastData: RentcastData,
  ctx: PropertyContext
): Promise<ImprovementsModule | null> {
  const state = report.property_state || 'the property\'s state';

  const system =
    'You are an expert home stager and real estate consultant who specializes in maximizing FSBO sale prices through strategic low-cost improvements. Always prioritize ROI.';

  const prompt = `Using the property context above, recommend specific improvements to maximize sale price.

The property is in ${state}. Provide advice specific to that state's market, climate, and buyer demographics.

IMPORTANT: If the property context includes "otherImprovements" (e.g., pool added, new lanai, solar panels), factor those into your analysis. Do NOT recommend improvements already completed.

CONSTRAINTS:
- summary: 2-3 sentences MAX
- recommendations: exactly 5-7 items
- Each "recommendation" and "why" field: 1 sentence MAX
- things_to_avoid: exactly 3-4 items, 1 sentence each
- staging_tips: exactly 3-4 items, 1 sentence each

Call the return_module tool with the structured output.`;

  return (await callClaude({
    systemPrompt: system,
    propertyContext: ctx,
    modulePrompt: prompt,
    maxTokens: MODULE_MAX_TOKENS.improvements,
    moduleName: 'improvements',
    outputSchema: improvementsSchema,
    model: MODEL_SONNET,
  })) as ImprovementsModule | null;
}

// ---------------------------------------------------------------------------
// Module 3 — Pricing Analysis  (Sonnet 4.6)
// ---------------------------------------------------------------------------

export async function generatePricingAnalysis(
  report: Report,
  rentcastData: RentcastData,
  ctx: PropertyContext
): Promise<PricingModule | null> {
  const state = report.property_state || 'the property\'s state';

  const system =
    'You are a real estate pricing expert with deep knowledge of CMA (Comparative Market Analysis). Provide specific, data-driven pricing guidance based on real comp data.';

  const prompt = `Using the property context above, perform a Comparative Market Analysis for this FSBO property.

The property is in ${state}. Provide advice specific to that state's market, laws, and buyer demographics.

IMPORTANT: Check the _dataFlags in the context. If hasComps or hasMarket is false, the external market data API was unavailable. In that case:
- Use the seller's asking price and your knowledge of the regional market.
- Note in pricing_summary that comp data was limited.
- Do NOT fabricate comparable sales — leave comparable_analysis as an empty array.

CONSTRAINTS:
- pricing_summary: 2-3 sentences MAX
- owner_price_assessment: 1-2 sentences
- pricing_strategy: 2-3 sentences MAX
- comparable_analysis: MAX 5 comps. "relevance" field: 1 sentence each
- market_context: 2-3 sentences MAX
- price_reduction_triggers: exactly 3-4 items, 1 sentence each

Call the return_module tool with the structured output.`;

  return (await callClaude({
    systemPrompt: system,
    propertyContext: ctx,
    modulePrompt: prompt,
    maxTokens: MODULE_MAX_TOKENS.pricing,
    moduleName: 'pricing',
    outputSchema: pricingSchema,
    model: MODEL_SONNET,
  })) as PricingModule | null;
}

// ---------------------------------------------------------------------------
// Module 4 — Listing Copy  (Sonnet 4.6)
// ---------------------------------------------------------------------------

export async function generateListingCopy(
  report: Report,
  rentcastData: RentcastData,
  amenities: NearbyAmenities | null,
  ctx: PropertyContext
): Promise<ListingModule | null> {
  const state = report.property_state || 'the property\'s state';

  const system =
    "You are an elite real estate copywriter who writes MLS listing descriptions that generate immediate buyer interest. You understand buyer psychology for the property's state and region. You never use generic phrases like 'must see' or 'won't last long'.";

  const prompt = `Using the property context above (which includes amenity data), write compelling listing copy for this FSBO property.

The property is in ${state}. Tailor the copy to that state's buyer demographics and lifestyle appeal.

CONSTRAINTS:
- headline: under 15 words
- full_description: 200-250 words MAX
- short_description: 50-75 words
- bullet_highlights: exactly 8 items, each under 10 words
- seo_keywords: exactly 6 keywords
- buyer_persona_targeted: 1 sentence
- lifestyle_angle: 1-2 sentences

Call the return_module tool with the structured output.`;

  return (await callClaude({
    systemPrompt: system,
    propertyContext: ctx,
    modulePrompt: prompt,
    maxTokens: MODULE_MAX_TOKENS.listingCopy,
    moduleName: 'listing',
    outputSchema: listingSchema,
    model: MODEL_SONNET,
  })) as ListingModule | null;
}

// ---------------------------------------------------------------------------
// Module 5 — Legal Package  (Sonnet 4.6 + web search)
// ---------------------------------------------------------------------------

export async function generateLegalPackage(
  report: Report,
  ctx: PropertyContext
): Promise<LegalModule | null> {
  const state = report.property_state || 'the property\'s state';
  const address = `${report.property_address}, ${report.property_city}, ${state} ${report.property_zip}`;

  const system =
    'You are a real estate paralegal specializing in the property\'s state. Explain legal concepts in plain English for FSBO sellers. Be concise and practical. You have access to web search — use it to verify current state statute references and disclosure requirements.';

  const prompt = `For a FSBO home sale in ${state} at ${address}, provide state-specific legal guidance.

Use web search (up to 3 queries) to verify current ${state} real estate disclosure requirements, statute numbers, and closing procedures. Focus on primary-source references.

CONSTRAINTS:
- required_documents: 4-6 documents, description/why_needed/where_to_get: 1-2 sentences each
- state_disclosures: 3-5 disclosures with current statute references
- key_clauses_explained: exactly 5 clauses, plain_english: 1-2 sentences each
- closing_costs: 5-8 items
- attorney_referral: intro 1-2 sentences, what_to_ask_them exactly 4 items, typical_cost 1 sentence, when_to_call 1 sentence

After research, call the return_module tool with the structured output.`;

  return (await callClaude({
    systemPrompt: system,
    propertyContext: ctx,
    modulePrompt: prompt,
    maxTokens: MODULE_MAX_TOKENS.legal,
    moduleName: 'legal',
    outputSchema: legalSchema,
    model: MODEL_SONNET,
    enableWebSearch: true,
  })) as LegalModule | null;
}

// ---------------------------------------------------------------------------
// Module 6 — Social Media  (Haiku 4.5)
// ---------------------------------------------------------------------------

export async function generateSocialMedia(
  report: Report,
  rentcastData: RentcastData,
  amenities: NearbyAmenities | null,
  ctx: PropertyContext
): Promise<SocialMediaModule | null> {
  const state = report.property_state || 'the property\'s state';

  const system =
    'You are a top-performing real estate social media marketer. Write engaging, scroll-stopping social media content that drives inquiries. Know regional buyer demographics. Never use generic cliches.';

  const prompt = `Using the property context above, create social media marketing content for this listing.

The property is in ${state}. Tailor content to that state's buyer demographics and lifestyle appeal.

CONSTRAINTS:
- instagram_caption: 100-150 words MAX
- instagram_hashtags: exactly 10 hashtags
- facebook_post: 80-100 words MAX
- twitter_post: under 280 characters
- linkedin_post: 80-100 words MAX
- short_form_video_script: 100 words MAX
- email_blast: 100-150 words MAX

Call the return_module tool with the structured output.`;

  return (await callClaude({
    systemPrompt: system,
    propertyContext: ctx,
    modulePrompt: prompt,
    maxTokens: MODULE_MAX_TOKENS.socialMedia,
    moduleName: 'socialMedia',
    outputSchema: socialMediaSchema,
    model: MODEL_HAIKU,
  })) as SocialMediaModule | null;
}

// ---------------------------------------------------------------------------
// Module 7 — Buyer CMA  (Sonnet 4.6)
// ---------------------------------------------------------------------------

export async function generateBuyerCMA(
  report: Report,
  rentcastData: RentcastData,
  ctx: PropertyContext
): Promise<BuyerCMAModule | null> {
  const state = report.property_state || 'the property\'s state';

  const system =
    'You are a real estate agent creating a buyer-facing CMA presentation. Your goal is to justify the listing price with data and position the property as a strong value. Be professional, data-driven, and persuasive without being pushy.';

  const prompt = `Using the property context above, create a buyer-facing CMA presentation.

The property is in ${state}. Provide advice specific to that state's market and buyer demographics.

CONSTRAINTS:
- executive_summary: 2-3 sentences MAX
- property_highlights: exactly 6 items, under 10 words each
- comparable_sales: MAX 5 comps, condition_comparison and price_adjustment: 1 sentence each
- market_position: 2 sentences MAX
- value_justification: 2-3 sentences MAX
- investment_outlook: 2 sentences MAX
- neighborhood_highlights: exactly 5 items, under 10 words each
- price_per_sqft_analysis: 1-2 sentences MAX

Call the return_module tool with the structured output.`;

  return (await callClaude({
    systemPrompt: system,
    propertyContext: ctx,
    modulePrompt: prompt,
    maxTokens: MODULE_MAX_TOKENS.buyerCMA,
    moduleName: 'buyerCMA',
    outputSchema: buyerCMASchema,
    model: MODEL_SONNET,
  })) as BuyerCMAModule | null;
}

// ---------------------------------------------------------------------------
// Module 8 — Open House  (Haiku 4.5)
// ---------------------------------------------------------------------------

export async function generateOpenHouse(
  report: Report,
  rentcastData: RentcastData,
  amenities: NearbyAmenities | null,
  ctx: PropertyContext
): Promise<OpenHouseModule | null> {
  const state = report.property_state || 'the property\'s state';

  const system =
    'You are an experienced listing agent preparing for an open house. Create practical, professional materials that help the agent run a successful open house and convert visitors to offers.';

  const prompt = `Using the property context above, create an open house package.

The property is in ${state}. Tailor materials to that state's market and buyer demographics.

CONSTRAINTS:
- property_fact_sheet: 150 words MAX (bullet-style, not paragraphs)
- feature_highlights: exactly 8 items, under 10 words each
- neighborhood_info: 3-4 sentences MAX
- agent_talking_points: exactly 6 items, 1 sentence each
- objection_handlers: exactly 4 items, response: 1-2 sentences each
- follow_up_email_template: 100 words MAX

Call the return_module tool with the structured output.`;

  return (await callClaude({
    systemPrompt: system,
    propertyContext: ctx,
    modulePrompt: prompt,
    maxTokens: MODULE_MAX_TOKENS.openHouse,
    moduleName: 'openHouse',
    outputSchema: openHouseSchema,
    model: MODEL_HAIKU,
  })) as OpenHouseModule | null;
}

// ---------------------------------------------------------------------------
// Module 9 — Market Snapshot  (Sonnet 4.6 + web search)
// ---------------------------------------------------------------------------

export async function generateMarketSnapshot(
  report: Report,
  rentcastData: RentcastData,
  ctx: PropertyContext
): Promise<MarketSnapshotModule | null> {
  const state = report.property_state || 'the property\'s state';

  const system =
    'You are a real estate market analyst. Provide clear, data-driven market insights that help agents and sellers understand current conditions. Use the actual Rentcast market data provided AND web search to pull current market news/trends. Do not fabricate statistics — cite the data source.';

  const prompt = `Using the property context above (includes Rentcast market data) plus web search, create a current market snapshot.

The property is in ${state}. Use web search (up to 3 queries) to pull recent ${state} real estate market news, price trend reports, and inventory data from Q1-Q2 2026. Combine with the Rentcast data in the property context.

CONSTRAINTS:
- market_summary: 2-3 sentences MAX
- inventory_level: 1 sentence
- buyer_vs_seller_market: 1 sentence
- price_trend_narrative: 2 sentences MAX
- best_time_to_list: 1-2 sentences
- key_insights: exactly 5 items, 1 sentence each
- comparable_recent_sales: MAX 5 comps (use Rentcast comps from property context)

After research, call the return_module tool with the structured output.`;

  return (await callClaude({
    systemPrompt: system,
    propertyContext: ctx,
    modulePrompt: prompt,
    maxTokens: MODULE_MAX_TOKENS.marketSnapshot,
    moduleName: 'marketSnapshot',
    outputSchema: marketSnapshotSchema,
    model: MODEL_SONNET,
    enableWebSearch: true,
  })) as MarketSnapshotModule | null;
}
