import { NextRequest, NextResponse } from 'next/server';
import { generateReport } from '@/lib/reportGenerator';

export async function POST(request: NextRequest) {
  try {
    const { reportId } = await request.json();

    if (!reportId || typeof reportId !== 'string') {
      return NextResponse.json(
        { error: 'reportId is required and must be a string' },
        { status: 400 }
      );
    }

    // Fire-and-forget: start generation but don't await it
    generateReport(reportId).catch((err) => {
      console.error(`Report generation failed for ${reportId}:`, err);
    });

    return NextResponse.json({
      success: true,
      message: 'Report generation started',
    });
  } catch (error) {
    console.error('Report generate endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger report generation' },
      { status: 500 }
    );
  }
}
