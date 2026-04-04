import { Resend } from 'resend';

const FROM = 'ListAI <hello@listwithai.io>';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

/**
 * Send the "your report is ready" notification.
 */
export async function sendReportReadyEmail(
  email: string,
  name: string,
  reportUrl: string
): Promise<boolean> {
  try {
    const { error } = await getResend().emails.send({
      from: FROM,
      to: email,
      subject: `${name}, your ListAI report is ready!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">Your ListAI Report is Ready</h1>
          <p>Hi ${name},</p>
          <p>Great news — your personalized FSBO selling report has been generated and is ready to view.</p>
          <p>
            <a href="${reportUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Your Report
            </a>
          </p>
          <p>Your report includes:</p>
          <ul>
            <li>Custom selling timeline</li>
            <li>Home improvement recommendations with ROI estimates</li>
            <li>Data-driven pricing analysis</li>
            <li>Professional listing copy</li>
            <li>State-specific legal document templates</li>
          </ul>
          <p style="color: #666; font-size: 14px;">If you have any questions, just reply to this email.</p>
          <p>— The ListAI Team</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend sendReportReadyEmail error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('sendReportReadyEmail failed:', error);
    return false;
  }
}

/**
 * Send a followup email based on the stage (1–5).
 */
export async function sendFollowupEmail(
  email: string,
  name: string,
  stage: number,
  reportId: string
): Promise<boolean> {
  const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL}/report/${reportId}`;

  const templates: Record<number, { subject: string; body: string }> = {
    1: {
      subject: `${name}, have you started on your selling timeline?`,
      body: `
        <p>Hi ${name},</p>
        <p>It's been a few days since you received your ListAI report. Have you had a chance to review your personalized selling timeline?</p>
        <p>The first steps — like decluttering and scheduling any repairs — are often the most impactful. Starting early gives you the best shot at hitting your target close date.</p>
        <p><a href="${reportUrl}">Review your timeline &rarr;</a></p>
      `,
    },
    2: {
      subject: `Quick wins that could boost your sale price, ${name}`,
      body: `
        <p>Hi ${name},</p>
        <p>Your report included specific home improvement recommendations ranked by ROI. Even small changes — like fresh paint or updated hardware — can make a measurable difference in buyer perception.</p>
        <p>Take another look at your improvement priorities and start with the quick wins.</p>
        <p><a href="${reportUrl}">See your improvements list &rarr;</a></p>
      `,
    },
    3: {
      subject: `Is your asking price dialed in, ${name}?`,
      body: `
        <p>Hi ${name},</p>
        <p>Pricing is the single biggest factor in how quickly your home sells. Your report includes a data-driven pricing analysis based on real comparable sales in your area.</p>
        <p>If you haven't finalized your listing price yet, your CMA breakdown is a great place to start.</p>
        <p><a href="${reportUrl}">Review your pricing analysis &rarr;</a></p>
      `,
    },
    4: {
      subject: `Ready to list? Your copy is waiting, ${name}`,
      body: `
        <p>Hi ${name},</p>
        <p>When you're ready to go live, your report includes professionally written listing copy you can paste directly into the MLS, Zillow, or any listing platform.</p>
        <p>It's tailored to your property and designed to attract the right buyers. Use the Virtual Staging tab to get AI-enhanced photos before you go live — great photos are the #1 factor in getting showings.</p>
        <p><a href="${reportUrl}">Grab your listing copy &rarr;</a></p>
      `,
    },
    5: {
      subject: `Don't forget the legal side, ${name}`,
      body: `
        <p>Hi ${name},</p>
        <p>Selling FSBO means handling your own paperwork. Your report includes state-specific template documents — seller's disclosure, purchase agreement, and more — plus guidance on when to involve a real estate attorney.</p>
        <p>This is the stuff most FSBO sellers overlook. Don't let it catch you off guard.</p>
        <p><a href="${reportUrl}">Review your legal package &rarr;</a></p>
      `,
    },
    6: {
      subject: `Did you sell your home, ${name}? 🏡`,
      body: `
        <p>Hi ${name},</p>
        <p>We saw you've been using your ListAI report for a while now — we hope your sale is going well!</p>
        <p>If you've already sold (congrats!), we'd love to hear how it went. A quick testimonial helps other homeowners know ListAI is the real deal.</p>
        <p><strong>How much did you save in agent commissions?</strong> Reply to this email with your story — even two sentences — and we'll feature it on our site.</p>
        <p>And if you're still in the process, remember: your <strong>Offer Review</strong> tab in the report can help you analyze any offers you receive and know exactly what to counter.</p>
        <p><a href="${reportUrl}">Open your report &rarr;</a></p>
      `,
    },
  };

  const template = templates[stage];
  if (!template) {
    console.error(`Invalid followup stage: ${stage}`);
    return false;
  }

  try {
    const { error } = await getResend().emails.send({
      from: FROM,
      to: email,
      subject: template.subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          ${template.body}
          <p style="color: #666; font-size: 14px; margin-top: 24px;">— The ListAI Team</p>
        </div>
      `,
    });

    if (error) {
      console.error(`Resend followup stage ${stage} error:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`sendFollowupEmail stage ${stage} failed:`, error);
    return false;
  }
}
