import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check that this email has an active homeowner subscription
    const { data: subscription } = await supabase
      .from('homeowner_subscriptions')
      .select('id, status')
      .eq('email', email.toLowerCase().trim())
      .in('status', ['active', 'trialing'])
      .limit(1)
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: 'No account found with that email. Make sure you use the email from your purchase.' },
        { status: 404 }
      );
    }

    // Send OTP magic link
    const { error: otpError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase().trim(),
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://listwithai.io'}/auth/callback/homeowner`,
      },
    });

    if (otpError) {
      console.error('Failed to generate magic link:', otpError);
      return NextResponse.json(
        { error: 'Failed to send access link. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send access link error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
