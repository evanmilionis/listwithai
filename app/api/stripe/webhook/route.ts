export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import getStripe from '@/lib/stripe';
import { generateReport } from '@/lib/reportGenerator';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.report_id) {
          // Homeowner payment completed
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
          }

          // Fire-and-forget report generation
          generateReport(reportId).catch((err) => {
            console.error('Report generation failed:', err);
          });
        }

        if (session.mode === 'subscription') {
          // Agent subscription created
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

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
