import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import getStripe from '@/lib/stripe';
import { IntakeFormData, CustomerType } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer_type } = body as { customer_type: CustomerType };

    if (customer_type === 'agent') {
      const session = await getStripe().checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card', 'link'],
        line_items: [
          {
            price: process.env.STRIPE_AGENT_PRICE_ID!,
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}&type=agent`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/agent`,
      });

      return NextResponse.json({ url: session.url });
    }

    // Homeowner flow
    const formData = body as IntakeFormData & { customer_type: 'homeowner' };
    const supabase = createServiceClient();

    // ── Trial abuse prevention ────────────────────────────────────────────
    // Homeowners get ONE free trial per email AND per property address.
    // If either has been used before, skip the trial and charge immediately.
    // Agents are unaffected (they have their own $150/mo subscription, no trial).
    const normalizedEmail = formData.customer_email.trim().toLowerCase();
    const normalizedAddress = formData.property_address.trim();
    const normalizedZip = formData.property_zip.trim();

    // Run the two abuse checks in parallel
    const [emailCheck, addressReportsCheck] = await Promise.all([
      // 1. Has this email ever started a homeowner subscription?
      supabase
        .from('homeowner_subscriptions')
        .select('id')
        .ilike('email', normalizedEmail)
        .limit(1),
      // 2. Any prior reports at this exact address+zip (case-insensitive)?
      supabase
        .from('reports')
        .select('id')
        .ilike('property_address', normalizedAddress)
        .eq('property_zip', normalizedZip)
        .eq('customer_type', 'homeowner')
        .limit(10),
    ]);

    let trialAlreadyUsed = (emailCheck.data?.length ?? 0) > 0;

    // If any prior reports exist at this address, check if any of them
    // ever reached a homeowner_subscription (trialing/active/canceled all count).
    if (!trialAlreadyUsed && (addressReportsCheck.data?.length ?? 0) > 0) {
      const reportIds = addressReportsCheck.data!.map(r => r.id);
      const { data: priorSubs } = await supabase
        .from('homeowner_subscriptions')
        .select('id')
        .in('report_id', reportIds)
        .limit(1);
      trialAlreadyUsed = (priorSubs?.length ?? 0) > 0;
    }

    if (trialAlreadyUsed) {
      console.log(`Trial disabled for ${normalizedEmail} / ${normalizedAddress} ${normalizedZip} — prior signup detected`);
    }

    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert({
        customer_email: formData.customer_email,
        customer_name: formData.customer_name,
        property_address: formData.property_address,
        property_city: formData.property_city,
        property_state: formData.property_state,
        property_zip: formData.property_zip,
        beds: formData.beds,
        baths: formData.baths,
        sqft: formData.sqft,
        condition_score: formData.condition_score,
        asking_price: formData.asking_price,
        hoa_monthly_amount: formData.hoa_monthly_amount || null,
        target_close_date: formData.target_close_date,
        customer_type: 'homeowner',
        status: 'pending',
        sold_status: 'unknown',
        followup_stage: 0,
        report_output: {
          form_metadata: {
            recently_updated: formData.recently_updated,
            updated_areas: formData.updated_areas,
            other_improvements: formData.other_improvements || '',
            home_features: formData.home_features || '',
            property_type: formData.property_type,
            year_built: formData.year_built,
            lot_size: formData.lot_size,
            mortgage_status: formData.mortgage_status,
            flexible_on_price: formData.flexible_on_price,
            hoa_monthly_amount: formData.hoa_monthly_amount || null,
          },
        },
      })
      .select()
      .single();

    if (insertError || !report) {
      console.error('Failed to create report:', insertError);
      return NextResponse.json(
        { error: 'Failed to create report record' },
        { status: 500 }
      );
    }

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card', 'link'],
      line_items: [
        {
          price: process.env.STRIPE_HOMEOWNER_SUB_PRICE_ID!,
          quantity: 1,
        },
      ],
      customer_email: formData.customer_email,
      metadata: {
        report_id: report.id,
        customer_type: 'homeowner',
        trial_granted: trialAlreadyUsed ? 'false' : 'true',
      },
      // Grant a 3-day free trial on FIRST-TIME signups (email + property address
      // never seen before). Returning emails or repeat addresses get charged
      // immediately to prevent trial farming.
      ...(trialAlreadyUsed
        ? {}
        : {
            subscription_data: {
              trial_period_days: 3,
              // If the user cancels during the trial, end the subscription at
              // trial end (no surprise charges).
              trial_settings: {
                end_behavior: { missing_payment_method: 'cancel' },
              },
            },
            // Payment method collection is required so Stripe has a card on
            // file for the first charge after the trial.
            payment_method_collection: 'always',
          }),
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}&type=homeowner`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/homeowner`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
