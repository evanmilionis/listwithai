/**
 * app/api/stripe/checkout/staging/route.ts
 * POST /api/stripe/checkout/staging
 * Creates a Stripe checkout session for staging credit packs.
 *
 * Add these to .env.local:
 *   STRIPE_STAGING_1_PRICE_ID=price_...   ($20  — 1 credit)
 *   STRIPE_STAGING_5_PRICE_ID=price_...   ($90  — 5 credits)
 *   STRIPE_STAGING_10_PRICE_ID=price_...  ($160 — 10 credits)
 *
 * Create these as one-time prices in Stripe dashboard before using.
 */

import { NextRequest, NextResponse } from 'next/server';
import getStripe from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase';

const PACKS: Record<string, { priceId: string; credits: number; label: string }> = {
  '1':  { priceId: process.env.STRIPE_STAGING_1_PRICE_ID!,  credits: 1,  label: '1 Staging Credit'  },
  '5':  { priceId: process.env.STRIPE_STAGING_5_PRICE_ID!,  credits: 5,  label: '5 Staging Credits' },
  '10': { priceId: process.env.STRIPE_STAGING_10_PRICE_ID!, credits: 10, label: '10 Staging Credits' },
};

export async function POST(req: NextRequest) {
  const supabase = createServiceClient();

  try {
    // Auth
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { pack } = await req.json() as { pack: '1' | '5' | '10' };
    const selected = PACKS[pack];
    if (!selected) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: selected.priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?staging_success=true`,
      cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      customer_email: user.email,
      metadata: {
        type:          'staging_credits',
        user_id:       user.id,
        credits:       String(selected.credits),
        pack:          pack,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Staging checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
