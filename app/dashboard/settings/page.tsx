'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase';
import { Save, Loader2, CheckCircle } from 'lucide-react';

interface AgentProfile {
  display_name: string;
  brokerage: string;
  phone: string;
  license_number: string;
  photo_url: string;
  tagline: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [profile, setProfile] = useState<AgentProfile>({
    display_name: '',
    brokerage: '',
    phone: '',
    license_number: '',
    photo_url: '',
    tagline: '',
  });

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/agent');
        return;
      }

      const { data: sub } = await supabase
        .from('agent_subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .single();

      if (!sub) {
        router.replace('/agent');
        return;
      }

      setUserId(session.user.id);

      // Load existing profile data
      setProfile({
        display_name: sub.display_name || sub.name || '',
        brokerage: sub.brokerage || '',
        phone: sub.phone || '',
        license_number: sub.license_number || '',
        photo_url: sub.photo_url || '',
        tagline: sub.tagline || '',
      });
      setLoading(false);
    };
    load();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch('/api/agent/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save profile');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-slate-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Agent Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          This information appears on reports you share with clients.
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Profile saved successfully!
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        {/* Preview card */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Report Branding Preview</p>
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt="Agent"
                className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-lg font-bold">
                {profile.display_name?.charAt(0) || '?'}
              </div>
            )}
            <div>
              <p className="font-semibold text-slate-900">
                {profile.display_name || 'Your Name'}
              </p>
              <p className="text-sm text-slate-500">
                {profile.brokerage || 'Your Brokerage'}
              </p>
              <p className="text-xs text-slate-400">
                {profile.phone && `${profile.phone} · `}
                {profile.license_number && `Lic# ${profile.license_number}`}
              </p>
            </div>
          </div>
          {profile.tagline && (
            <p className="text-sm text-slate-600 italic mt-3">&ldquo;{profile.tagline}&rdquo;</p>
          )}
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
            <input
              type="text"
              value={profile.display_name}
              onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
              placeholder="Jane Smith"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Brokerage</label>
            <input
              type="text"
              value={profile.brokerage}
              onChange={(e) => setProfile({ ...profile, brokerage: e.target.value })}
              placeholder="Keller Williams, RE/MAX, etc."
              className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="(555) 123-4567"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">License Number</label>
            <input
              type="text"
              value={profile.license_number}
              onChange={(e) => setProfile({ ...profile, license_number: e.target.value })}
              placeholder="SL1234567"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Photo URL</label>
            <input
              type="url"
              value={profile.photo_url}
              onChange={(e) => setProfile({ ...profile, photo_url: e.target.value })}
              placeholder="https://example.com/your-headshot.jpg"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
            <p className="text-xs text-slate-400 mt-1">Use a direct link to your headshot image</p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Tagline (optional)</label>
            <input
              type="text"
              value={profile.tagline}
              onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
              placeholder="Your trusted Florida real estate partner"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Profile
            </>
          )}
        </button>
      </div>
    </div>
  );
}
