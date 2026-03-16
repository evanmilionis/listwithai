import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendFollowupEmail } from '@/lib/resend';
import { Report } from '@/types';

// Followup schedule: stage -> days after report completion
const FOLLOWUP_SCHEDULE: Record<number, number> = {
  1: 3,
  2: 14,
  3: 30,
  4: 45,
  5: 60,
};

export async function POST(_request: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Fetch all completed homeowner reports that haven't finished all followups
    const { data: reports, error: fetchError } = await supabase
      .from('reports')
      .select('*')
      .eq('status', 'complete')
      .eq('customer_type', 'homeowner')
      .lt('followup_stage', 5);

    if (fetchError) {
      console.error('Failed to fetch reports for followup:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      );
    }

    if (!reports || reports.length === 0) {
      return NextResponse.json({ emailsSent: 0 });
    }

    const now = new Date();
    let emailsSent = 0;

    for (const report of reports as Report[]) {
      const nextStage = report.followup_stage + 1;
      const daysRequired = FOLLOWUP_SCHEDULE[nextStage];

      if (!daysRequired) continue;

      // Calculate days since report was created
      const createdAt = new Date(report.created_at);
      const daysSinceCreation = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if enough days have passed
      if (daysSinceCreation < daysRequired) continue;

      // Stage 4 (day 45): only send if NOT sold
      if (nextStage === 4 && report.sold_status === 'sold') continue;

      // Stage 5 (day 60): only send if sold
      if (nextStage === 5 && report.sold_status !== 'sold') continue;

      try {
        await sendFollowupEmail(
          report.customer_email,
          report.customer_name,
          nextStage,
          report.id
        );

        const { error: updateError } = await supabase
          .from('reports')
          .update({ followup_stage: nextStage })
          .eq('id', report.id);

        if (updateError) {
          console.error(
            `Failed to update followup_stage for report ${report.id}:`,
            updateError
          );
          continue;
        }

        emailsSent++;
      } catch (emailError) {
        console.error(
          `Failed to send followup email for report ${report.id}:`,
          emailError
        );
      }
    }

    return NextResponse.json({ emailsSent });
  } catch (error) {
    console.error('Followup trigger error:', error);
    return NextResponse.json(
      { error: 'Failed to process followup triggers' },
      { status: 500 }
    );
  }
}
