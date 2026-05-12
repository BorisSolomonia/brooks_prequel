export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export type TourSideEffect =
  | { kind: 'click'; selector: string }
  | { kind: 'sequentialHighlight'; selector: string }
  | { kind: 'wait'; ms: number };

export type WelcomeStep = {
  kind: 'welcome';
  id: string;
  title: string;
  body: string;
};

export type SpotlightStep = {
  kind: 'spotlight';
  id: string;
  route?: string;
  selector: string;
  placement: TourPlacement;
  title: string;
  body: string;
  sideEffect?: TourSideEffect;
};

export type CenteredStep = {
  kind: 'centered';
  id: string;
  route?: string;
  title: string;
  body: string;
  sideEffect?: TourSideEffect;
};

export type TourStep = WelcomeStep | SpotlightStep | CenteredStep;

export const tourSteps: TourStep[] = [
  {
    kind: 'welcome',
    id: 'welcome',
    title: 'Welcome to Brooks',
    body: 'Quick 30-second tour. Skip anytime.',
  },
  {
    kind: 'centered',
    id: 'memory-intro',
    route: '/maps',
    title: 'Memories panel',
    body: 'Watch — the panel slides up from the bottom.',
  },
  {
    kind: 'spotlight',
    id: 'memory-button',
    route: '/maps',
    selector: '[data-tour="memory-create"]',
    placement: 'top',
    title: 'Drop a memory',
    body: 'Tap here to pin a moment to this spot. Share the link — friends unlock it only when they arrive.',
  },
  {
    kind: 'spotlight',
    id: 'search',
    route: '/search',
    selector: '[data-tour="search-bar"]',
    placement: 'bottom',
    title: 'Search',
    body: 'Find guides or creators by city or topic.',
  },
  {
    kind: 'spotlight',
    id: 'creators',
    route: '/search/creators',
    selector: '[data-tour="first-creator-card"]',
    placement: 'bottom',
    title: 'Creators',
    body: 'Sample creators appear here. Tap one to open their profile.',
  },
  {
    kind: 'spotlight',
    id: 'creator-profile',
    selector: '[data-tour="creator-profile-header"]',
    placement: 'bottom',
    title: 'Creator profile',
    body: 'Every creator has a profile with their guides for sale below.',
    sideEffect: { kind: 'click', selector: '[data-tour="first-creator-card"] a' },
  },
  {
    kind: 'spotlight',
    id: 'creator-guides',
    selector: '[data-tour="creator-guides-list"]',
    placement: 'top',
    title: 'Their guides',
    body: 'Each card is a guide. Tap one to preview, then Buy via Bank of Georgia iPay.',
    sideEffect: { kind: 'sequentialHighlight', selector: '[data-tour="creator-guides-list"]' },
  },
  {
    kind: 'spotlight',
    id: 'ai-keys',
    route: '/profile?tab=ai-keys',
    selector: '[data-tour="ai-keys-panel"]',
    placement: 'top',
    title: 'Create with AI',
    body: 'Add your AI key here → the guide editor reads, drafts and refines guides for you.',
  },
  {
    kind: 'spotlight',
    id: 'help',
    selector: '[data-tour="help-link"]',
    placement: 'top',
    title: 'Help',
    body: 'Replay this tour anytime from the footer.',
  },
];
