import { NextRequest, NextResponse } from 'next/server';

/**
 * Auth callback handler for Supabase magic link verification.
 *
 * When a user clicks the magic link in their email, Supabase redirects them
 * here. The Supabase browser client (`createBrowserClient` from @supabase/ssr)
 * automatically detects the auth tokens in the URL and establishes the session.
 *
 * This route simply redirects the user to the dashboard, where the layout
 * will confirm the session and link their subscription if needed.
 */
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/dashboard`);
}
