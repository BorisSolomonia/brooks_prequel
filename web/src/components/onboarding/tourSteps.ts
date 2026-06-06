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

// Step order matches the user-visible "Stage N" numbering in the in-app tour.
// Stage 1 = welcome (index 0). Spotlights run on /maps then fan out to
// /search → /creators/[username] → /trips/preview → /guides/new → /profile
// → /settings. Reordering or selector edits MUST be checked against the
// data-tour anchors in the matching component files.
export const tourSteps: TourStep[] = [
  // Stage 1
  {
    kind: 'welcome',
    id: 'welcome',
    title: 'Welcome to Brooks',
    body: 'Quick tour. Skip anytime.',
  },
  // Stage 2 — theme toggle (Bright / Dark). Anchored to the Navbar icon
  // that's visible at the current breakpoint; both desktop and mobile
  // navbars render <ThemeToggle/>, only the visible one matches.
  {
    kind: 'spotlight',
    id: 'theme-toggle',
    selector: '[data-tour="theme-toggle"]',
    placement: 'bottom',
    title: 'Bright or dark',
    body: 'Tap the sun / moon icon to switch the theme. The whole app follows.',
  },
  // Stage 3 — burger / drawer trigger on /maps.
  {
    kind: 'spotlight',
    id: 'memory-drawer-trigger',
    route: '/maps',
    selector: '[data-tour="memory-drawer-trigger"]',
    placement: 'bottom',
    title: 'Open the guides + filters menu',
    body: 'Tap this button (top-left of the map) to open the panel with map layers, filter chips, and the list of nearby guides + memories.',
  },
  // Stage 4 — guides + filters panel; the Memories and Guides toggles
  // INSIDE the panel pulse to direct attention. MapsExperience opens the
  // drawer on this step id (700 ms delay) — sequentialHighlight polls
  // for the container so the pulse fires after the panel slides in.
  {
    kind: 'spotlight',
    id: 'memory-intro',
    route: '/maps',
    selector: '[data-tour="memory-panel"]',
    placement: 'auto',
    title: 'Guides + filters panel',
    body: 'This is the panel that just opened. Toggle Memories and Guides on the map; pick filters; browse the list of nearby items.',
    sideEffect: { kind: 'sequentialHighlight', selector: '[data-tour="layer-toggles-container"]' },
  },
  // Stage 5 — "+ Create a memory" pill at the bottom of the map.
  {
    kind: 'spotlight',
    id: 'memory-button',
    route: '/maps',
    selector: '[data-tour="memory-create"]',
    placement: 'top',
    title: 'Create a hidden memory',
    body: 'Tap this button to drop a memory at your current map location. A full-screen composer opens next.',
  },
  // Stage 6 — composer modal; Share-via-link + Share-with-followers
  // pulse to make the two delivery modes obvious. MapsExperience opens
  // the composer for this step id. The container is near the BOTTOM of
  // the composer scroll area, so sequentialHighlight scrolls it into
  // view before pulsing (see OnboardingTour.tsx).
  {
    kind: 'spotlight',
    id: 'memory-form',
    route: '/maps',
    selector: '[data-tour="memory-form"]',
    placement: 'top',
    title: 'New memory composer',
    body: 'Write the message, optional photo or voice, then choose how to deliver: link people can unlock at the spot, or share with a specific follower.',
    sideEffect: { kind: 'sequentialHighlight', selector: '[data-tour="share-mode-container"]' },
  },
  // Stage 7 — global search.
  {
    kind: 'spotlight',
    id: 'search',
    route: '/search',
    selector: '[data-tour="search-bar"]',
    placement: 'bottom',
    title: 'Search',
    body: 'Find guides or creators by city or topic.',
  },
  // Stage 8 — sample creator card.
  {
    kind: 'spotlight',
    id: 'creators',
    selector: '[data-tour="first-creator-card"]',
    placement: 'bottom',
    title: 'Sample creator',
    body: 'This is a creator on Brooks. Tap a card to visit their profile.',
    sideEffect: { kind: 'discoverCreator', route: '/search/creators?q={username}' },
  },
  // Stage 9 — creator profile header.
  {
    kind: 'spotlight',
    id: 'creator-profile',
    selector: '[data-tour="creator-profile-header"]',
    placement: 'bottom',
    title: 'Creator profile',
    body: 'Every creator has a profile with their guides for sale below.',
    sideEffect: { kind: 'discoverCreator' },
  },
  // Stage 10 — single guide card (was the whole list, which forced
  // large-target / centered mode and hid the spotlight outline). The
  // first card's data-tour anchor keeps the target small so the
  // tooltip stays on-screen and only ONE guide is outlined.
  {
    kind: 'spotlight',
    id: 'creator-guides',
    selector: '[data-tour="first-creator-guide-card"]',
    placement: 'top',
    title: 'Their guides',
    body: 'Tap a card to preview, then buy via Bank of Georgia iPay.',
  },
  // Stage 11 — add-to-calendar on the preview trip.
  {
    kind: 'spotlight',
    id: 'add-to-calendar',
    route: '/trips/preview',
    selector: '[data-tour="add-to-calendar"]',
    placement: 'bottom',
    title: 'Add to Calendar',
    body: 'Tap here to sync this trip with Google Calendar or download an .ics file.',
  },
  // Stage 12 — the "Add a hook" generator inside the guide editor. (The old
  // header "Create with AI" button was removed; this step now spotlights the
  // hook generator under the Description field — see GuideMetadataForm's
  // data-tour="hook-generator" anchor.)
  {
    kind: 'spotlight',
    id: 'ai-button',
    route: '/guides/new',
    selector: '[data-tour="hook-generator"]',
    placement: 'bottom',
    title: 'Add a hook',
    body: 'Under the description, tap “Add a hook — what makes this guide unmissable?” Once you connect an AI key, it drafts a compelling opening for your guide.',
  },
  // Stage 13 — connect AI keys panel inside the profile.
  {
    kind: 'spotlight',
    id: 'ai-keys',
    route: '/profile?tab=ai-keys',
    selector: '[data-tour="ai-keys-panel"]',
    placement: 'top',
    title: 'Connect AI',
    body: 'Paste your provider API key here (OpenAI, Anthropic, Gemini). The AI button in the editor lights up the moment you save.',
  },
  // Stage 14 — help / replay entry in settings.
  {
    kind: 'spotlight',
    id: 'help',
    route: '/settings',
    selector: '[data-tour="help-tour-button"]',
    placement: 'top',
    title: 'Help',
    body: 'Replay this tour anytime from Settings → Help & tour.',
  },
];

// The user's self-selected onboarding intent. Drives which path runs.
export type TourRole = 'traveler' | 'creator';

// The abbreviated Traveler path: welcome → the four "create a memory" steps → search.
// (Strictly "search for a guide + create a memory" per the spec.) Order is preserved from
// tourSteps. Creators get the full list unchanged.
const TRAVELER_STEP_IDS = new Set<string>([
  'welcome',
  'memory-drawer-trigger',
  'memory-intro',
  'memory-button',
  'memory-form',
  'search',
]);

/** Steps for the chosen role. Creator = the full tour, byte-identical to before. */
export function stepsForRole(role: TourRole): TourStep[] {
  if (role === 'creator') return tourSteps;
  return tourSteps.filter((s) => TRAVELER_STEP_IDS.has(s.id));
}
