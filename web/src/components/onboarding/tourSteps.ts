export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export type TourSideEffect =
  | { kind: 'click'; selector: string }
  | { kind: 'sequentialHighlight'; selector: string }
  // Fetches /api/tour/sample-creator and navigates. `route` is a template; {username}
  // is substituted with the fetched username. Default = '/creators/{username}'.
  | { kind: 'discoverCreator'; route?: string }
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
  illustration?: string; // inline SVG markup rendered above the body
  sideEffect?: TourSideEffect;
};

export type TourStep = WelcomeStep | SpotlightStep | CenteredStep;

export const tourSteps: TourStep[] = [
  {
    kind: 'welcome',
    id: 'welcome',
    title: 'Welcome to Brooks',
    body: 'Quick tour. Skip anytime.',
  },
  {
    kind: 'spotlight',
    id: 'memory-intro',
    route: '/maps',
    selector: '[data-tour="memory-panel"]',
    placement: 'auto',
    title: 'Memories panel',
    body: 'This panel slides up from the bottom. It holds your memories and nearby guides.',
  },
  {
    kind: 'spotlight',
    id: 'memory-form',
    route: '/maps',
    selector: '[data-tour="memory-form"]',
    placement: 'top',
    title: 'Create a hidden memory',
    body: 'Fill in your message, optional photo or voice, then Save. Share the link — friends unlock it only when they arrive at this spot.',
    // The form is opened idempotently by MapsExperience based on step.id — no click side-effect
    // (a toggle click would CLOSE the form when the user goes back to this step).
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
    selector: '[data-tour="first-creator-card"]',
    placement: 'bottom',
    title: 'Sample creator',
    body: 'This is a creator on Brooks. Tap a card to visit their profile.',
    // Discover any real creator on prod and route to /search/creators?q=<that creator's
    // username> so the search ALWAYS returns at least one result regardless of seed state.
    sideEffect: { kind: 'discoverCreator', route: '/search/creators?q={username}' },
  },
  {
    kind: 'spotlight',
    id: 'creator-profile',
    selector: '[data-tour="creator-profile-header"]',
    placement: 'bottom',
    title: 'Creator profile',
    body: 'Every creator has a profile with their guides for sale below.',
    sideEffect: { kind: 'discoverCreator' },
  },
  {
    kind: 'spotlight',
    id: 'creator-guides',
    selector: '[data-tour="creator-guides-list"]',
    placement: 'top',
    title: 'Their guides',
    body: 'Sample guide cards light up one by one. Tap a card to preview, then Buy via Bank of Georgia iPay.',
    sideEffect: { kind: 'sequentialHighlight', selector: '[data-tour="creator-guides-list"]' },
  },
  {
    kind: 'spotlight',
    id: 'add-to-calendar',
    route: '/trips/preview',
    selector: '[data-tour="add-to-calendar"]',
    placement: 'bottom',
    title: 'Add to Calendar',
    body: 'Tap here to sync this trip with Google Calendar or download an .ics file.',
  },
  {
    kind: 'spotlight',
    id: 'ai-button',
    route: '/guides/new',
    selector: '[data-tour="ai-button-in-guide"]',
    placement: 'bottom',
    title: 'Create with AI',
    body: 'Every guide editor has a Create with AI button. Once you connect an AI key, it drafts and refines guides for you.',
  },
  {
    kind: 'spotlight',
    id: 'ai-keys',
    route: '/profile?tab=ai-keys',
    selector: '[data-tour="ai-keys-panel"]',
    placement: 'top',
    title: 'Connect AI',
    body: 'Paste your provider API key here (OpenAI, Anthropic, Gemini). The AI button in the editor lights up the moment you save.',
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
