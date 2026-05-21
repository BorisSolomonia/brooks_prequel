// Plain <img> on purpose — not next/image. The Avatar shows a 24-96 px
// circle, so image-optimization (WebP/AVIF, automatic resizing) buys
// almost nothing visible. Earlier this component used <Image> from
// next/image, which routes the URL through /_next/image and validates
// it against next.config.js `images.remotePatterns`. That meant the
// GCS_BUCKET build-arg had to be set correctly at web-image build
// time, and any drift between the bucket the backend writes to and
// the one baked into the build silently broke /profile (avatars on
// the map / drawer worked because those use plain <img>). Plain img
// has no allowlist — any reachable URL works. Other surfaces (guide
// covers, hero images) still use next/image where the optimization
// payoff is real.

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  verified?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-3xl',
};

const sizePx = { sm: 32, md: 40, lg: 64, xl: 96 } as const;

export default function Avatar({ src, name, size = 'md', verified = false }: AvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="relative inline-block">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name || ''}
          width={sizePx[size]}
          height={sizePx[size]}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={`${sizeClasses[size]} rounded-full border-2 border-ig-border object-cover saturate-[0.92] contrast-[1.04]`}
        />
      ) : (
        <div className={`${sizeClasses[size]} flex items-center justify-center rounded-full border-2 border-ig-border bg-ig-elevated font-display font-black text-ig-text-secondary`}>
          {initial}
        </div>
      )}
      {verified && (
        <div className="absolute -bottom-0.5 -right-0.5 rounded-full border border-ig-primary bg-brand-500 p-0.5 text-white">
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}
