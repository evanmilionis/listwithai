import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── KILL SWITCH ───────────────────────────────────────────────────────────
// The product has been shut down. While true, every page, API route, the
// Stripe webhook, and the daily cron return a 410 "ended" response BEFORE any
// app code runs — so no Supabase, Stripe, Claude, Rentcast, Google Places,
// Decor8, or Resend calls are ever made. This page renders with zero API keys
// and no database, so it keeps working after all services are deleted/revoked.
const SITE_DISABLED = true;

const ENDED_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>ListAI — This product has ended</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    background:#0b0f17;color:#e6edf3}
  .card{max-width:480px;padding:40px;text-align:center}
  h1{font-size:22px;margin:0 0 12px}p{color:#9aa7b5;line-height:1.6;margin:0}
</style></head>
<body><div class="card">
  <h1>This product has ended</h1>
  <p>ListAI is no longer available. Thanks to everyone who used it.</p>
</div></body></html>`;

// Simple in-memory rate limiter (resets on cold start — good enough for launch)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute per IP for API routes

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

// Clean up old entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((value, key) => {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  });
}, 60 * 1000);

export function middleware(request: NextRequest) {
  // ── Kill switch: short-circuit everything; the product has ended ──
  if (SITE_DISABLED) {
    return new NextResponse(ENDED_HTML, {
      status: 410,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  const response = NextResponse.next();

  // ── Security headers ──
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // ── Rate limiting for API routes (except webhook — Stripe needs reliable access) ──
  if (
    request.nextUrl.pathname.startsWith('/api/') &&
    !request.nextUrl.pathname.startsWith('/api/stripe/webhook')
  ) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files and _next
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
