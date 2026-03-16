import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

export async function POST(request: NextRequest) {
  try {
    const { reportId, userId, template } = await request.json();

    if (!reportId || !userId) {
      return NextResponse.json({ error: 'reportId and userId required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify agent owns this report
    const { data: report } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single();

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Get agent profile
    const { data: agent } = await supabase
      .from('agent_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const agentName = agent.display_name || agent.name || 'Your agent';
    const brokerage = agent.brokerage || '';
    const phone = agent.phone || '';
    const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL}/report/${reportId}`;
    const clientName = report.customer_name || 'there';
    const clientEmail = report.customer_email;
    const address = report.property_address;

    if (!clientEmail) {
      return NextResponse.json({ error: 'No client email on this report' }, { status: 400 });
    }

    const templates: Record<string, { subject: string; html: string }> = {
      report_ready: {
        subject: `${clientName}, your property report for ${address} is ready`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Hi ${clientName},</p>
            <p>I've prepared a comprehensive market analysis and listing report for your property at <strong>${address}</strong>.</p>
            <p>The report includes pricing analysis, comparable sales, improvement recommendations, and a custom selling timeline — everything we need to position your home for the best possible outcome.</p>
            <p><a href="${reportUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1e293b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Your Report</a></p>
            <p>Let me know when you've had a chance to review it and we can discuss next steps.</p>
            <p>Best,<br/>${agentName}${brokerage ? `<br/><span style="color: #666; font-size: 14px;">${brokerage}</span>` : ''}${phone ? `<br/><span style="color: #666; font-size: 14px;">${phone}</span>` : ''}</p>
          </div>
        `,
      },
      pricing_review: {
        subject: `Let's discuss pricing for ${address}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Hi ${clientName},</p>
            <p>I wanted to follow up on the pricing analysis in your report. Based on recent comparable sales and current market conditions, I think we have a strong position to discuss.</p>
            <p>The report breaks down exactly how we arrived at the recommended price range, with data from recent sales in your area.</p>
            <p><a href="${reportUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1e293b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Review Pricing Analysis</a></p>
            <p>Would you like to schedule a call this week to go over the numbers?</p>
            <p>Best,<br/>${agentName}${brokerage ? `<br/><span style="color: #666; font-size: 14px;">${brokerage}</span>` : ''}${phone ? `<br/><span style="color: #666; font-size: 14px;">${phone}</span>` : ''}</p>
          </div>
        `,
      },
      ready_to_list: {
        subject: `Ready to list ${address}?`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Hi ${clientName},</p>
            <p>Just checking in — have you had a chance to review the listing timeline and improvement recommendations in your report?</p>
            <p>When you're ready to move forward, I have everything prepared: professional listing copy, pricing strategy, and the full marketing plan.</p>
            <p><a href="${reportUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1e293b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Full Report</a></p>
            <p>Let me know if you have any questions or if you'd like to schedule a listing appointment.</p>
            <p>Best,<br/>${agentName}${brokerage ? `<br/><span style="color: #666; font-size: 14px;">${brokerage}</span>` : ''}${phone ? `<br/><span style="color: #666; font-size: 14px;">${phone}</span>` : ''}</p>
          </div>
        `,
      },
      check_in: {
        subject: `Checking in on ${address}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Hi ${clientName},</p>
            <p>I hope things are going well! I wanted to check in and see if you've had any questions about the report or if there's anything else I can help with regarding your property at ${address}.</p>
            <p>The market in your area has been active, and I'm here whenever you're ready to take the next step.</p>
            <p><a href="${reportUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1e293b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Your Report</a></p>
            <p>Best,<br/>${agentName}${brokerage ? `<br/><span style="color: #666; font-size: 14px;">${brokerage}</span>` : ''}${phone ? `<br/><span style="color: #666; font-size: 14px;">${phone}</span>` : ''}</p>
          </div>
        `,
      },
    };

    const selectedTemplate = templates[template || 'report_ready'];
    if (!selectedTemplate) {
      return NextResponse.json({ error: 'Invalid template' }, { status: 400 });
    }

    const { error: sendError } = await getResend().emails.send({
      from: `${agentName} via ListAI <hello@listwithai.io>`,
      to: clientEmail,
      replyTo: agent.email,
      subject: selectedTemplate.subject,
      html: selectedTemplate.html,
    });

    if (sendError) {
      console.error('Follow-up email error:', sendError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Agent followup error:', error);
    return NextResponse.json({ error: 'Failed to send follow-up' }, { status: 500 });
  }
}
