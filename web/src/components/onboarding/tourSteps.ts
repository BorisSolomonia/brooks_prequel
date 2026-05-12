export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export type TourSideEffect =
  | { kind: 'click'; selector: string }
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
    kind: 'spotlight',
    id: 'search',
    route: '/search',
    selector: '[data-tour="search-bar"]',
    placement: 'bottom',
    title: 'Search',
    body: 'Type a city to find guides, places, creators.',
  },
  {
    kind: 'spotlight',
    id: 'creators',
    route: '/search/creators',
    selector: '[data-tour="creators-page"]',
    placement: 'bottom',
    title: 'Creators',
    body: 'Browse travel creators. Tap one to follow.',
  },
  {
    kind: 'centered',
    id: 'memory-intro',
    route: '/maps',
    title: 'Memories & Guides panel',
    body: 'Watch the panel slide up from the bottom — it holds your memories and nearby guides.',
  },
  {
    kind: 'spotlight',
    id: 'memory-button',
    route: '/maps',
    selector: '[data-tour="memory-create"]',
    placement: 'top',
    title: 'Drop a memory',
    body: 'Tap here → pin a moment to this spot → add photo or voice → share the link. Friends unlock it only when they arrive.',
  },
  {
    kind: 'spotlight',
    id: 'buy-card',
    route: '/search/guides',
    selector: '[data-tour="first-guide-card"]',
    placement: 'bottom',
    title: 'Buy a guide — step 1',
    body: 'Tap any card to open the guide.',
  },
  {
    kind: 'spotlight',
    id: 'buy-form',
    selector: '[data-tour="guide-buy-section"]',
    placement: 'top',
    title: 'Buy a guide — step 2',
    body: 'Tick the Terms checkbox, then tap Buy. We open the secure Bank of Georgia payment page.',
    sideEffect: { kind: 'click', selector: '[data-tour="first-guide-card"] a' },
  },
  {
    kind: 'centered',
    id: 'buy-ipay',
    title: 'Buy a guide — step 3',
    body: 'Pay with card on Bank of Georgia iPay. After success, the guide lands in Purchased guides.',
  },
  {
    kind: 'spotlight',
    id: 'trips-page',
    route: '/trips',
    selector: '[data-tour="trips-page-header"]',
    placement: 'bottom',
    title: 'Purchased guides',
    body: 'All your bought guides live on this page as Trips.',
  },
  {
    kind: 'spotlight',
    id: 'trips-tab',
    selector: '[data-tour="trips-tab"]',
    placement: 'top',
    title: 'Quick access',
    body: 'Return here anytime from the bottom Trips tab.',
  },
  {
    kind: 'spotlight',
    id: 'create-guide',
    route: '/guides',
    selector: '[data-tour="create-guide"]',
    placement: 'bottom',
    title: 'Create a guide',
    body: '+ New Guide → add title, photos, places → Publish to sell.',
  },
  {
    kind: 'spotlight',
    id: 'ai-keys',
    route: '/profile?tab=ai-keys',
    selector: '[data-tour="ai-keys-panel"]',
    placement: 'top',
    title: 'Create with AI',
    body: 'Add your AI provider key here → the guide editor drafts guides for you.',
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
