import { NextRequest, NextResponse } from 'next/server';
import { generateReport } from '@/lib/reportGenerator';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { reportId } = await request.json();

    if (!reportId || typeof reportId !== 'string') {
      return NextResponse.json(
        { error: 'reportId is required and must be a string' },
        { status: 400 }
      );
    }

    // Await generation — Vercel kills the function if we don't
    await generateReport(reportId);

    return NextResponse.json({
      success: true,
      message: 'Report generation complete',
    });
  } catch (error) {
    console.error('Report generate endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
