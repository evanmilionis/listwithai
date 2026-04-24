import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * GET /m/[id]
 *
 * QR-code landing handler for OpenClaw Mailer postcards.
 *
 * When a recipient scans their postcard QR:
 *   1. Log a row in mail_scans (per-scan event).
 *   2. On the corresponding mailer_leads row:
 *       - set qr_scanned_at (first scan only)
 *       - increment qr_scan_count
 *       - flip status to 'scanned' (if it was 'mailed')
 *   3. Redirect to /homeowner with mailer attribution UTM + lead_id
 *      so the eventual signup links back to the postcard that brought them.
 *
 * Runtime is 'nodejs' because we use the service-role Supabase client.
 * Caching is off — every scan must hit the DB.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const destination = new URL('/homeowner', req.nextUrl.origin);
  destination.searchParams.set('utm_source', 'mailer');
  destination.searchParams.set('utm_medium', 'postcard');
  destination.searchParams.set('utm_campaign', 'openclaw');
  destination.searchParams.set('lead_id', id);

  // Fire-and-forget the tracking write — don't block the redirect on it.
  (async () => {
    try {
      const supabase = createServiceClient();

      // Log the scan event
      await supabase.from('mail_scans').insert({
        lead_id: id,
        user_agent: req.headers.get('user-agent') ?? null,
        ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        referrer: req.headers.get('referer') ?? null,
      });

      // Update the lead row
      const { data: lead } = await supabase
        .from('mailer_leads')
        .select('id, status, qr_scanned_at, qr_scan_count')
        .eq('id', id)
        .maybeSingle();

      if (lead) {
        const updates: Record<string, unknown> = {
          qr_scan_count: (lead.qr_scan_count ?? 0) + 1,
        };
        if (!lead.qr_scanned_at) {
          updates.qr_scanned_at = new Date().toISOString();
        }
        // Upgrade status only if currently past mailing
        if (lead.status === 'mailed' || lead.status === 'delivered') {
          updates.status = 'scanned';
        }
        await supabase.from('mailer_leads').update(updates).eq('id', id);
      }
    } catch (err) {
      // Don't let tracking errors block the user
      console.error('[mailer-tracker] failed to log scan:', err);
    }
  })();

  return NextResponse.redirect(destination, { status: 302 });
}
