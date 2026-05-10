type Props = {
  size?: number;
  className?: string;
  ariaLabel?: string;
};

export default function Spinner({ size = 16, className = '', ariaLabel = 'Loading' }: Props) {
  return (
    <svg
      role="status"
      aria-label={ariaLabel}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`shrink-0 animate-spin motion-reduce:animate-none ${className}`}
      fill="none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M12 3 a 9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
