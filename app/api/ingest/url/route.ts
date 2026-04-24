import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 45;

/**
 * POST /api/ingest/url
 *
 * Body: { url: string }
 *
 * Fetches a Zillow / Redfin / Realtor.com listing page, extracts
 * structured property data via Claude, and returns the fields in a
 * shape that maps directly onto the IntakeForm state.
 *
 * Strategy:
 *   1. Fetch with a realistic browser User-Agent.
 *   2. Strip <script>, <style>, inline JSON blobs down to a reasonable
 *      size (Zillow pages can be ~1MB raw).
 *   3. Ask Claude via forced tool-use to pull structured fields.
 *   4. Return a normalized object.
 *
 * If the fetch is blocked or parsing fails, return a clean 502 so the
 * client can show a "couldn't read that URL — fill manually" hint.
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

    // Fetch with a realistic browser UA
    let html: string;
    try {
      const fetchRes = await fetch(parsed.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });

      if (!fetchRes.ok) {
        return NextResponse.json(
          { error: `Couldn't read the listing (${fetchRes.status}). Please fill the form manually.` },
          { status: 502 }
        );
      }
      html = await fetchRes.text();
    } catch {
      return NextResponse.json(
        { error: "Couldn't reach the listing page. Please fill the form manually." },
        { status: 502 }
      );
    }

    // Trim the HTML to what Claude actually needs — ~40KB ceiling.
    // Prioritize JSON-LD and __NEXT_DATA__ blocks if present; these carry
    // most of the structured fields.
    const trimmed = trimHtml(html);

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
          text: `Extract property fields from this listing page HTML. Omit any field you cannot find with high certainty — do NOT guess. Set confidence based on how much you could extract.

URL: ${parsed.toString()}
HOST: ${host}

HTML (trimmed):
${trimmed}`,
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

    return NextResponse.json({ data: toolUse.input });
  } catch (error) {
    console.error('Ingest URL error:', error);
    return NextResponse.json({ error: 'Failed to ingest listing' }, { status: 500 });
  }
}

/**
 * Trim raw HTML to under ~40KB while preserving structured data blocks.
 * Strategy: keep any <script type="application/ld+json"> blocks and any
 * __NEXT_DATA__ blocks; strip everything else aggressively.
 */
function trimHtml(html: string): string {
  const MAX = 40_000;

  // 1. Pull out JSON-LD blocks
  const jsonLd: string[] = [];
  const jsonLdRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = jsonLdRe.exec(html)) !== null) {
    jsonLd.push(m[1].trim().slice(0, 5000));
  }

  // 2. Pull out __NEXT_DATA__ (Zillow uses Next.js)
  const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/);
  const nextData = nextDataMatch ? nextDataMatch[1].trim().slice(0, 15_000) : '';

  // 3. Strip all <script> and <style> blocks from the body
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
