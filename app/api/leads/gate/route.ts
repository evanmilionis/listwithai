import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * Lead gate endpoint — captures email before showing a shared report.
 * Called from the public /report/[id] page when the viewer is NOT the owner.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, name, reportId } = await request.json();

    if (!email || !reportId) {
      return NextResponse.json(
        { error: 'Email and reportId are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get report info to know which agent shared it
    const { data: report } = await supabase
      .from('reports')
      .select('id, user_id, property_address, property_city')
      .eq('id', reportId)
      .single();

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Insert lead with source tracking
    await supabase.from('leads').insert({
      email,
      name: name || null,
      property_address: report.property_address,
      property_city: report.property_city,
      source: 'shared_report',
      form_step_reached: 0,
      converted: false,
      followup_count: 0,
      notes: `Viewed shared report ${reportId}. Agent: ${report.user_id || 'homeowner'}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lead gate error:', error);
    return NextResponse.json(
      { error: 'Failed to capture lead' },
      { status: 500 }
    );
  }
}
