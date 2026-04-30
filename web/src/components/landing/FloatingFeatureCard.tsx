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
        boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
        padding: 'clamp(13px, 1.45vw, 17px)',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      <div style={{ marginBottom: 10 }}>{icon}</div>
      <p
        style={{
          color: '#050505',
          fontWeight: 900,
          fontSize: 'clamp(12px, 1vw, 14px)',
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
          fontSize: 'clamp(12px, 0.95vw, 13px)',
          lineHeight: 1.25,
          marginTop: 8,
          flex: 1,
          whiteSpace: 'pre-line',
          margin: '8px 0 0',
        }}
      >
        {body}
      </p>
      {bottomIcons && bottomIcons.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {bottomIcons.map((ic, i) => (
            <div
              key={i}
              style={{
                width: 26,
                height: 26,
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <svg
          width={14}
          height={14}
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
