import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * POST /api/admin/grant-agent
 *
 * Grants a free agent subscription to a user by email.
 * Requires ADMIN_SECRET in the Authorization header.
 *
 * Body: { email: string, name: string }
 *
 * Usage:
 *   curl -X POST https://listwithai.io/api/admin/grant-agent \
 *     -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"agent@example.com","name":"Agent Name"}'
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    const secret = authHeader?.replace('Bearer ', '');

    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'email and name are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Look up the user by email in Supabase Auth
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('Failed to list users:', listError);
      return NextResponse.json(
        { error: 'Failed to look up user' },
        { status: 500 }
      );
    }

    const user = users.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return NextResponse.json(
        { error: `No Supabase auth user found for ${email}. They need to sign up at /agent first.` },
        { status: 404 }
      );
    }

    // Upsert agent subscription — activate or create
    const { data, error: upsertError } = await supabase
      .from('agent_subscriptions')
      .upsert(
        {
          user_id: user.id,
          email: email.toLowerCase(),
          name,
          status: 'active',
          plan: 'pro',
          stripe_customer_id: 'free_demo',
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Upsert failed:', upsertError);
      return NextResponse.json(
        { error: upsertError.message },
        { status: 500 }
      );
    }

    console.log(`Granted free agent access to ${email} (user_id: ${user.id})`);

    return NextResponse.json({
      success: true,
      message: `${name} (${email}) now has an active agent subscription`,
      subscription: data,
    });
  } catch (error) {
    console.error('Grant agent error:', error);
    return NextResponse.json(
      { error: 'Failed to grant agent access' },
      { status: 500 }
    );
  }
}
