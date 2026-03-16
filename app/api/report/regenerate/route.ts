import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { generateReport } from '@/lib/reportGenerator';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { reportId } = await request.json();

    if (!reportId || typeof reportId !== 'string') {
      return NextResponse.json(
        { error: 'reportId is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify the report exists
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('id, status, customer_type')
      .eq('id', reportId)
      .single();

    if (fetchError || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Only allow regeneration of completed or failed reports
    if (report.status !== 'complete' && report.status !== 'failed') {
      return NextResponse.json(
        { error: 'Report is still processing' },
        { status: 400 }
      );
    }

    // Clear cached Rentcast data so it re-fetches fresh comps
    await supabase
      .from('reports')
      .update({ rentcast_data: null })
      .eq('id', reportId);

    // Fire-and-forget regeneration
    generateReport(reportId).catch((err) => {
      console.error(`Report regeneration failed for ${reportId}:`, err);
    });

    return NextResponse.json({
      success: true,
      message: 'Report regeneration started',
    });
  } catch (error) {
    console.error('Report regenerate endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger report regeneration' },
      { status: 500 }
    );
  }
}
