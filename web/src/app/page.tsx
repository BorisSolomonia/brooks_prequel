import Image from 'next/image';
import Link from 'next/link';
import { Anton } from 'next/font/google';
import FloatingFeatureCard from '@/components/landing/FloatingFeatureCard';
import BottomFeatureStrip from '@/components/landing/BottomFeatureStrip';
import GetStartedButton from '@/components/landing/GetStartedButton';

const anton = Anton({ weight: '400', subsets: ['latin'] });

const PINK = '#C95A7D';
const BLACK = '#050505';
const YELLOW = '#D4AA3A';
const TEAL = '#5098B3';
const CONTRAST_TEXT_STYLE = {
  color: '#f5ead8',
  textShadow: '2px 2px 0 #050505, -1px -1px 0 #050505, 1px -1px 0 #050505, -1px 1px 0 #050505',
};

function PinIcon({ color = PINK, size = 22 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function CompassIcon({ color = TEAL, size = 22 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function CalendarIcon({ color = YELLOW, size = 22 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function EyeOffIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function CameraSmall() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function NoteSmall() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function MapSmall() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

function ListSmall() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function HeroContent({ mobile = false }: { mobile?: boolean }) {
  const size = mobile ? 'clamp(40px, 12vw, 54px)' : 'clamp(50px, 5.35vw, 74px)';
  const lineHeight = mobile ? 0.96 : 0.93;

  return (
    <>
      <div className={anton.className} style={{ lineHeight }}>
        <p style={{ fontSize: size, color: BLACK, margin: 0 }}>Every place</p>
        <p style={{ fontSize: size, color: BLACK, margin: 0 }}>could be hiding</p>
        <p style={{ fontSize: size, color: BLACK, margin: 0 }}>something.</p>
        <p style={{ fontSize: size, margin: 0, ...CONTRAST_TEXT_STYLE }}>Most people</p>
        <p style={{ fontSize: size, color: PINK, margin: 0 }}>
          <span style={CONTRAST_TEXT_STYLE}>never</span>{' '}
          <span style={CONTRAST_TEXT_STYLE}>check.</span>
        </p>
      </div>

      <p
        style={{
          fontSize: mobile ? 17 : 19,
          fontWeight: 700,
          lineHeight: 1.22,
          marginTop: mobile ? 18 : 24,
          marginBottom: 0,
          maxWidth: 360,
          // Pure white (per user spec) with the same ink-stroke text-shadow
          // used by the hero's "Most people / never check" lines. Stays
          // legible on both mobile and web over any part of the warm hero
          // background (parchment, terracotta, photographs).
          ...CONTRAST_TEXT_STYLE,
          color: '#ffffff',
        }}
      >
        Hidden memories. Real places.<br />
        Personal guides. Not for the crowd.
      </p>

      <GetStartedButton mobile={mobile} />
    </>
  );
}

const card2Icons = [<CameraSmall key="cam" />, <NoteSmall key="note" />];
const card3Icons = [<CalendarIcon key="cal" color={BLACK} size={13} />, <MapSmall key="map" />, <ListSmall key="list" />];

export default function LandingPage() {
  return (
    <div className="relative min-h-[100dvh] overflow-y-auto lg:fixed lg:inset-0 lg:z-[100] lg:overflow-hidden">
      <section
        className="relative isolate min-h-[100dvh] overflow-hidden lg:h-[100dvh]"
        style={{
          backgroundColor: '#D4AA3A',
        }}
      >
        <Image
          src="/images/brooks-hero-bg.webp"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="-z-20 object-cover object-[72%_center] lg:object-center"
        />

        <nav
          className="absolute inset-x-0 top-0 z-20 flex items-start justify-between"
          style={{
            paddingLeft: 'max(clamp(20px, 4vw, 45px), env(safe-area-inset-left))',
            paddingRight: 'max(clamp(20px, 4vw, 45px), env(safe-area-inset-right))',
            // Push the nav below the iPhone notch / Dynamic Island. 24px on Android
            // / non-notched, 24+notch on iPhone X+ (47-59px depending on model).
            paddingTop: 'calc(24px + env(safe-area-inset-top))',
          }}
        >
          <div className="flex items-baseline" style={{ gap: 6 }}>
            <span className={anton.className} style={{ fontSize: 24, color: BLACK, letterSpacing: 1, lineHeight: 1 }}>
              BROOKS
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, color: BLACK, letterSpacing: 6, paddingBottom: 1 }}>
              PREQUEL
            </span>
          </div>

          <div className="hidden items-center lg:flex" style={{ gap: 'clamp(24px, 3vw, 40px)', paddingTop: 4 }}>
            <Link href="/terms" style={{ fontSize: 15, fontWeight: 900, color: BLACK, letterSpacing: '0.5px', textDecoration: 'none' }}>TERMS</Link>
            <Link href="/privacy" style={{ fontSize: 15, fontWeight: 900, color: BLACK, letterSpacing: '0.5px', textDecoration: 'none' }}>PRIVACY</Link>
            <Link href="/guides" style={{ fontSize: 15, fontWeight: 900, color: BLACK, letterSpacing: '0.5px', textDecoration: 'none' }}>GUIDES</Link>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Link href="/about" style={{ fontSize: 15, fontWeight: 900, color: BLACK, letterSpacing: '0.5px', textDecoration: 'none' }}>ABOUT</Link>
              <span style={{ color: PINK, fontSize: 11 }}>◆</span>
            </span>
          </div>
        </nav>

        <div className="hidden lg:block absolute z-10" style={{ left: 'clamp(28px, 4vw, 45px)', top: 'clamp(88px, 11vh, 118px)', width: 'clamp(390px, 39vw, 540px)' }}>
          <HeroContent />
        </div>

        <div
          className="lg:hidden relative z-10"
          style={{
            paddingTop: 'calc(86px + env(safe-area-inset-top))',
            paddingLeft: 'max(clamp(22px, 7vw, 44px), env(safe-area-inset-left))',
            paddingRight: 'max(clamp(22px, 7vw, 44px), env(safe-area-inset-right))',
            paddingBottom: 'calc(140px + env(safe-area-inset-bottom))',
            maxWidth: 640,
          }}
        >
          <HeroContent mobile />
          <div className="mt-5 flex gap-6">
            <Link href="/guides" className="inline-flex min-h-11 items-center rounded-md border border-[#D4AA3A] px-3 text-sm font-black uppercase tracking-wide text-black">Guides</Link>
            <Link href="/about" className="inline-flex min-h-11 items-center rounded-md border border-[#D4AA3A] px-3 text-sm font-black uppercase tracking-wide text-black">About</Link>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-10 hidden lg:block">
          <div
            className="pointer-events-auto absolute"
            style={{
              top: 'clamp(32px, 42vh, 8px)',
              right: 'clamp(576px, 15.5vw, 268px)',
              width: 'clamp(138px, 10vw, 164px)',
              transform: 'rotate(3.25deg)',
            }}
          >
            <FloatingFeatureCard
              icon={<PinIcon size={18} />}
              title="LEAVE A MEMORY"
              body="Leave something meaningful."
              style={{
                minHeight: 86,
                background: 'rgba(245,234,216,0.96)',
                border: '2px solid rgba(201,90,125,0.85)',
                boxShadow: '7px 7px 0 rgba(5,5,5,0.32)',
              }}
            />
          </div>

          <div
            className="pointer-events-auto absolute"
            style={{
              top: 'clamp(78px, 8vh, 112px)',
              right: 'clamp(100px, 25vw, 4px)',
              width: 'clamp(156px, 12vw, 19px)',
              transform: 'rotate(-5deg)',
            }}
          >
            <FloatingFeatureCard
              icon={<CompassIcon size={17} />}
              title="CURATED GUIDES"
              body={"Guides around your interests.\nDifferent perspectives."}
              bottomIcons={card2Icons}
              style={{ minHeight: 88, background: 'rgba(245,234,216,0.92)', border: '2px solid rgba(46,46,46,0.72)', boxShadow: '7px 7px 0 rgba(80,152,179,0.2)' }}
            />
          </div>

          <div
            className="pointer-events-auto absolute"
            style={{
              top: 'clamp(458px, 31vh, 326px)',
              right: 'clamp(712px, 27vw, 452px)',
              width: 'clamp(144px, 10.8vw, 176px)',
              transform: 'rotate(-5.55deg)',
            }}
          >
            <FloatingFeatureCard
              icon={<CalendarIcon color={BLACK} size={17} />}
              title={"FROM DISCOVERY\nTO PLAN"}
              body={"Turn places into your\ncalendar and map."}
              bottomIcons={card3Icons}
              style={{ minHeight: 90, background: 'rgba(245,234,216,0.92)', border: '2px solid rgba(46,46,46,0.72)', boxShadow: '7px 7px 0 rgba(212,170,58,0.26)' }}
            />
          </div>

          <div
            className="pointer-events-auto absolute"
            style={{
              top: 'clamp(418px, 25vh, 276px)',
              right: 'clamp(54px, 7vw, 76px)',
              width: 'clamp(120px, 8.8vw, 148px)',
              transform: 'rotate(-1.5deg)',
            }}
          >
            <FloatingFeatureCard
              icon={<EyeOffIcon size={17} />}
              title="FOCUS YOUR SEARCH"
              body={"Hide what is not useful.\nSee what matters."}
              style={{ minHeight: 82, background: 'rgba(245,234,216,0.9)', border: '2px solid rgba(46,46,46,0.72)', boxShadow: '7px 7px 0 rgba(201,90,125,0.2)' }}
            />
          </div>
        </div>

        <BottomFeatureStrip />
      </section>
    </div>
  );
}
