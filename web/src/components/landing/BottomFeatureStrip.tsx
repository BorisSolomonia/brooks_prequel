import type { ReactNode } from 'react';

const PINK = '#ef2f6d';
const YELLOW = '#ffd21a';
const TEAL = '#12c7c9';

function SearchPinIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 19s5-4.5 5-9a5 5 0 0 0-10 0c0 4.5 5 9 5 9Z" />
      <circle cx="11" cy="10" r="1.8" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

function WalkingIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={YELLOW} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="13" cy="4" r="2" />
      <path d="M7 22l2.5-7.5L12 17l2-5 3 4v6" />
      <path d="M9 14.5l-2.5.5M17 9l2-1" />
      <path d="M11 7l2 3-3 4.5" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill={TEAL} stroke="none" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill={YELLOW} stroke="none" aria-hidden="true">
      <path d="M13 2L3 14h9l-1 8 10-12h-9z" />
    </svg>
  );
}

interface FeatureItem {
  icon: ReactNode;
  title: string;
  body: string;
}

const features: FeatureItem[] = [
  {
    icon: <SearchPinIcon />,
    title: 'DISCOVER\nTHE UNSEEN',
    body: 'Real stories in\nreal places.',
  },
  {
    icon: <WalkingIcon />,
    title: 'AVOID THE HERD',
    body: 'Explore your way.',
  },
  {
    icon: <HeartIcon />,
    title: 'CONNECT THROUGH\nMEANING',
    body: 'Moments that stay.',
  },
  {
    icon: <PencilIcon />,
    title: 'SHARE YOUR STORY',
    body: 'Your words. Their adventure.',
  },
  {
    icon: <LightningIcon />,
    title: 'LIVE MORE\nINTENTIONAL',
    body: 'Not just trips.',
  },
];

export default function BottomFeatureStrip() {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 grid grid-cols-5 overflow-hidden"
      style={{ height: 'clamp(108px, 15vh, 140px)', background: 'rgba(5,5,5,0.92)' }}
    >
      {features.map((feature, index) => (
        <div
          key={feature.title}
          style={{
            minWidth: 0,
            borderRight: index < features.length - 1 ? '1px solid rgba(255,255,255,0.22)' : 'none',
            padding: 'clamp(10px, 1.7vw, 20px) clamp(8px, 1.4vw, 18px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ marginBottom: 7 }}>{feature.icon}</div>
          <p
            style={{
              color: '#f5ead8',
              fontWeight: 900,
              fontSize: 'clamp(10px, 1.05vw, 14px)',
              lineHeight: 1.1,
              textTransform: 'uppercase',
              whiteSpace: 'pre-line',
              margin: 0,
            }}
          >
            {feature.title}
          </p>
          <p
            className="hidden sm:block"
            style={{
              color: '#f5ead8',
              fontSize: 'clamp(10px, 0.95vw, 13px)',
              lineHeight: 1.22,
              opacity: 0.78,
              whiteSpace: 'pre-line',
              marginTop: 5,
            }}
          >
            {feature.body}
          </p>
        </div>
      ))}
    </div>
  );
}
