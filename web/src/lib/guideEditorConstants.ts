// Shared block-category catalog used by the guide editor (DayPanel "+ Add Block"
// picker, BlockPanel category swap UI, search filters, completeness check).
// Single source of truth — adding a category here updates every consumer.
export interface BlockCategory {
  value: string;
  label: string;
  icon: string;
  /** Short label variant for tight UIs (e.g. "Accom." vs "Accommodation"). */
  shortLabel?: string;
}

export const BLOCK_CATEGORIES: readonly BlockCategory[] = [
  { value: 'ACTIVITY',      label: 'Activity',      icon: '🎯' },
  { value: 'SAFETY',        label: 'Safety',        icon: '🛡️' },
  { value: 'TRANSPORT',     label: 'Transport',     icon: '🚌' },
  { value: 'ACCOMMODATION', label: 'Accommodation', icon: '🏨', shortLabel: 'Accom.' },
  { value: 'SHOPPING',      label: 'Shopping',      icon: '🛍️' },
  { value: 'SEASONAL',      label: 'Seasonal',      icon: '📅' },
  { value: 'EMERGENCY',     label: 'Emergency',     icon: '🚨' },
  { value: 'SECRET',        label: 'Secret',        icon: '🔑' },
];

export function findBlockCategory(value: string | null | undefined): BlockCategory | undefined {
  if (!value) return undefined;
  return BLOCK_CATEGORIES.find((c) => c.value === value);
}
