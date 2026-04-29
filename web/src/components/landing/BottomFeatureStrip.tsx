import type { ReactNode } from 'react';

const PINK = '#ef2f6d';
const YELLOW = '#ffd21a';
const TEAL = '#12c7c9';

function BinocularsIcon() {
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="15" r="4" />
      <circle cx="18" cy="15" r="4" />
      <path d="M2 7.5A2.5 2.5 0 0 1 4.5 5H7a2.5 2.5 0 0 1 2.5 2.5V11H4.5A2.5 2.5 0 0 1 2 8.5v-1Z" />
      <path d="M22 7.5A2.5 2.5 0 0 0 19.5 5H17a2.5 2.5 0 0 0-2.5 2.5V11h4.5A2.5 2.5 0 0 0 22 8.5v-1Z" />
      <line x1="9.5" y1="11" x2="14.5" y2="11" />
    </svg>
  );
}

function WalkingIcon() {
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={YELLOW} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="4" r="2" />
      <path d="M7 22l2.5-7.5L12 17l2-5 3 4v6" />
      <path d="M9 14.5l-2.5.5M17 9l2-1" />
      <path d="M11 7l2 3-3 4.5" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" fill={TEAL} stroke="none">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" fill={YELLOW} stroke="none">
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
    icon: <BinocularsIcon />,
    title: 'DISCOVER\nTHE UNSEEN',
    body: 'Real stories in\nreal places.',
  },
  {
    icon: <WalkingIcon />,
    title: 'AVOID THE HERD\nEXPLORE YOUR WAY',
    body: 'Break the routine.\nFind what others miss.',
  },
  {
    icon: <HeartIcon />,
    title: 'CONNECT THROUGH\nMEANING.',
    body: 'Moments from\nstrangers that\nstay with you.',
  },
  {
    icon: <PencilIcon />,
    title: 'SHARE YOUR STORY\nLEAVE A LEGACY',
    body: 'Your words.\nTheir adventure.',
  },
  {
    icon: <LightningIcon />,
    title: 'LIVE MORE\nINTENTIONAL\nADVENTURES',
    body: 'Not just trips.\nTransformations.',
  },
];

export default function BottomFeatureStrip() {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-stretch overflow-hidden"
      style={{ height: 180, background: 'rgba(5,5,5,0.92)' }}
    >
      {/* Feature items */}
      <div
        className="flex items-center"
        style={{
          flex: 1,
          paddingLeft: 45,
          paddingTop: 30,
          paddingBottom: 25,
          overflowX: 'auto',
          gap: 0,
        }}
      >
        {features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ width: 200 }}>
              <div style={{ marginBottom: 10 }}>{f.icon}</div>
              <p
                style={{
                  color: '#f5ead8',
                  fontWeight: 900,
                  fontSize: 16,
                  lineHeight: 1.15,
                  textTransform: 'uppercase',
                  whiteSpace: 'pre-line',
                  margin: 0,
                }}
              >
                {f.title}
              </p>
              <p
                style={{
                  color: '#f5ead8',
                  fontSize: 14,
                  lineHeight: 1.35,
                  opacity: 0.8,
                  whiteSpace: 'pre-line',
                  marginTop: 6,
                }}
              >
                {f.body}
              </p>
            </div>
            {i < features.length - 1 && (
              <div
                style={{
                  width: 1,
                  height: 95,
                  background: 'rgba(255,255,255,0.3)',
                  margin: '0 28px',
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Teal logo block */}
      <div
        style={{
          width: 260,
          minWidth: 260,
          height: 180,
          background: TEAL,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <span style={{ fontSize: 46, fontWeight: 900, color: '#050505', lineHeight: 1 }}>B</span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#050505',
            letterSpacing: 5,
            lineHeight: 1.1,
          }}
        >
          BROOKS
        </span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#050505',
            letterSpacing: 5,
            lineHeight: 1.1,
          }}
        >
          PREQUEL
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: '#050505',
            letterSpacing: 1.5,
            marginTop: 8,
          }}
        >
          EXPLORE DIFFERENT.
        </span>
      </div>
    </div>
  );
}
