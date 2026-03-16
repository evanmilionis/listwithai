import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Auth callback handler for Supabase magic link verification.
 *
 * When a user clicks the magic link in their email, Supabase redirects them
 * here with a `code` query param. We exchange that code for a session using
 * the server-side Supabase client, which sets the auth cookies properly.
 * Then we redirect the user to the dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }

    console.error('Auth callback error:', error);
  }

  // If no code or error, redirect to agent page to try again
  return NextResponse.redirect(`${origin}/agent?error=auth`);
}
