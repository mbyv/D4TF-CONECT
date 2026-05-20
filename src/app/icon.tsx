import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #d946ef 0%, #7e22ce 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
      >
        {/* D letter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 0,
          }}
        >
          <span
            style={{
              color: '#ffffff',
              fontSize: 17,
              fontWeight: 900,
              fontFamily: 'Arial Black, Arial, sans-serif',
              lineHeight: 1,
              letterSpacing: '-1px',
            }}
          >
            D
          </span>
          <span
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'Arial, sans-serif',
              lineHeight: 1,
              marginBottom: 1,
            }}
          >
            4
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
