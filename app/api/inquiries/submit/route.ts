import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { Resend } from 'resend';
import { formatCurrency } from '@/lib/utils';

const resend = new Resend(process.env.RESEND_API_KEY);

interface InquiryPayload {
  report_id: string;
  property_address: string;
  asking_price: number;
  name: string;
  email: string;
  phone?: string;
  pre_approved?: boolean;
  financing_type?: string | null;
  message?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InquiryPayload;

    if (!body.report_id || !body.name || !body.email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Look up the property owner's email (the customer on the report)
    const { data: report } = await supabase
      .from('reports')
      .select('customer_email, customer_name, property_address, property_city, property_state, property_zip, customer_type')
      .eq('id', body.report_id)
      .single();

    if (!report) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Persist the inquiry (best-effort — don't fail the whole thing if insert errors)
    const { error: insertErr } = await supabase
      .from('buyer_inquiries')
      .insert({
        report_id: body.report_id,
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone?.trim() || null,
        pre_approved: body.pre_approved ?? null,
        financing_type: body.financing_type || null,
        message: body.message?.trim() || null,
      });

    if (insertErr) {
      console.error('Failed to persist buyer inquiry:', insertErr);
      // Continue anyway — email is more important than persistence
    }

    const ownerAddress = `${report.property_address}, ${report.property_city}, ${report.property_state} ${report.property_zip}`;

    // Email the owner
    try {
      await resend.emails.send({
        from: 'ListAI <hello@listwithai.io>',
        to: report.customer_email,
        replyTo: body.email,
        subject: `New buyer inquiry on ${report.property_address}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
            <div style="background: #0A0F1E; padding: 24px; border-radius: 16px 16px 0 0; color: white;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px;">New inquiry</p>
              <h1 style="margin: 8px 0 0; font-size: 22px;">${body.name} is interested in your property</h1>
              <p style="margin: 4px 0 0; color: #cbd5e1; font-size: 14px;">${ownerAddress} · ${formatCurrency(body.asking_price)}</p>
            </div>
            <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 16px 16px;">
              <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 0 0 12px;">Buyer details</h2>
              <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #64748b; width: 140px;">Name</td><td style="padding: 6px 0; font-weight: 600;">${body.name}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Email</td><td style="padding: 6px 0;"><a href="mailto:${body.email}">${body.email}</a></td></tr>
                ${body.phone ? `<tr><td style="padding: 6px 0; color: #64748b;">Phone</td><td style="padding: 6px 0;"><a href="tel:${body.phone}">${body.phone}</a></td></tr>` : ''}
                ${body.pre_approved !== undefined ? `<tr><td style="padding: 6px 0; color: #64748b;">Pre-approved</td><td style="padding: 6px 0;">${body.pre_approved ? 'Yes' : 'Not yet'}</td></tr>` : ''}
                ${body.financing_type ? `<tr><td style="padding: 6px 0; color: #64748b;">Financing</td><td style="padding: 6px 0;">${body.financing_type}</td></tr>` : ''}
              </table>
              ${body.message ? `
                <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 20px 0 8px;">Message</h2>
                <p style="background: #f8fafc; padding: 16px; border-radius: 8px; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${body.message}</p>
              ` : ''}
              <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <a href="mailto:${body.email}?subject=Re: ${encodeURIComponent(report.property_address)}"
                   style="display: inline-block; padding: 12px 20px; background: #0A0F1E; color: white; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 600;">
                  Reply to ${body.name.split(' ')[0]}
                </a>
              </div>
              <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8;">
                This inquiry came from your ListAI public listing page. Replies go directly to the buyer.
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Failed to send inquiry email:', emailErr);
      // Don't block success — the inquiry is already stored, homeowner can see it in their dashboard
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Inquiry submit error:', error);
    return NextResponse.json({ error: 'Failed to submit inquiry' }, { status: 500 });
  }
}
