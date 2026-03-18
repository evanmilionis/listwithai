export const runtime = 'nodejs';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
});

export async function POST(request: NextRequest) {
  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ error: 'Failed to read body' }, { status: 400 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // -----------------------------------------------------------------------
  // Idempotency: Check if we've already processed this Stripe event.
  // Stripe retries events when it doesn't get a 200 quickly enough,
  // which was causing duplicate report generations and emails.
  // -----------------------------------------------------------------------
  const { data: existing } = await supabase
    .from('processed_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

  if (existing) {
    console.log(`Event ${event.id} already processed, skipping.`);
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  // Mark this event as processed BEFORE doing any work
  await supabase
    .from('processed_events')
    .insert({ stripe_event_id: event.id });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // ── Staging credit purchase ─────────────────────────────
        if (session.metadata?.type === 'staging_credits') {
          const userId  = session.metadata.user_id;
          const credits = parseInt(session.metadata.credits ?? '0', 10);

          const { data: sub } = await supabase
            .from('agent_subscriptions')
            .select('id, staging_credits')
            .eq('user_id', userId)
            .single();

          if (sub) {
            await supabase
              .from('agent_subscriptions')
              .update({ staging_credits: (sub.staging_credits ?? 0) + credits })
              .eq('id', sub.id);
            console.log(`Added ${credits} staging credits to user ${userId}`);
          }
          break;
        }

        if (session.metadata?.report_id) {
          const reportId = session.metadata.report_id;

          // Check if this report is already processing or complete
          const { data: report } = await supabase
            .from('reports')
            .select('status')
            .eq('id', reportId)
            .single();

          if (report?.status === 'processing' || report?.status === 'complete') {
            console.log(`Report ${reportId} already ${report.status}, skipping generation.`);
            break;
          }

          const { error: updateError } = await supabase
            .from('reports')
            .update({
              stripe_session_id: session.id,
              status: 'processing',
            })
            .eq('id', reportId);

          if (updateError) {
            console.error('Failed to update report status:', updateError);
          }

          // Fire off generation in a separate serverless invocation.
          // AbortController prevents this function from waiting for the 300s response.
          const generateUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/report/generate`;
          const genController = new AbortController();
          fetch(generateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportId }),
            signal: genController.signal,
          }).catch(() => {});
          await new Promise((resolve) => setTimeout(resolve, 1000));
          genController.abort();
        }

        if (session.mode === 'subscription') {
          // Check if subscription already exists (idempotency)
          const { data: existingSub } = await supabase
            .from('agent_subscriptions')
            .select('id')
            .eq('stripe_subscription_id', session.subscription as string)
            .single();

          if (!existingSub) {
            const { error: subError } = await supabase
              .from('agent_subscriptions')
              .insert({
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: session.subscription as string,
                email: session.customer_details?.email ?? '',
                name: session.customer_details?.name ?? '',
                status: 'active',
                reports_run: 0,
              });

            if (subError) {
              console.error('Failed to create agent subscription:', subError);
            }
          }
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        const { error: updateError } = await supabase
          .from('agent_subscriptions')
          .update({ status: subscription.status })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('Failed to update subscription:', updateError);
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        const { error: updateError } = await supabase
          .from('agent_subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('Failed to cancel subscription:', updateError);
        }

        break;
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
