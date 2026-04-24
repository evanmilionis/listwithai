import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import getStripe from '@/lib/stripe';

/**
 * Fetch a report by ID.
 *
 * For homeowner reports, we join the latest homeowner_subscription AND
 * (when needed) call Stripe to get fresh state (cancel_at_period_end,
 * current_period_end). Exposes:
 *
 *   access_status:
 *     'trialing'           → in 3-day trial, full access
 *     'active'             → paid, full access
 *     'expired'            → no access (canceled / past_due / etc)
 *     'none'               → no sub row yet (webhook race window) → treat as access
 *
 *   cancel_at_period_end: boolean — true if the user clicked Cancel during
 *     trial/active period. Access continues until the period end, then expires.
 *   current_period_end:   ISO timestamp — when the trial / billing cycle ends
 *   can_reactivate:       true only when access_status === 'expired' AND a
 *     stripe_customer_id exists to reuse.
 *
 * Agent reports always return access_status = 'active'.
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

    let access_status: 'trialing' | 'active' | 'expired' | 'none' = 'active';
    let cancel_at_period_end = false;
    let current_period_end: string | null = null;
    let can_reactivate = false;

    if (report.customer_type === 'homeowner') {
      const { data: sub } = await supabase
        .from('homeowner_subscriptions')
        .select('status, stripe_subscription_id, stripe_customer_id')
        .eq('report_id', report.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sub) {
        access_status = 'none';
      } else {
        const s = String(sub.status).toLowerCase();
        if (s === 'trialing') access_status = 'trialing';
        else if (s === 'active') access_status = 'active';
        else access_status = 'expired';

        // If a customer record exists, reactivation is possible from expired state
        if (access_status === 'expired' && sub.stripe_customer_id) {
          can_reactivate = true;
        }

        // For active/trialing subs, fetch live Stripe data to get
        // cancel_at_period_end + current_period_end. This is the source
        // of truth since webhooks can lag.
        if ((access_status === 'trialing' || access_status === 'active') && sub.stripe_subscription_id) {
          try {
            const stripe = getStripe();
            const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
            cancel_at_period_end = !!stripeSub.cancel_at_period_end;

            // Stripe moved current_period_end between SDK versions. Check both
            // top-level and the first subscription item.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const stripeSubAny = stripeSub as any;
            const periodEnd: number | undefined =
              stripeSubAny.current_period_end ??
              stripeSubAny.items?.data?.[0]?.current_period_end ??
              stripeSubAny.trial_end;
            if (typeof periodEnd === 'number') {
              current_period_end = new Date(periodEnd * 1000).toISOString();
            }
          } catch (err) {
            console.warn('Failed to fetch Stripe subscription state:', err);
          }
        }
      }
    }

    return NextResponse.json({
      ...report,
      access_status,
      cancel_at_period_end,
      current_period_end,
      can_reactivate,
    });
  } catch (error) {
    console.error('Report fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}
