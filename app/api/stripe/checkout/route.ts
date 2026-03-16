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
      mode: 'payment',
      line_items: [
        {
          price: process.env.STRIPE_HOMEOWNER_PRICE_ID!,
          quantity: 1,
        },
      ],
      metadata: {
        report_id: report.id,
      },
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
