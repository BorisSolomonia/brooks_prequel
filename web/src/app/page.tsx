import Link from 'next/link';
import { Anton } from 'next/font/google';
import FloatingFeatureCard from '@/components/landing/FloatingFeatureCard';
import MemoryPreviewCard from '@/components/landing/MemoryPreviewCard';
import BottomFeatureStrip from '@/components/landing/BottomFeatureStrip';

const anton = Anton({ weight: '400', subsets: ['latin'] });

const PINK = '#ef2f6d';
const BLACK = '#050505';
const YELLOW = '#ffd21a';
const TEAL = '#12c7c9';
const MOBILE_CARD_STYLE = { width: 'min(100%, 360px)' };

// ── Icons ────────────────────────────────────────────────────────────────────

function PinIcon({ color = PINK, size = 28 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function CompassIcon({ color = TEAL, size = 28 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function CalendarIcon({ color = YELLOW, size = 28 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function EyeOffIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function CameraSmall() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function NoteSmall() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
function CupSmall() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
    </svg>
  );
}
function LeafSmall() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 22c1.25-1.25 2.5-2 4-2 0-4 3-8 8-8 3-1 5-3 6-5-6-1-10 0-13 3-2 3-3 7-5 12z" />
    </svg>
  );
}
function CalSmall() {
  return <CalendarIcon color={BLACK} size={14} />;
}
function MapSmall() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}
function ListSmall() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

// ── Hero content (shared desktop / mobile) ────────────────────────────────────

function HeroContent({ antonClass, mobile = false }: { antonClass: string; mobile?: boolean }) {
  const size = mobile ? 'clamp(44px, 13vw, 58px)' : 'clamp(58px, 6vw, 78px)';
  return (
    <>
      <div className={antonClass} style={{ lineHeight: 0.95 }}>
        <p style={{ fontSize: size, color: BLACK, margin: 0 }}>Every place</p>
        <p style={{ fontSize: size, color: BLACK, margin: 0 }}>could be hiding</p>
        <p style={{ fontSize: size, color: BLACK, margin: 0 }}>something.</p>
        <p style={{ fontSize: size, color: PINK, margin: 0 }}>Most people</p>
        <p style={{ fontSize: size, color: PINK, margin: 0 }}>never check.</p>
      </div>

      <p style={{ fontSize: 20, fontWeight: 500, color: BLACK, lineHeight: 1.25, marginTop: 28, marginBottom: 0 }}>
        Hidden memories. Real places.<br />
        Personal guides. Not for the crowd.
      </p>

      <Link
        href="/api/auth/login"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'min(270px, 100%)',
          height: 64,
          background: BLACK,
          borderRadius: 8,
          marginTop: 28,
          paddingLeft: 28,
          paddingRight: 24,
          textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 900, color: YELLOW, letterSpacing: 1, textTransform: 'uppercase' }}>
          GET STARTED
        </span>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={YELLOW} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>

      <p style={{ fontSize: 15, color: BLACK, marginTop: 20, marginBottom: 0 }}>
        Already have an account?{' '}
        <Link href="/api/auth/login" style={{ color: BLACK, textDecoration: 'underline' }}>
          Sign in
        </Link>
      </p>
    </>
  );
}

// ── Card bottom icon arrays ───────────────────────────────────────────────────

const card2Icons = [
  <CameraSmall key="cam" />,
  <NoteSmall key="note" />,
  <CupSmall key="cup" />,
  <LeafSmall key="leaf" />,
];
const card3Icons = [
  <CalSmall key="cal" />,
  <MapSmall key="map" />,
  <ListSmall key="list" />,
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="fixed inset-0 z-[100] overflow-x-hidden overflow-y-auto">
      <section
        className="relative overflow-hidden lg:pb-[180px]"
        style={{
          minHeight: 'max(100vh, 900px)',
          backgroundColor: '#ffd21a',
          backgroundImage: [
            'url(/images/brooks-hero-bg.webp)',
            'radial-gradient(circle at 15% 8%, rgba(255, 210, 26, 0.45), transparent 24%)',
            'radial-gradient(circle at 83% 18%, rgba(18, 199, 201, 0.38), transparent 24%)',
            'linear-gradient(135deg, rgba(245, 234, 216, 0.88), rgba(239, 47, 109, 0.16) 48%, rgba(5, 5, 5, 0.08))',
          ].join(', '),
          backgroundSize: 'cover, auto, auto, auto',
          backgroundPosition: 'center, center, center, center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* ── Top Nav ── */}
        <nav
          className="absolute inset-x-0 top-0 z-10 flex items-start justify-between"
          style={{ paddingLeft: 'clamp(24px, 4vw, 45px)', paddingRight: 'clamp(24px, 4vw, 45px)', paddingTop: 28 }}
        >
          <div className="flex items-baseline" style={{ gap: 6 }}>
            <span className={anton.className} style={{ fontSize: 24, color: BLACK, letterSpacing: 1, lineHeight: 1 }}>
              BROOKS
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: BLACK, letterSpacing: 6, paddingBottom: 1 }}>
              PREQUEL
            </span>
          </div>

          <div className="hidden lg:flex items-center" style={{ gap: 'clamp(24px, 3vw, 42px)', paddingTop: 4 }}>
            <Link href="/search" style={{ fontSize: 15, fontWeight: 800, color: BLACK, letterSpacing: '0.5px', textDecoration: 'none' }}>EXPLORE</Link>
            <Link href="/search" style={{ fontSize: 15, fontWeight: 800, color: BLACK, letterSpacing: '0.5px', textDecoration: 'none' }}>GUIDES</Link>
            <Link href="#" style={{ fontSize: 15, fontWeight: 800, color: BLACK, letterSpacing: '0.5px', textDecoration: 'none' }}>FOR CREATORS</Link>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Link href="#" style={{ fontSize: 15, fontWeight: 800, color: BLACK, letterSpacing: '0.5px', textDecoration: 'none' }}>ABOUT</Link>
              <span style={{ color: PINK, fontSize: 11 }}>◆</span>
            </span>
          </div>
        </nav>

        {/* ── Desktop: hero text at absolute position ── */}
        <div className="hidden lg:block absolute" style={{ left: 'clamp(32px, 4vw, 45px)', top: 110, width: 'clamp(410px, 43vw, 560px)' }}>
          <HeroContent antonClass={anton.className} />
        </div>

        {/* ── Mobile: hero text in normal flow ── */}
        <div className="lg:hidden" style={{ padding: '90px clamp(24px, 7vw, 48px) 32px', maxWidth: 680 }}>
          <HeroContent antonClass={anton.className} mobile />
        </div>

        {/* ── Desktop: floating feature cards ── */}
        <div className="hidden lg:block">
          <div className="absolute" style={{ top: 'clamp(90px, 8vw, 104px)', right: 'clamp(30px, 6vw, 78px)' }}>
            <FloatingFeatureCard
              icon={<PinIcon />}
              title="LEAVE A MEMORY"
              body={"Leave something meaningful.\nSomeone will find it someday."}
              style={{ width: 'clamp(220px, 20vw, 260px)', minHeight: 135 }}
            />
          </div>
          <div className="absolute" style={{ top: 'clamp(245px, 23vw, 270px)', right: 'clamp(24px, 4vw, 50px)' }}>
            <FloatingFeatureCard
              icon={<CompassIcon />}
              title="CURATED GUIDES"
              body={"Guides built around your interests.\nDifferent stories, different perspectives."}
              bottomIcons={card2Icons}
              style={{ width: 'clamp(230px, 22vw, 280px)', minHeight: 165 }}
            />
          </div>
          <div className="absolute" style={{ top: 'clamp(430px, 42vw, 465px)', right: 'clamp(72px, 11vw, 140px)' }}>
            <FloatingFeatureCard
              icon={<CalendarIcon />}
              title={"FROM DISCOVERY\nTO PLAN"}
              body={"Turn places and stories into your\ncalendar, itinerary and maps."}
              bottomIcons={card3Icons}
              style={{ width: 'clamp(215px, 19vw, 245px)', minHeight: 160 }}
            />
          </div>
          <div className="absolute" style={{ top: 'clamp(590px, 59vw, 665px)', right: 'clamp(36px, 6vw, 70px)' }}>
            <FloatingFeatureCard
              icon={<EyeOffIcon />}
              title="FOCUS YOUR SEARCH"
              body={"Hide places you're not interested in.\nSee what matters to you."}
              style={{ width: 'clamp(230px, 21vw, 275px)', minHeight: 125 }}
            />
          </div>
        </div>

        {/* ── Mobile: stacked cards ── */}
        <div
          className="grid justify-items-center gap-4 sm:grid-cols-2 lg:hidden"
          style={{ padding: '0 clamp(20px, 6vw, 40px) 36px', maxWidth: 780, margin: '0 auto' }}
        >
          <FloatingFeatureCard icon={<PinIcon />} title="LEAVE A MEMORY" body={"Leave something meaningful.\nSomeone will find it someday."} style={MOBILE_CARD_STYLE} />
          <FloatingFeatureCard icon={<CompassIcon />} title="CURATED GUIDES" body={"Guides built around your interests.\nDifferent stories, different perspectives."} bottomIcons={card2Icons} style={MOBILE_CARD_STYLE} />
          <FloatingFeatureCard icon={<CalendarIcon />} title={"FROM DISCOVERY\nTO PLAN"} body={"Turn places and stories into your\ncalendar, itinerary and maps."} bottomIcons={card3Icons} style={MOBILE_CARD_STYLE} />
          <FloatingFeatureCard icon={<EyeOffIcon />} title="FOCUS YOUR SEARCH" body={"Hide places you're not interested in.\nSee what matters to you."} style={MOBILE_CARD_STYLE} />
        </div>

        {/* ── Desktop: memory card ── */}
        <div className="hidden xl:block absolute" style={{ left: 'clamp(640px, 58vw, 835px)', top: 610 }}>
          <MemoryPreviewCard />
        </div>

        {/* ── Bottom feature strip ── */}
        <BottomFeatureStrip />
      </section>
    </div>
  );
}
