import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { generateReport } from '@/lib/reportGenerator';

export const maxDuration = 300;

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

    // Use client info if provided, otherwise fall back to agent info
    const reportName = formData.client_name?.trim() || formData.customer_name;
    const reportEmail = formData.client_email?.trim() || formData.customer_email;

    // Create the report using the service client (bypasses RLS)
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert({
        user_id: userId,
        customer_email: reportEmail,
        customer_name: reportName,
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
        stripe_session_id: '',
        sold_status: 'unknown',
        followup_stage: 0,
        report_output: {
          form_metadata: {
            recently_updated: formData.recently_updated,
            updated_areas: formData.updated_areas,
            other_improvements: formData.other_improvements || '',
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
      console.error('Agent report insert failed:', insertError);
      return NextResponse.json(
        { error: insertError?.message ?? 'Failed to create report' },
        { status: 500 }
      );
    }

    console.log(`Agent report created: ${report.id} for user ${userId}`);

    // Await generation — Vercel kills serverless functions after response
    await generateReport(report.id);

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
