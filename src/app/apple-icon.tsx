import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: 'linear-gradient(135deg, #d946ef 0%, #7e22ce 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        {/* Top decorative line */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            marginBottom: 2,
          }}
        >
          <div style={{ width: 18, height: 2, background: 'rgba(255,255,255,0.4)', borderRadius: 2 }} />
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
          <div style={{ width: 18, height: 2, background: 'rgba(255,255,255,0.4)', borderRadius: 2 }} />
        </div>

        {/* Main monogram */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 1,
            lineHeight: 1,
          }}
        >
          <span
            style={{
              color: '#ffffff',
              fontSize: 76,
              fontWeight: 900,
              fontFamily: 'Arial Black, Arial, sans-serif',
              lineHeight: 1,
              letterSpacing: '-4px',
            }}
          >
            D4
          </span>
        </div>

        {/* Bottom wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            marginTop: 2,
          }}
        >
          <div style={{ width: 18, height: 1, background: 'rgba(255,255,255,0.35)', borderRadius: 2 }} />
          <span
            style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: 16,
              fontWeight: 600,
              fontFamily: 'Arial, sans-serif',
              letterSpacing: '3px',
              lineHeight: 1,
            }}
          >
            CONNECT
          </span>
          <div style={{ width: 18, height: 1, background: 'rgba(255,255,255,0.35)', borderRadius: 2 }} />
        </div>
      </div>
    ),
    { ...size }
  )
}
