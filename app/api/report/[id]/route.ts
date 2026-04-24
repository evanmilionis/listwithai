import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * Fetch a report by ID.
 *
 * Homeowner reports include an `access_status` field derived from the linked
 * homeowner_subscription. Values:
 *   - 'trialing' → in 3-day free trial, full access
 *   - 'active'   → paid subscription, full access
 *   - 'expired'  → trial ended w/o conversion, or canceled, or past_due
 *                  → client should render a resubscribe gate
 *   - 'none'     → no linked subscription yet (webhook hasn't fired)
 *                  → treat as trialing during the brief race window
 *
 * Agent reports always return access_status = 'active' (the agent's sub is
 * checked in the dashboard layout, not per-report).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: report, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Derive access_status for homeowner reports
    let access_status: 'trialing' | 'active' | 'expired' | 'none' = 'active';

    if (report.customer_type === 'homeowner') {
      const { data: sub } = await supabase
        .from('homeowner_subscriptions')
        .select('status')
        .eq('report_id', report.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sub) {
        // Subscription record hasn't been created yet (race between checkout
        // redirect and webhook). Treat as trialing — access is allowed while
        // the webhook catches up. Once the webhook fires, this flips to the
        // real status on next fetch.
        access_status = 'none';
      } else {
        const s = String(sub.status).toLowerCase();
        if (s === 'trialing') access_status = 'trialing';
        else if (s === 'active') access_status = 'active';
        else access_status = 'expired';   // canceled, past_due, incomplete_expired, unpaid
      }
    }

    return NextResponse.json({ ...report, access_status });
  } catch (error) {
    console.error('Report fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}
