'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

/**
 * Dedicated auth callback for homeowner magic link sign-in.
 * Always redirects to /homeowner-dashboard after session is established.
 */
export default function HomeownerAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = createClient();

      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace('/homeowner-dashboard');
          return;
        }
        console.error('Code exchange failed:', error);
      }

      // Implicit flow — wait for Supabase to process hash tokens
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        router.replace('/homeowner-dashboard');
        return;
      }

      if (hash && hash.includes('error')) {
        setError(true);
        setTimeout(() => router.replace('/homeowner'), 3000);
        return;
      }

      setError(true);
      setTimeout(() => router.replace('/homeowner'), 3000);
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
