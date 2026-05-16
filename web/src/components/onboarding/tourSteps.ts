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
    // NEW — highlight the hamburger BEFORE the drawer opens, so the user
    // sees where the panel comes from. MapsExperience's tour effect keeps
    // the drawer closed while this step is active.
    kind: 'spotlight',
    id: 'memory-drawer-trigger',
    route: '/maps',
    selector: '[data-tour="memory-drawer-trigger"]',
    placement: 'bottom',
    title: 'Open the guides + filters menu',
    body: 'Tap this button (top-left of the map) to open the panel with map layers, filter chips, and the list of nearby guides + memories.',
  },
  {
    kind: 'spotlight',
    id: 'memory-intro',
    route: '/maps',
    selector: '[data-tour="memory-panel"]',
    placement: 'auto',
    title: 'Guides + filters panel',
    body: 'This is the panel that just opened. It holds map layers, filter chips, and the list of nearby guides and memories.',
  },
  {
    // NEW — highlight the bottom "+ Create a memory" pill BEFORE the
    // composer modal opens. Same pattern as memory-drawer-trigger.
    kind: 'spotlight',
    id: 'memory-button',
    route: '/maps',
    selector: '[data-tour="memory-create"]',
    placement: 'top',
    title: 'Create a hidden memory',
    body: 'Tap this button to drop a memory at your current map location. A full-screen composer opens next.',
  },
  {
    kind: 'spotlight',
    id: 'memory-form',
    route: '/maps',
    selector: '[data-tour="memory-form"]',
    placement: 'top',
    title: 'New memory composer',
    body: 'Fill in your message, add an optional photo or voice, choose visibility, then Save. Share the link — friends unlock it only when they arrive at this spot.',
    // The composer is opened idempotently by MapsExperience based on step.id — no click side-effect
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
    // Updated May 2026 — the Footer is hidden on mobile, so the old
    // [data-tour="help-link"] target no longer renders. Redirect the tour
    // to Settings → Help & tour where the same action lives now.
    kind: 'spotlight',
    id: 'help',
    route: '/settings',
    selector: '[data-tour="help-tour-button"]',
    placement: 'top',
    title: 'Help',
    body: 'Replay this tour anytime from Settings → Help & tour.',
  },
];
