'use client';

/**
 * components/StagingTab.tsx
 *
 * Virtual staging tab for the ReportViewer.
 * Shows:
 *   - Credit balance + buy more buttons
 *   - Upload form (image, room type, style)
 *   - Polling progress indicator
 *   - Before/after result display
 *   - History of all staging jobs for this report
 */

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type RoomType = 'livingroom' | 'bedroom' | 'diningroom' | 'kitchen' | 'bathroom' | 'office';
type RoomStyle = 'modern' | 'coastal' | 'traditional' | 'scandinavian' | 'industrial' | 'farmhouse' | 'minimalist' | 'boho' | 'midcenturymodern' | 'contemporary' | 'transitional';

interface StagingJob {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  result_url: string | null;
  original_image_url: string;
  room_type: string;
  style: string;
  error_message: string | null;
  created_at: string;
}

interface Props {
  reportId: string;
  stagingCredits: number;
}

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'livingroom',  label: 'Living Room' },
  { value: 'bedroom',     label: 'Bedroom' },
  { value: 'diningroom',  label: 'Dining Room' },
  { value: 'kitchen',     label: 'Kitchen' },
  { value: 'bathroom',    label: 'Bathroom' },
  { value: 'office',      label: 'Office / Den' },
];

const STYLES: { value: RoomStyle; label: string; desc: string }[] = [
  { value: 'modern',           label: 'Modern',          desc: 'Clean lines, neutral tones' },
  { value: 'coastal',          label: 'Coastal',         desc: 'Light, airy, beach-inspired (FL favorite)' },
  { value: 'traditional',      label: 'Traditional',     desc: 'Classic, warm, timeless' },
  { value: 'scandinavian',     label: 'Scandinavian',    desc: 'Minimal, functional, cozy' },
  { value: 'industrial',       label: 'Industrial',      desc: 'Raw materials, urban feel' },
  { value: 'farmhouse',        label: 'Farmhouse',       desc: 'Rustic, warm, welcoming' },
  { value: 'minimalist',       label: 'Minimalist',      desc: 'Less is more, open spaces' },
  { value: 'boho',             label: 'Boho',            desc: 'Eclectic, colorful, relaxed' },
  { value: 'midcenturymodern', label: 'Mid-Century',     desc: 'Retro elegance, organic shapes' },
  { value: 'contemporary',     label: 'Contemporary',    desc: 'Current trends, bold accents' },
  { value: 'transitional',     label: 'Transitional',    desc: 'Traditional meets modern' },
];

const CREDIT_PACKS = [
  { pack: '1',  label: '1 Credit',   price: '$20',  unit: '$20/room' },
  { pack: '5',  label: '5 Credits',  price: '$90',  unit: '$18/room' },
  { pack: '10', label: '10 Credits', price: '$160', unit: '$16/room' },
];

export default function StagingTab({ reportId, stagingCredits: initialCredits }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [credits, setCredits]         = useState(initialCredits);
  const [jobs, setJobs]               = useState<StagingJob[]>([]);
  // activeJobId removed — no longer needed with synchronous Decor8 API
  const [uploading, setUploading]     = useState(false);
  const [polling, setPolling]         = useState(false);
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [roomType, setRoomType]       = useState<RoomType>('livingroom');
  const [style, setStyle]             = useState<RoomStyle>('coastal');
  const [error, setError]             = useState<string | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing jobs for this report
  useEffect(() => {
    loadJobs();
  }, [reportId]);


  async function getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function loadJobs() {
    const { data } = await supabase
      .from('staging_jobs')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false });
    if (data) setJobs(data as StagingJob[]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  }

  async function handleSubmit() {
    if (!imageFile) { setError('Please select a room photo'); return; }
    if (credits <= 0) { setShowBuyModal(true); return; }

    setUploading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) { setError('Please sign in to continue'); return; }

      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('roomType', roomType);
      formData.append('style', style);
      formData.append('reportId', reportId);

      const res = await fetch('/api/staging/create', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      setPolling(true);

      const data = await res.json();

      setPolling(false);

      if (!res.ok) {
        if (res.status === 402) setShowBuyModal(true);
        else setError(data.error ?? 'Failed to start staging');
        return;
      }

      setCredits(data.creditsRemaining);
      setImageFile(null);
      setImagePreview(null);

      // Reload jobs from DB to show the result
      await loadJobs();

      // If it failed, show the error
      if (data.status === 'failed') {
        setCredits(c => c + 1); // refund display
      }

    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  async function handleBuyCredits(pack: string) {
    try {
      setError(null);
      const token = await getAuthToken();
      if (!token) { setError('Please sign in to continue'); return; }

      const res = await fetch('/api/stripe/checkout/staging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ pack }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to start checkout');
        return;
      }
      if (data.url) window.location.href = data.url;
      else setError('No checkout URL returned');
    } catch (err) {
      console.error('Buy credits error:', err);
      setError('Something went wrong. Please try again.');
    }
  }

  return (
    <div style={{ padding: '24px 0' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Virtual Staging</h2>
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            Upload a photo of an empty or outdated room. AI furnishes it in ~60 seconds.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            background: credits > 0 ? '#eff6ff' : '#fef2f2',
            border: `1px solid ${credits > 0 ? '#bfdbfe' : '#fecaca'}`,
            borderRadius: 10, padding: '10px 16px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: credits > 0 ? '#1d4ed8' : '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
              Credits Remaining
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: credits > 0 ? '#1e3a8a' : '#dc2626' }}>
              {credits}
            </div>
          </div>
          <button
            onClick={() => setShowBuyModal(true)}
            style={{ marginTop: 8, fontSize: 13, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Buy more credits
          </button>
        </div>
      </div>

      {/* Upload form */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: 24, marginBottom: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Stage a New Room</div>

        {/* Image drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${imagePreview ? '#2563eb' : '#d1d5db'}`,
            borderRadius: 10,
            padding: '32px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: 20,
            background: imagePreview ? '#eff6ff' : '#fff',
            transition: 'all 0.15s',
          }}
        >
          {imagePreview ? (
            <div>
              <img
                src={imagePreview}
                alt="Preview"
                style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, marginBottom: 8 }}
              />
              <div style={{ fontSize: 13, color: '#2563eb' }}>Click to change photo</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
              <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>Upload room photo</div>
              <div style={{ fontSize: 13, color: '#9ca3af' }}>JPG or PNG, max 10MB. Best results with empty or lightly furnished rooms.</div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* Room type */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
            Room Type
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ROOM_TYPES.map(rt => (
              <button
                key={rt.value}
                onClick={() => setRoomType(rt.value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: `1px solid ${roomType === rt.value ? '#2563eb' : '#d1d5db'}`,
                  background: roomType === rt.value ? '#eff6ff' : '#fff',
                  color: roomType === rt.value ? '#1d4ed8' : '#6b7280',
                  fontSize: 13,
                  fontWeight: roomType === rt.value ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                }}
              >
                {rt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Style */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
            Design Style
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {STYLES.map(s => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: `1px solid ${style === s.value ? '#2563eb' : '#e5e7eb'}`,
                  background: style === s.value ? '#eff6ff' : '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, color: style === s.value ? '#1d4ed8' : '#111827' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={uploading || polling || !imageFile}
          style={{
            background: uploading || polling || !imageFile ? '#9ca3af' : '#1d4ed8',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 24px',
            fontWeight: 700,
            fontSize: 15,
            cursor: uploading || polling || !imageFile ? 'not-allowed' : 'pointer',
            width: '100%',
            transition: 'background 0.15s',
          }}
        >
          {uploading ? 'Uploading...' : polling ? '⏳ AI is staging your room (~20 sec)...' : `Stage This Room — 1 Credit ($20)`}
        </button>

        {polling && (
          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: '#6b7280' }}>
            Our AI is furnishing your room. This usually takes about 20 seconds. Please stay on this page.
          </div>
        )}
      </div>

      {/* Results */}
      {jobs.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Staged Rooms</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {jobs.map(job => (
              <div
                key={job.id}
                style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}
              >
                {/* Status bar */}
                <div style={{
                  padding: '8px 14px',
                  background: job.status === 'complete' ? '#f0fdf4' : job.status === 'failed' ? '#fef2f2' : '#fffbeb',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span style={{ fontSize: 13 }}>
                    {job.status === 'complete' ? '✅' : job.status === 'failed' ? '❌' : '⏳'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>
                    {job.room_type.replace('_', ' ')} · {job.style}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>
                    {job.status === 'complete' ? 'Complete' : job.status === 'failed' ? 'Failed — refunded' : 'Processing...'}
                  </span>
                </div>

                {/* Images */}
                <div style={{ padding: 14 }}>
                  {job.status === 'complete' && job.result_url ? (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Before</div>
                          <img src={job.original_image_url} alt="Before" style={{ width: '100%', borderRadius: 6, aspectRatio: '4/3', objectFit: 'cover' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>After</div>
                          <img src={job.result_url} alt="After" style={{ width: '100%', borderRadius: 6, aspectRatio: '4/3', objectFit: 'cover' }} />
                        </div>
                      </div>
                      <a
                        href={job.result_url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'block',
                          textAlign: 'center',
                          background: '#1d4ed8',
                          color: '#fff',
                          borderRadius: 7,
                          padding: '9px 0',
                          fontSize: 13,
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        Download Staged Photo
                      </a>
                    </div>
                  ) : job.status === 'failed' ? (
                    <div style={{ fontSize: 13, color: '#dc2626', padding: '8px 0' }}>
                      {job.error_message ?? 'Staging failed. Your credit has been refunded.'}
                    </div>
                  ) : (
                    <div style={{ padding: '16px 0', textAlign: 'center' }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>AI is staging this room...</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buy credits modal */}
      {showBuyModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowBuyModal(false); }}
        >
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 480, width: '100%' }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Buy Staging Credits</h3>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
              Each credit stages one room. Credits never expire.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {CREDIT_PACKS.map(pack => (
                <button
                  key={pack.pack}
                  onClick={() => handleBuyCredits(pack.pack)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    background: '#f9fafb',
                    cursor: 'pointer',
                    transition: 'all 0.1s',
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{pack.label}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{pack.unit}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#1d4ed8' }}>{pack.price}</div>
                </button>
              ))}
            </div>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 12 }}>
                {error}
              </div>
            )}
            <button
              onClick={() => { setShowBuyModal(false); setError(null); }}
              style={{ width: '100%', padding: '11px 0', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#6b7280', cursor: 'pointer', fontSize: 14 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
