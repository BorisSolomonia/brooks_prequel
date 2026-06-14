// BOR-62: inline stroke SVG icons for the itinerary timeline. No icon fonts, no
// emoji — every glyph is currentColor with a 1.75 stroke so it inherits the
// surrounding text/token colour and stays crisp at any size or theme.

import type { SVGProps, ReactNode, ReactElement } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

// Shared <svg> shell: 24-grid, no fill, currentColor stroke at 1.75, rounded
// caps/joins. Callers size it with className (default 1rem square).
function Svg({ title, children, className, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? 'h-4 w-4'}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function ChevronIcon(props: IconProps & { open?: boolean }) {
  const { open, style, ...rest } = props;
  // A single right-chevron rotated 90° when open, so the rotation can transition.
  return (
    <Svg
      {...rest}
      style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms ease', ...style }}
    >
      <path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function AlertIcon(props: IconProps) {
  // Triangle + exclamation — the empty/missing-info glyph.
  return (
    <Svg {...props}>
      <path d="M10.29 3.86 1.82 18a1.5 1.5 0 0 0 1.29 2.25h17.78A1.5 1.5 0 0 0 22.18 18L13.71 3.86a1.5 1.5 0 0 0-2.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </Svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </Svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

// ── Block-category glyphs ────────────────────────────────────────────────────
// Simple line icons keyed by the category value (see guideEditorConstants).

function ActivityIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
    </Svg>
  );
}
function SafetyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l7 3v5c0 4.5-3 8.2-7 9.5C8 19.2 5 15.5 5 11V6l7-3Z" />
      <path d="M9.5 12l1.8 1.8L15 9.5" />
    </Svg>
  );
}
function TransportIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="16" height="13" rx="2" />
      <path d="M4 11h16" />
      <path d="M7 17v2M17 17v2" />
      <path d="M8 14h.01M16 14h.01" />
    </Svg>
  );
}
function AccommodationIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 18v-5a2 2 0 0 1 2-2h11a3 3 0 0 1 3 3v4" />
      <path d="M3 14h16" />
      <path d="M7 11V9a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" />
      <path d="M3 18v2M21 18v2" />
    </Svg>
  );
}
function ShoppingIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </Svg>
  );
}
function SeasonalIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 10h16" />
      <path d="M8 3v4M16 3v4" />
    </Svg>
  );
}
function EmergencyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </Svg>
  );
}
function SecretIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.8 12.2 20 3" />
      <path d="M16 7l3 3M14 9l2 2" />
    </Svg>
  );
}

const CATEGORY_ICONS: Record<string, (p: IconProps) => ReactElement> = {
  ACTIVITY: ActivityIcon,
  SAFETY: SafetyIcon,
  TRANSPORT: TransportIcon,
  ACCOMMODATION: AccommodationIcon,
  SHOPPING: ShoppingIcon,
  SEASONAL: SeasonalIcon,
  EMERGENCY: EmergencyIcon,
  SECRET: SecretIcon,
};

/** Renders the line glyph for a block category, defaulting to the Activity icon. */
export function BlockCategoryIcon({ category, ...props }: IconProps & { category: string | null | undefined }) {
  const Icon = (category && CATEGORY_ICONS[category]) || ActivityIcon;
  return <Icon {...props} />;
}
