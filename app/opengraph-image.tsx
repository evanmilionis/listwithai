import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ListAI — Sell Your Home. Keep the Commission.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0A0F1E',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          position: 'relative',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Grid texture overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: '200px',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <span style={{ color: '#3B82F6', fontSize: '24px', fontWeight: '700' }}>L</span>
          </div>
          <span style={{ color: 'white', fontSize: '28px', fontWeight: '700', letterSpacing: '-0.5px' }}>
            List<span style={{ color: '#3B82F6' }}>AI</span>
          </span>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          <span style={{ color: 'white', fontSize: '72px', fontWeight: '800', lineHeight: 1.05, letterSpacing: '-2px' }}>
            Sell Your Home.
          </span>
          <span style={{ color: '#60A5FA', fontSize: '72px', fontWeight: '800', lineHeight: 1.05, letterSpacing: '-2px' }}>
            Keep the Commission.
          </span>
        </div>

        {/* Subtext */}
        <p style={{ color: '#94A3B8', fontSize: '24px', marginTop: '28px', maxWidth: '700px', lineHeight: 1.5 }}>
          AI-powered pricing, listing copy, timeline & legal — all 50 states. $100/mo. No agent needed.
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '48px', marginTop: '48px' }}>
          {[
            { value: '$15K', label: 'Avg. commission saved' },
            { value: '2,400+', label: 'Reports generated' },
            { value: '50', label: 'States covered' },
          ].map((stat) => (
            <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: 'white', fontSize: '28px', fontWeight: '700' }}>{stat.value}</span>
              <span style={{ color: '#64748B', fontSize: '14px' }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
