export const runtime = 'nodejs';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { generateReport } from '@/lib/reportGenerator';
import Stripe from 'stripe';

// Initialize Stripe directly to avoid any import issues
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
});

export async function POST(request: NextRequest) {
  console.log('Webhook received');
  console.log('STRIPE_WEBHOOK_SECRET exists:', !!process.env.STRIPE_WEBHOOK_SECRET);
  console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);

  let body: string;
  try {
    body = await request.text();
    console.log('Body length:', body.length);
  } catch (err) {
    console.error('Failed to read body:', err);
    return NextResponse.json({ error: 'Failed to read body' }, { status: 400 });
  }

  const sig = request.headers.get('stripe-signature');
  console.log('Signature exists:', !!sig);

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
    console.log('Event verified:', event.type);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed', details: String(err) },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', session.id);
        console.log('Report ID from metadata:', session.metadata?.report_id);
        console.log('Session mode:', session.mode);

        if (session.metadata?.report_id) {
          const reportId = session.metadata.report_id;

          const { error: updateError } = await supabase
            .from('reports')
            .update({
              stripe_session_id: session.id,
              status: 'processing',
            })
            .eq('id', reportId);

          if (updateError) {
            console.error('Failed to update report:', updateError);
          } else {
            console.log('Report status set to processing');
          }

          // Await report generation
          try {
            console.log('Starting report generation...');
            await generateReport(reportId);
            console.log('Report generation completed');
          } catch (err) {
            console.error('Report generation failed:', err);
          }
        }

        if (session.mode === 'subscription') {
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

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    console.log('Webhook handler complete, returning 200');
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
