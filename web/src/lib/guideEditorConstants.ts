// Shared block-category catalog used by the guide editor (DayPanel "+ Add Block"
// picker, BlockPanel category swap UI, search filters, completeness check).
// Single source of truth — adding a category here updates every consumer.
export interface BlockCategory {
  value: string;
  label: string;
  icon: string;
  /** Short label variant for tight UIs (e.g. "Accom." vs "Accommodation"). */
  shortLabel?: string;
  /**
   * BOR-62: the design-system colour token this category renders in on the
   * itinerary timeline (dot, chip, place bullets). A full CSS colour expression
   * so it can be dropped straight into an inline `style` / box-shadow. NOTE: the
   * brand/accent/ig ramps are stored as space-separated RGB *channels* (for
   * Tailwind's alpha syntax), so they must be wrapped in rgb() to be usable as a
   * colour. Strictly existing variables — no new hex. The ticket's canonical
   * four (Activity→brand, Travel→ig-blue, Stay→success, "Food"→accent) are
   * extended across the real eight categories below.
   */
  colorVar: string;
}

export const BLOCK_CATEGORIES: readonly BlockCategory[] = [
  { value: 'ACTIVITY',      label: 'Activity',      icon: '🎯',  colorVar: 'rgb(var(--brand-500))' },
  { value: 'SAFETY',        label: 'Safety',        icon: '🛡️', colorVar: 'rgb(var(--ig-blue))' },
  { value: 'TRANSPORT',     label: 'Transport',     icon: '🚌',  colorVar: 'rgb(var(--ig-blue))' },
  { value: 'ACCOMMODATION', label: 'Accommodation', icon: '🏨',  shortLabel: 'Accom.', colorVar: 'rgb(var(--ig-success))' },
  { value: 'SHOPPING',      label: 'Shopping',      icon: '🛍️', colorVar: 'rgb(var(--accent-500))' },
  { value: 'SEASONAL',      label: 'Seasonal',      icon: '📅',  colorVar: 'rgb(var(--accent-500))' },
  { value: 'EMERGENCY',     label: 'Emergency',     icon: '🚨',  colorVar: 'rgb(var(--ig-error))' },
  { value: 'SECRET',        label: 'Secret',        icon: '🔑',  colorVar: 'rgb(var(--accent-500))' },
];

/** The timeline colour token for a category, falling back to brand for unknowns. */
export function blockCategoryColor(value: string | null | undefined): string {
  return findBlockCategory(value)?.colorVar ?? 'rgb(var(--brand-500))';
}

export function findBlockCategory(value: string | null | undefined): BlockCategory | undefined {
  if (!value) return undefined;
  return BLOCK_CATEGORIES.find((c) => c.value === value);
}
