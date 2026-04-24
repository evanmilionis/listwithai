import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import getStripe from '@/lib/stripe';

/**
 * POST /api/stripe/billing-portal
 *
 * Body: { email: string } OR { report_id: string }
 *
 * Creates a Stripe Billing Portal session for the customer so they can
 * self-serve: cancel their subscription, update payment method, view
 * invoices, and see upcoming charges.
 *
 * Looks up the stripe_customer_id from either:
 *   - homeowner_subscriptions (matched by email or report_id)
 *   - agent_subscriptions (matched by email)
 *
 * Returns { url } that the client should redirect to.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    const reportId = body.report_id ? String(body.report_id) : null;

    if (!email && !reportId) {
      return NextResponse.json(
        { error: 'email or report_id is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Try to locate the stripe_customer_id
    let customerId: string | null = null;

    if (reportId) {
      const { data: homeSub } = await supabase
        .from('homeowner_subscriptions')
        .select('stripe_customer_id')
        .eq('report_id', reportId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (homeSub?.stripe_customer_id) customerId = homeSub.stripe_customer_id;
    }

    if (!customerId && email) {
      const [{ data: homeSub }, { data: agentSub }] = await Promise.all([
        supabase
          .from('homeowner_subscriptions')
          .select('stripe_customer_id')
          .ilike('email', email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('agent_subscriptions')
          .select('stripe_customer_id')
          .ilike('email', email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      customerId =
        homeSub?.stripe_customer_id ||
        agentSub?.stripe_customer_id ||
        null;
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "We couldn't find an active subscription for that email or report." },
        { status: 404 }
      );
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Billing portal error:', error);
    return NextResponse.json(
      { error: 'Failed to open billing portal' },
      { status: 500 }
    );
  }
}
