import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 76,
            fontWeight: 700,
            color: 'white',
          }}
        >
          T
        </div>
      </div>
    ),
    size,
  );
}
