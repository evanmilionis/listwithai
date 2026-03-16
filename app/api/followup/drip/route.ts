import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendFollowupEmail } from '@/lib/resend';
import type { Report } from '@/types';

/**
 * Drip email cron endpoint.
 *
 * Call this via Vercel Cron or external scheduler (e.g., daily at 10am ET).
 * URL: POST /api/followup/drip
 * Header: Authorization: Bearer <ADMIN_SECRET>
 *
 * Schedule:
 *   Stage 1 → 3 days after report
 *   Stage 2 → 7 days after report
 *   Stage 3 → 14 days after report
 *   Stage 4 → 21 days after report
 *   Stage 5 → 30 days after report
 */

const DRIP_SCHEDULE: Record<number, number> = {
  1: 3,   // days after report
  2: 7,
  3: 14,
  4: 21,
  5: 30,
};

export async function POST(request: NextRequest) {
  // Verify admin secret or Vercel cron secret
  const auth = request.headers.get('authorization');
  const cronSecret = request.headers.get('x-vercel-cron-secret');
  const isAuthorized =
    auth === `Bearer ${process.env.ADMIN_SECRET}` ||
    (process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  let sent = 0;
  let skipped = 0;

  try {
    // Get all completed homeowner reports that haven't finished the drip sequence
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .eq('status', 'complete')
      .eq('customer_type', 'homeowner')
      .lt('followup_stage', 5)
      .not('customer_email', 'is', null);

    if (error || !reports) {
      console.error('Drip query error:', error);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    const now = new Date();

    for (const report of reports as Report[]) {
      const nextStage = report.followup_stage + 1;
      const daysRequired = DRIP_SCHEDULE[nextStage];

      if (!daysRequired) {
        skipped++;
        continue;
      }

      // Check if enough days have passed since report creation
      const createdAt = new Date(report.created_at);
      const daysSinceCreation = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceCreation < daysRequired) {
        skipped++;
        continue;
      }

      // Don't email sold/withdrawn properties
      if (report.sold_status === 'sold' || report.sold_status === 'withdrawn') {
        skipped++;
        continue;
      }

      // Send the email
      const success = await sendFollowupEmail(
        report.customer_email,
        report.customer_name,
        nextStage,
        report.id
      );

      if (success) {
        // Update the stage
        await supabase
          .from('reports')
          .update({ followup_stage: nextStage })
          .eq('id', report.id);
        sent++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      total: reports.length,
    });
  } catch (error) {
    console.error('Drip cron error:', error);
    return NextResponse.json(
      { error: 'Drip cron failed' },
      { status: 500 }
    );
  }
}
