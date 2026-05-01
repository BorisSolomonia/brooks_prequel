import type { ReactNode, CSSProperties } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  body: string;
  bottomIcons?: ReactNode[];
  style?: CSSProperties;
}

export default function FloatingFeatureCard({ icon, title, body, bottomIcons, style }: Props) {
  return (
    <div
      style={{
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%',
        background: '#f5ead8',
        borderRadius: 8,
        boxShadow: '0 8px 18px rgba(0,0,0,0.16)',
        padding: 'clamp(10px, 1vw, 13px)',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      <div style={{ marginBottom: 7 }}>{icon}</div>
      <p
        style={{
          color: '#050505',
          fontWeight: 900,
          fontSize: 'clamp(10px, 0.82vw, 12px)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          lineHeight: 1.2,
          whiteSpace: 'pre-line',
          margin: 0,
        }}
      >
        {title}
      </p>
      <p
        style={{
          color: '#050505',
          fontSize: 'clamp(10px, 0.78vw, 11px)',
          lineHeight: 1.25,
          marginTop: 6,
          flex: 1,
          whiteSpace: 'pre-line',
          margin: '6px 0 0',
        }}
      >
        {body}
      </p>
      {bottomIcons && bottomIcons.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {bottomIcons.map((ic, i) => (
            <div
              key={i}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {ic}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#050505"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
