import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import getStripe from '@/lib/stripe';

/**
 * POST /api/stripe/reactivate
 * Body: { report_id: string }
 *
 * For users whose subscription has fully ended (canceled, past_due, etc.)
 * Creates a new Stripe Checkout session that REUSES their existing
 * customer record — so their saved payment method is available and we
 * don't duplicate customers.
 *
 * No trial is granted on reactivation (they've already had theirs).
 * After checkout, the existing homeowner_subscription row is linked to
 * the new subscription ID via the webhook.
 *
 * Returns { url } to redirect to Stripe Checkout.
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
      .select('id, stripe_customer_id, email, name')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub || !sub.stripe_customer_id) {
      return NextResponse.json(
        { error: "No prior subscription found. Use the signup flow instead." },
        { status: 404 }
      );
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card', 'link'],
      customer: sub.stripe_customer_id,
      line_items: [
        {
          price: process.env.STRIPE_HOMEOWNER_SUB_PRICE_ID!,
          quantity: 1,
        },
      ],
      metadata: {
        report_id: reportId,
        customer_type: 'homeowner',
        trial_granted: 'false',
        reactivation: 'true',
      },
      // No trial on reactivation — they've already used it.
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/report/${reportId}?reactivated=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/report/${reportId}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reactivate failed' },
      { status: 500 }
    );
  }
}
