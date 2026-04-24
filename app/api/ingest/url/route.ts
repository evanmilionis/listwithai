import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/ingest/url
 *
 * Body: { url: string }
 *
 * Fetches a Zillow / Redfin / Realtor.com listing page and extracts
 * structured property data via Claude.
 *
 * Strategy (in priority order):
 *   1. Firecrawl scrape API (bypasses bot detection — works on Zillow).
 *      Requires FIRECRAWL_API_KEY env var.
 *   2. Direct fetch() fallback if Firecrawl isn't configured or errors.
 *      Works on Redfin/Realtor.com, usually blocked by Zillow.
 *   3. Claude extracts structured fields from the returned content via
 *      forced tool-use.
 */

const ALLOWED_HOSTS = [
  'zillow.com', 'www.zillow.com',
  'redfin.com', 'www.redfin.com',
  'realtor.com', 'www.realtor.com',
];

const extractionSchema: Anthropic.Messages.Tool.InputSchema = {
  type: 'object',
  properties: {
    property_address: { type: 'string', description: 'Street address only, e.g. "123 Main St"' },
    property_city:    { type: 'string' },
    property_state:   { type: 'string', description: 'Two-letter state code, e.g. "FL"' },
    property_zip:     { type: 'string' },
    property_type:    { type: 'string', enum: ['Single Family', 'Condo', 'Townhouse', 'Multi-Family'] },
    beds:             { type: 'integer' },
    baths:            { type: 'number' },
    sqft:             { type: 'integer' },
    year_built:       { type: 'integer' },
    lot_size:         { type: 'number', description: 'Lot size in acres (convert from sqft if needed)' },
    asking_price:     { type: 'integer' },
    hoa_monthly_amount: { type: 'integer', description: 'HOA in dollars per month, 0 if none' },
    home_features:    { type: 'string', description: 'A comma-separated list of notable features mentioned (e.g. "Pool, 2-car garage, lanai, updated kitchen")' },
    confidence:       { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['confidence'],
};

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (!ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`) || h.endsWith(host))) {
      return NextResponse.json(
        { error: 'Only Zillow, Redfin, or Realtor.com URLs are supported right now.' },
        { status: 400 }
      );
    }

    // Try Firecrawl first (handles Zillow bot detection), fall back to direct fetch
    let content: string | null = null;
    let source: 'firecrawl' | 'direct' | null = null;
    let lastError: string | null = null;

    if (process.env.FIRECRAWL_API_KEY) {
      try {
        content = await scrapeWithFirecrawl(parsed.toString());
        source = 'firecrawl';
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.warn(`[ingest/url] Firecrawl failed for ${parsed.toString()}: ${lastError}`);
      }
    }

    if (!content) {
      try {
        content = await scrapeWithDirectFetch(parsed.toString());
        source = 'direct';
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.warn(`[ingest/url] Direct fetch failed for ${parsed.toString()}: ${lastError}`);
      }
    }

    if (!content) {
      const hint = process.env.FIRECRAWL_API_KEY
        ? "Couldn't read the listing. Please fill the form manually."
        : "Zillow blocks direct access. Please fill the form manually, or ask support to enable premium scraping.";
      return NextResponse.json({ error: hint, detail: lastError }, { status: 502 });
    }

    // Ask Claude for structured extraction
    const apiKey = process.env.LISTAI_CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Claude API key not configured' }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      tools: [{
        name: 'return_listing',
        description: 'Return structured fields extracted from the listing page.',
        input_schema: extractionSchema,
      }],
      tool_choice: { type: 'tool', name: 'return_listing' },
      messages: [{
        role: 'user',
        content: [{
          type: 'text',
          text: `Extract property fields from this real estate listing. Omit any field you cannot find with high certainty — do NOT guess. Set confidence based on how much you could extract.

URL: ${parsed.toString()}
HOST: ${host}
SOURCE: ${source}

CONTENT:
${content.slice(0, 45_000)}`,
        }],
      }],
    });

    const toolUse = message.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json(
        { error: "Couldn't parse the listing page. Please fill manually." },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: toolUse.input, source });
  } catch (error) {
    console.error('Ingest URL error:', error);
    return NextResponse.json({ error: 'Failed to ingest listing' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Scraper implementations
// ---------------------------------------------------------------------------

/** Firecrawl scrape — uses residential proxies + JS rendering, bypasses most
 *  bot detection including Zillow's. Returns LLM-optimized markdown. */
async function scrapeWithFirecrawl(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY not set');

  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 2000,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Firecrawl ${res.status}: ${body.slice(0, 200)}`);
  }

  const payload = (await res.json()) as {
    success?: boolean;
    data?: { markdown?: string; html?: string };
    error?: string;
  };

  if (!payload.success || !payload.data?.markdown) {
    throw new Error(`Firecrawl returned no content: ${payload.error || 'unknown'}`);
  }

  return payload.data.markdown;
}

/** Direct fetch with a realistic browser UA. Works for Redfin / Realtor.com.
 *  Usually blocked by Zillow. */
async function scrapeWithDirectFetch(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return trimHtml(html);
}

/** Trim raw HTML to ~40KB, prioritizing structured data blocks. */
function trimHtml(html: string): string {
  const MAX = 40_000;

  const jsonLd: string[] = [];
  const jsonLdRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = jsonLdRe.exec(html)) !== null) {
    jsonLd.push(m[1].trim().slice(0, 5000));
  }

  const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/);
  const nextData = nextDataMatch ? nextDataMatch[1].trim().slice(0, 15_000) : '';

  const textual = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const bodyMatch = textual.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyText = (bodyMatch ? bodyMatch[1] : textual).slice(0, 20_000);

  const combined = [
    jsonLd.length > 0 ? `=== JSON-LD ===\n${jsonLd.join('\n---\n')}` : '',
    nextData ? `=== __NEXT_DATA__ ===\n${nextData}` : '',
    `=== BODY TEXT ===\n${bodyText}`,
  ].filter(Boolean).join('\n\n');

  return combined.slice(0, MAX);
}
