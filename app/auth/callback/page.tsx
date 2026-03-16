'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

/**
 * Auth callback page for Supabase magic link verification.
 *
 * Supabase magic links can use two flows:
 *   1. PKCE flow: redirects with ?code=... in the query string
 *   2. Implicit flow: redirects with #access_token=... in the URL hash
 *
 * Server-side route handlers can't read the # hash, so this must be a
 * client-side page. The Supabase browser client automatically detects
 * the hash tokens and establishes the session.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = createClient();

      // Check for PKCE code in query params
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace('/dashboard');
          return;
        }
        console.error('Code exchange failed:', error);
      }

      // Check for implicit flow tokens in hash
      // The Supabase client auto-detects hash tokens on initialization,
      // so we just need to check if a session was established
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        // Give Supabase client a moment to process the hash
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Check if we have a session now (from either flow)
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        router.replace('/dashboard');
        return;
      }

      // Check for error in hash (e.g., expired link)
      if (hash && hash.includes('error')) {
        console.error('Auth error in hash:', hash);
        setError(true);
        setTimeout(() => router.replace('/agent'), 3000);
        return;
      }

      // No session, no code, no hash — something went wrong
      setError(true);
      setTimeout(() => router.replace('/agent'), 3000);
    };

    handleAuth();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900 mb-2">
            Link expired or invalid
          </p>
          <p className="text-sm text-slate-500">
            Redirecting you back to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Signing you in...</p>
      </div>
    </div>
  );
}
