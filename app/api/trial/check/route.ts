import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * POST /api/trial/check
 *
 * Body: { email: string, property_address: string, property_zip: string }
 *
 * Called BEFORE checkout to tell the user whether they qualify for the
 * 3-day free trial or whether they'll be charged immediately. Mirrors
 * the same dedupe logic as /api/stripe/checkout so the UX can warn
 * the user before they hit Stripe.
 *
 * Returns:
 *   { eligible: true }                                          — first-time signup, trial will apply
 *   { eligible: false, reason: 'email' | 'address' }            — already used trial
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const propertyAddress = String(body.property_address || '').trim();
    const propertyZip = String(body.property_zip || '').trim();

    if (!email) {
      return NextResponse.json({ error: 'email required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check 1: email already used for a homeowner sub?
    const { data: emailMatch } = await supabase
      .from('homeowner_subscriptions')
      .select('id')
      .ilike('email', email)
      .limit(1);

    if ((emailMatch?.length ?? 0) > 0) {
      return NextResponse.json({ eligible: false, reason: 'email' });
    }

    // Check 2: property address already associated with a prior subscription?
    if (propertyAddress && propertyZip) {
      const { data: addrReports } = await supabase
        .from('reports')
        .select('id')
        .ilike('property_address', propertyAddress)
        .eq('property_zip', propertyZip)
        .eq('customer_type', 'homeowner')
        .limit(10);

      if ((addrReports?.length ?? 0) > 0) {
        const reportIds = addrReports!.map((r) => r.id);
        const { data: priorSubs } = await supabase
          .from('homeowner_subscriptions')
          .select('id')
          .in('report_id', reportIds)
          .limit(1);
        if ((priorSubs?.length ?? 0) > 0) {
          return NextResponse.json({ eligible: false, reason: 'address' });
        }
      }
    }

    return NextResponse.json({ eligible: true });
  } catch (error) {
    console.error('Trial check error:', error);
    // Fail open — if the check errors, don't block the user from checking out.
    // The real abuse check still runs inside /api/stripe/checkout.
    return NextResponse.json({ eligible: true });
  }
}
