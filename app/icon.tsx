import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0A0F1E',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
        }}
      >
        <span style={{ color: '#3B82F6', fontSize: '18px', fontWeight: '800', fontFamily: 'system-ui' }}>L</span>
      </div>
    ),
    { ...size }
  );
}
