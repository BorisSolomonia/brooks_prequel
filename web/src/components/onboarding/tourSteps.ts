export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export type WelcomeStep = {
  kind: 'welcome';
  title: string;
  body: string;
};

export type SpotlightStep = {
  kind: 'spotlight';
  route?: string;
  selector: string;
  placement: TourPlacement;
  title: string;
  body: string;
};

export type CenteredStep = {
  kind: 'centered';
  route?: string;
  title: string;
  body: string;
};

export type TourStep = WelcomeStep | SpotlightStep | CenteredStep;

export const tourSteps: TourStep[] = [
  {
    kind: 'welcome',
    title: 'Welcome to Brooks',
    body: 'Quick 30-second tour. Skip anytime.',
  },
  {
    kind: 'spotlight',
    route: '/search',
    selector: '[data-tour="search-bar"]',
    placement: 'bottom',
    title: 'Search',
    body: 'Type a city to find guides, places, creators.',
  },
  {
    kind: 'spotlight',
    route: '/search/creators',
    selector: '[data-tour="creators-page"]',
    placement: 'bottom',
    title: 'Creators',
    body: 'Browse travel creators. Tap one to follow.',
  },
  {
    kind: 'spotlight',
    route: '/maps',
    selector: '[data-tour="memory-create"]',
    placement: 'top',
    title: 'Drop a memory',
    body: 'Pin a moment to a spot. Share the link — friends unlock it when they visit.',
  },
  {
    kind: 'spotlight',
    route: '/search/guides',
    selector: '[data-tour="first-guide-card"]',
    placement: 'bottom',
    title: 'Buy a guide',
    body: 'Tap a card → preview → accept Terms → Buy via Bank of Georgia iPay.',
  },
  {
    kind: 'spotlight',
    selector: '[data-tour="trips-tab"]',
    placement: 'top',
    title: 'Purchased guides',
    body: 'Your bought guides land here as Trips — day-by-day with map and schedule.',
  },
  {
    kind: 'spotlight',
    route: '/guides',
    selector: '[data-tour="create-guide"]',
    placement: 'bottom',
    title: 'Create a guide',
    body: '+ New Guide → add title, photos, places → Publish to sell.',
  },
  {
    kind: 'spotlight',
    selector: '[data-tour="help-link"]',
    placement: 'top',
    title: 'Help',
    body: 'Replay this tour anytime from the footer.',
  },
];
