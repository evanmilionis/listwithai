import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, formData } = body;

    if (!userId || !formData) {
      return NextResponse.json(
        { error: 'userId and formData are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify agent has active subscription
    const { data: subscription } = await supabase
      .from('agent_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active agent subscription' },
        { status: 403 }
      );
    }

    // Use client info for the report recipient, keep agent info for notifications
    const clientName = formData.client_name?.trim() || formData.customer_name;
    const clientEmail = formData.client_email?.trim() || '';
    const agentName = formData.customer_name;
    const agentEmail = formData.customer_email;

    // customer_email/customer_name = client info (who the report is "for")
    // agent info stored in form_metadata so we can notify both
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert({
        user_id: userId,
        customer_email: clientEmail || agentEmail,
        customer_name: clientName,
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
        customer_type: 'agent',
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
            agent_name: agentName,
            agent_email: agentEmail,
            client_email: clientEmail,
          },
        },
      })
      .select()
      .single();

    if (insertError || !report) {
      console.error('Agent report insert failed:', insertError);
      return NextResponse.json(
        { error: insertError?.message ?? 'Failed to create report' },
        { status: 500 }
      );
    }

    console.log(`Agent report created: ${report.id} for user ${userId}`);

    // Fire off generation in a separate serverless invocation.
    // Use AbortController so this function doesn't wait for the 300s generate
    // response — Vercel keeps functions alive while any fetch promise is pending.
    const generateUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/report/generate`;
    const controller = new AbortController();
    fetch(generateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: report.id }),
      signal: controller.signal,
    }).catch(() => {
      // Expected: AbortError after the request is dispatched
    });
    // Give the request 1s to reach Vercel's edge, then abort so this
    // function can exit. The generate route runs as its own invocation.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    controller.abort();

    return NextResponse.json({
      success: true,
      reportId: report.id,
    });
  } catch (error) {
    console.error('Agent report create error:', error);
    return NextResponse.json(
      { error: 'Failed to create agent report' },
      { status: 500 }
    );
  }
}
