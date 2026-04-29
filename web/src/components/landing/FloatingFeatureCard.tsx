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
        borderRadius: 14,
        boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
        padding: 'clamp(18px, 2vw, 22px)',
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
          fontSize: 15,
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
          fontSize: 14,
          lineHeight: 1.3,
          marginTop: 8,
          flex: 1,
          whiteSpace: 'pre-line',
          margin: '8px 0 0',
        }}
      >
        {body}
      </p>
      {bottomIcons && bottomIcons.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
          {bottomIcons.map((ic, i) => (
            <div
              key={i}
              style={{
                width: 30,
                height: 30,
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
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
