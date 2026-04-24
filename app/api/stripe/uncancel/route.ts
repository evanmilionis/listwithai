import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import getStripe from '@/lib/stripe';

/**
 * POST /api/stripe/uncancel
 * Body: { report_id: string }
 *
 * Reverses a pending cancellation on a subscription that was scheduled
 * to cancel at period end. Sets cancel_at_period_end=false so the
 * subscription continues normally.
 *
 * Only works while the subscription is still active/trialing (i.e. the
 * period hasn't ended yet). For fully-ended subscriptions, use
 * /api/stripe/reactivate instead.
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
      .select('id, stripe_subscription_id')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub || !sub.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No subscription found for this report.' },
        { status: 404 }
      );
    }

    const stripe = getStripe();
    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    return NextResponse.json({ success: true, status: updated.status });
  } catch (error) {
    console.error('Uncancel subscription error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Uncancel failed' },
      { status: 500 }
    );
  }
}
