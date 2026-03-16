import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import type { Lead } from '@/types';
import { Resend } from 'resend';

const FROM = 'ListAI <hello@listwithai.io>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://listwithai.io';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

async function sendAbandonedCartEmail(
  lead: Lead,
  stage: 1 | 2
): Promise<boolean> {
  const resend = getResend();
  const name = lead.name || 'there';
  const address = lead.property_address || 'your property';
  const homeownerUrl = `${APP_URL}/homeowner`;

  const templates = {
    1: {
      subject: 'Your ListAI report is waiting',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">Your Report Is Just One Step Away</h1>
          <p>Hi ${name},</p>
          <p>You were exploring how to sell <strong>${address}</strong> — your personalized AI report is just one step away.</p>
          <p>Complete your order and get your full selling toolkit in minutes: a custom timeline, pricing analysis, listing copy, and Florida legal templates.</p>
          <p style="margin: 24px 0;">
            <a href="${homeownerUrl}" style="display: inline-block; padding: 14px 28px; background-color: #1e3a5f; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Complete Your Report
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">If you have any questions, just reply to this email.</p>
          <p>— The ListAI Team</p>
        </div>
      `,
    },
    2: {
      subject: `Still thinking about selling ${address}?`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">We're Here to Help</h1>
          <p>Hi ${name},</p>
          <p>We noticed you started exploring selling options for <strong>${address}</strong> but didn't finish.</p>
          <p>No pressure — selling a home is a big decision. Here's what other Florida homeowners are saying:</p>
          <blockquote style="border-left: 3px solid #1e3a5f; padding-left: 16px; margin: 20px 0; color: #444;">
            "The ListAI report saved me thousands in agent commissions. The pricing analysis alone was worth it." — Tampa homeowner
          </blockquote>
          <p>Want to talk it through? Book a free 10-minute call with our team:</p>
          <p style="margin: 24px 0;">
            <a href="${APP_URL}/homeowner" style="display: inline-block; padding: 14px 28px; background-color: #1e3a5f; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Finish Your Report
            </a>
            &nbsp;&nbsp;
            <a href="https://calendly.com/listwithai/consultation" style="display: inline-block; padding: 14px 28px; background-color: #ffffff; color: #1e3a5f; text-decoration: none; border-radius: 8px; font-weight: 600; border: 2px solid #1e3a5f;">
              Book a Free Call
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">— The ListAI Team</p>
        </div>
      `,
    },
  };

  const template = templates[stage];

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: lead.email!,
      subject: template.subject,
      html: template.html,
    });

    if (error) {
      console.error(`Resend abandoned cart email error (stage ${stage}):`, error);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Failed to send abandoned cart email (stage ${stage}):`, err);
    return false;
  }
}

export async function POST(_request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const now = new Date();
    let emailsSent = 0;

    // ---- First followup: 24-48 hours after creation, followup_count = 0 ----
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    const { data: firstFollowups, error: firstError } = await supabase
      .from('leads')
      .select('*')
      .eq('converted', false)
      .gte('form_step_reached', 2)
      .not('email', 'is', null)
      .eq('followup_count', 0)
      .lte('created_at', twentyFourHoursAgo)
      .gte('created_at', fortyEightHoursAgo);

    if (firstError) {
      console.error('Failed to fetch leads for first followup:', firstError);
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    for (const lead of (firstFollowups || []) as Lead[]) {
      const sent = await sendAbandonedCartEmail(lead, 1);
      if (sent) {
        await supabase
          .from('leads')
          .update({
            followup_count: 1,
            last_followup_at: now.toISOString(),
          })
          .eq('id', lead.id);
        emailsSent++;
      }
    }

    // ---- Second followup: followup_count = 1, last_followup_at 5+ days ago ----
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();

    const { data: secondFollowups, error: secondError } = await supabase
      .from('leads')
      .select('*')
      .eq('converted', false)
      .gte('form_step_reached', 2)
      .not('email', 'is', null)
      .eq('followup_count', 1)
      .lte('last_followup_at', fiveDaysAgo);

    if (secondError) {
      console.error('Failed to fetch leads for second followup:', secondError);
      return NextResponse.json(
        { error: 'Failed to fetch leads for second followup' },
        { status: 500 }
      );
    }

    for (const lead of (secondFollowups || []) as Lead[]) {
      const sent = await sendAbandonedCartEmail(lead, 2);
      if (sent) {
        await supabase
          .from('leads')
          .update({
            followup_count: 2,
            last_followup_at: now.toISOString(),
          })
          .eq('id', lead.id);
        emailsSent++;
      }
    }

    return NextResponse.json({ emailsSent });
  } catch (error) {
    console.error('Lead followup trigger error:', error);
    return NextResponse.json(
      { error: 'Failed to process lead followups' },
      { status: 500 }
    );
  }
}
