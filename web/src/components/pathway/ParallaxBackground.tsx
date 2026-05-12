'use client';

import { useEffect, useRef, useState } from 'react';

export default function ParallaxBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          setOffset(-rect.top * 0.35);
        }
        raf = 0;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-[60vh] sky-gradient"
        style={{ transform: `translate3d(0, ${offset * 0.2}px, 0)` }}
      />
      <svg
        className="absolute left-0 right-0 w-full"
        style={{ top: '40vh', height: '40vh', transform: `translate3d(0, ${offset * 0.55}px, 0)` }}
        viewBox="0 0 1200 400"
        preserveAspectRatio="xMidYMax slice"
      >
        <path
          d="M0 320 L120 230 L220 280 L320 200 L440 250 L560 170 L680 220 L800 160 L920 210 L1040 180 L1200 240 L1200 400 L0 400 Z"
          fill="rgb(var(--brand-700) / 0.55)"
        />
      </svg>
      <svg
        className="absolute left-0 right-0 w-full"
        style={{ top: '55vh', height: '45vh', transform: `translate3d(0, ${offset * 0.85}px, 0)` }}
        viewBox="0 0 1200 400"
        preserveAspectRatio="xMidYMax slice"
      >
        <path
          d="M0 360 L160 280 L260 320 L380 260 L500 300 L620 240 L740 290 L860 250 L980 300 L1120 270 L1200 310 L1200 400 L0 400 Z"
          fill="rgb(var(--brand-800) / 0.7)"
        />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ig-primary" />
      <style jsx>{`
        .sky-gradient {
          background: linear-gradient(
            180deg,
            rgb(var(--brand-100)) 0%,
            rgb(var(--brand-200)) 35%,
            rgb(var(--brand-300) / 0.7) 70%,
            transparent 100%
          );
        }
        :global(.dark) .sky-gradient {
          background: linear-gradient(
            180deg,
            rgb(var(--brand-900) / 0.7) 0%,
            rgb(var(--brand-800) / 0.55) 35%,
            rgb(var(--brand-700) / 0.35) 70%,
            transparent 100%
          );
        }
      `}</style>
    </div>
  );
}
