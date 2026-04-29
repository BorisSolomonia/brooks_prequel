export default function MemoryPreviewCard() {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        style={{
          width: 220,
          borderRadius: 16,
          background: 'rgba(10,10,10,0.85)',
          border: '1px solid rgba(255,255,255,0.25)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
          padding: '18px 20px',
          transform: 'rotate(-4deg)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.65)',
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          Memory found nearby
        </p>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#ef2f6d', marginBottom: 12 }}>
          120 m from you
        </p>
        <div
          style={{
            height: 56,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.1)',
            marginBottom: 14,
          }}
        />
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1.35,
            color: '#ffffff',
            fontStyle: 'italic',
            whiteSpace: 'pre-line',
          }}
        >
          {'"Sunset here hit\ndifferent."'}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 8 }}>
          Alex, 2 years ago
        </p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="#ef2f6d">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
      </div>
    </div>
  );
}
