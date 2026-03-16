import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { reportId, error } = await request.json();

    await resend.emails.send({
      from: 'ListAI Alerts <hello@listwithai.io>',
      to: 'evanmilionis@gmail.com',
      subject: `⚠️ Report Generation Failed — ${reportId}`,
      html: `
        <h2>Report Generation Failed</h2>
        <p><strong>Report ID:</strong> ${reportId}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>
        <p><strong>Error:</strong></p>
        <pre style="background:#f4f4f4;padding:12px;border-radius:4px;overflow-x:auto;">${error}</pre>
        <p>
          <a href="https://listwithai.io/report/${reportId}" style="color:#2563eb;">
            View Report
          </a>
        </p>
      `,
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('Failed to send admin notification:', err);
    return NextResponse.json({ error: 'Failed to notify' }, { status: 500 });
  }
}
