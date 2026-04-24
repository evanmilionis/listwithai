import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import getStripe from '@/lib/stripe';

/**
 * POST /api/stripe/cancel
 * Body: { report_id: string }
 *
 * Cancels the homeowner subscription associated with a report. We use
 * `cancel_at_period_end = true` so:
 *   - During trial → access continues through day 3, then subscription ends
 *     with NO charge.
 *   - During paid period → access continues through the end of the current
 *     billing cycle (user already paid for it), then subscription ends.
 *
 * User can reverse this (uncancel) via /api/stripe/uncancel before the end
 * date — subscription reactivates with no gap.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const reportId = String(body.report_id || '');
    if (!reportId) {
      return NextResponse.json({ error: 'report_id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: sub } = await supabase
      .from('homeowner_subscriptions')
      .select('id, stripe_subscription_id, status')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub || !sub.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found for this report.' },
        { status: 404 }
      );
    }

    const stripe = getStripe();
    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedAny = updated as any;
    const cancelAt: number | null =
      updated.cancel_at ??
      updatedAny.current_period_end ??
      updatedAny.items?.data?.[0]?.current_period_end ??
      null;

    return NextResponse.json({
      success: true,
      cancel_at: cancelAt,
      status: updated.status,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cancel failed' },
      { status: 500 }
    );
  }
}
