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
    body: "We'll show you the key spots in 30 seconds. You can skip anytime.",
  },
  {
    kind: 'spotlight',
    selector: '[data-tour="search-bar"]',
    placement: 'bottom',
    title: 'Find anything',
    body: 'Top of every page: search guides, places, and creators. Type a city to discover what is curated.',
  },
  {
    kind: 'spotlight',
    route: '/maps',
    selector: '[data-tour="memory-create"]',
    placement: 'top',
    title: 'How to create a memory',
    body: 'On Maps, drop a memory pin anywhere. Add a photo or audio. Share the link with friends — they unlock it only when they visit the place. Tap any pin you made to view or share.',
  },
  {
    kind: 'spotlight',
    selector: '[data-tour="trips-tab"]',
    placement: 'bottom',
    title: 'Trips',
    body: 'Your purchased guides become Trips here, day-by-day with map and schedule.',
  },
  {
    kind: 'centered',
    title: 'How to buy',
    body: 'Tap any guide card to see its preview. Read it, accept the Terms checkbox, then tap Buy to pay via Bank of Georgia iPay. Free guides skip payment entirely.',
  },
  {
    kind: 'spotlight',
    route: '/guides',
    selector: '[data-tour="create-guide"]',
    placement: 'bottom',
    title: 'How to create a guide',
    body: "In My Guides, tap '+ New Guide' to start. Add title, cover, days, places. Publish to sell on the marketplace.",
  },
  {
    kind: 'spotlight',
    selector: '[data-tour="help-link"]',
    placement: 'top',
    title: 'Help — reopen this tour anytime',
    body: "Want to see this tour again? Tap 'Help' in the footer of any page.",
  },
];
