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

// 8-step plan. Steps that REQUIRE a specific UI element to be visible
// use `spotlight` (search bar in navbar, trips tab in navbar, help link
// in footer). Steps that drive route navigation use `centered` because
// target visibility on mobile / collapsed panels is unreliable — the
// tour navigates the user to the right page and explains the flow with
// a centered tooltip while the page renders behind it.
export const tourSteps: TourStep[] = [
  {
    kind: 'welcome',
    title: 'Welcome to Brooks',
    body: "We'll show you the key spots in 30 seconds. You can skip anytime.",
  },
  {
    kind: 'spotlight',
    route: '/search',
    selector: '[data-tour="search-bar"]',
    placement: 'bottom',
    title: 'Find anything',
    body: 'Top of every page: search guides, places, and creators. Type a city to discover what is curated.',
  },
  {
    kind: 'centered',
    route: '/search/creators',
    title: 'Discover creators',
    body: 'Browse travel creators here. Tap any to see their profile, ratings, and the guides they sell. Follow the ones whose vibe fits yours.',
  },
  {
    kind: 'centered',
    route: '/maps',
    title: 'How to create a memory',
    body: 'On the Maps page, open the side panel and tap "Create hidden memory" to drop a pin. Add a photo or audio. Share the link with friends — they unlock it only when they visit the place.',
  },
  {
    kind: 'spotlight',
    selector: '[data-tour="trips-tab"]',
    placement: 'top',
    title: 'Trips',
    body: 'Your purchased guides become Trips here, day-by-day with map and schedule.',
  },
  {
    kind: 'centered',
    title: 'How to buy a guide',
    body: 'Tap any guide card to see its preview. Read the description and reviews, accept the Terms checkbox, then tap Buy to pay via Bank of Georgia iPay. Free guides skip payment entirely.',
  },
  {
    kind: 'centered',
    route: '/guides',
    title: 'How to create a guide',
    body: "In My Guides, tap '+ New Guide' at the top right. Add title, cover photo, days, and places. Hit Publish when ready to sell on the marketplace.",
  },
  {
    kind: 'spotlight',
    selector: '[data-tour="help-link"]',
    placement: 'top',
    title: 'Help — reopen this tour anytime',
    body: "Want to see this tour again? Tap 'Help' in the footer of any page.",
  },
];
