import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ hasSubscription: false });
    }

    const supabase = createServiceClient();

    const { data } = await supabase
      .from('agent_subscriptions')
      .select('id, status')
      .eq('email', email.toLowerCase().trim())
      .eq('status', 'active')
      .maybeSingle();

    return NextResponse.json({ hasSubscription: !!data });
  } catch (error) {
    console.error('Check subscription error:', error);
    // On error, let them through to avoid blocking legitimate users
    return NextResponse.json({ hasSubscription: true });
  }
}
