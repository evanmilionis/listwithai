import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * GET /u/[id]
 *
 * Email unsubscribe handler for OpenClaw Mailer outbound email
 * augmentation. Called from the "Unsubscribe" link in every email
 * we send. Flips mailer_leads.email_opt_out to true so we never
 * email that lead again, and shows a confirmation page.
 *
 * Also honors the RFC 8058 List-Unsubscribe one-click standard —
 * clients that POST to the unsubscribe URL will also hit this route.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function optOut(leadId: string, _req: NextRequest): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    const { data: lead } = await supabase
      .from('mailer_leads')
      .select('id')
      .eq('id', leadId)
      .maybeSingle();

    if (!lead) return false;

    await supabase
      .from('mailer_leads')
      .update({
        email_opt_out: true,
        email_opt_out_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    return true;
  } catch (err) {
    console.error('[unsubscribe] error:', err);
    return false;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await optOut(id, req);

  const body = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Unsubscribed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
    .card { background: white; border-radius: 16px; padding: 40px; max-width: 440px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    h1 { margin: 0 0 12px; font-size: 22px; }
    p { color: #475569; line-height: 1.55; margin: 0 0 20px; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <div class="card">
    ${ok
      ? `<h1>You&rsquo;re unsubscribed.</h1>
         <p>We won&rsquo;t send you any more email from ListAI. You&rsquo;ll also be removed from any remaining direct mail sequences.</p>
         <p>If this was a mistake or you have questions, reply to any of our messages or email <a href="mailto:hello@listwithai.io">hello@listwithai.io</a>.</p>`
      : `<h1>Unsubscribe link invalid.</h1>
         <p>This link isn&rsquo;t recognized. If you&rsquo;re trying to opt out of ListAI email, reply STOP to the message or email <a href="mailto:hello@listwithai.io">hello@listwithai.io</a> and we&rsquo;ll remove you immediately.</p>`
    }
    <p style="font-size:12px;color:#94a3b8;margin-top:24px;">ListAI &middot; UniVenture Properties LLC &middot; 340 SE 3rd Street Unit 4106, Miami, FL 33131</p>
  </div>
</body>
</html>`;

  return new NextResponse(body, {
    status: ok ? 200 : 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// RFC 8058 one-click unsubscribe — some mail clients POST to the
// List-Unsubscribe URL. Honor the same logic.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await optOut(id, req);
  return new NextResponse('ok', { status: 200 });
}
