import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, display_name, brokerage, phone, license_number, photo_url, tagline } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify agent has active subscription
    const { data: subscription } = await supabase
      .from('agent_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 403 });
    }

    const { error } = await supabase
      .from('agent_subscriptions')
      .update({
        display_name: display_name || null,
        brokerage: brokerage || null,
        phone: phone || null,
        license_number: license_number || null,
        photo_url: photo_url || null,
        tagline: tagline || null,
      })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      console.error('Profile update error:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Agent profile error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
