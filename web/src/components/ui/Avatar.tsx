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

export default function Avatar({ src, name, size = 'md', verified = false }: AvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="relative inline-block">
      {src ? (
        <img
          src={src}
          alt={name || ''}
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-ig-border`}
        />
      ) : (
        <div className={`${sizeClasses[size]} rounded-full bg-ig-elevated text-ig-text-secondary flex items-center justify-center font-semibold`}>
          {initial}
        </div>
      )}
      {verified && (
        <div className="absolute -bottom-0.5 -right-0.5 bg-ig-blue text-white rounded-full p-0.5">
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}
