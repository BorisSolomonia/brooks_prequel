export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export type TourSideEffect =
  | { kind: 'click'; selector: string }
  | { kind: 'sequentialHighlight'; selector: string }
  | { kind: 'discoverCreator' }
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
    kind: 'centered',
    id: 'memory-intro',
    route: '/maps',
    title: 'Memories panel',
    body: 'Watch — the panel slides up from the bottom. It lights up so you know where it lives.',
  },
  {
    kind: 'spotlight',
    id: 'memory-form',
    route: '/maps',
    selector: '[data-tour="memory-form"]',
    placement: 'top',
    title: 'Create a hidden memory',
    body: 'Fill in your message, optional photo or voice, then Save. Share the link — friends unlock it only when they arrive at this spot.',
    sideEffect: { kind: 'click', selector: '[data-tour="memory-create"]' },
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
    route: '/search/creators?q=brooks',
    selector: '[data-tour="first-creator-card"]',
    placement: 'bottom',
    title: 'Sample creator',
    body: 'This is a creator on Brooks. Tap a card to visit their profile.',
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
    kind: 'centered',
    id: 'add-to-calendar',
    route: '/trips',
    title: 'Add to Calendar',
    body: 'After buying a guide, open any trip from this page. The Add to Calendar button at the top syncs with Google Calendar or downloads an .ics file.',
    illustration: `<svg viewBox="0 0 280 130" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Trip page with Add to Calendar button highlighted">
      <rect x="0.5" y="0.5" width="279" height="129" rx="10" fill="rgb(var(--bg-primary))" stroke="rgb(var(--brand-200))"/>
      <text x="14" y="28" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="rgb(var(--text-primary))">48 Hours in Tbilisi</text>
      <text x="14" y="44" font-family="system-ui,sans-serif" font-size="8" fill="rgb(var(--text-tertiary))">Tbilisi • 2 days • 6 places</text>
      <rect x="14" y="58" width="86" height="22" rx="6" fill="none" stroke="rgb(var(--brand-300))"/>
      <text x="57" y="73" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" fill="rgb(var(--text-secondary))">Open in Maps</text>
      <rect x="108" y="56" width="118" height="26" rx="7" fill="rgb(var(--brand-500))" stroke="rgb(var(--brand-600))" stroke-width="1.5"/>
      <text x="167" y="72" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" font-weight="700" fill="#fff">📅 Add to Calendar</text>
      <rect x="105" y="53" width="124" height="32" rx="8" fill="none" stroke="rgb(var(--brand-500))" stroke-width="2" stroke-dasharray="3 3" opacity="0.85"/>
      <path d="M167 96 L167 110 M161 104 L167 110 L173 104" stroke="rgb(var(--brand-500))" stroke-width="2" fill="none" stroke-linecap="round"/>
      <text x="167" y="124" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8" font-weight="700" fill="rgb(var(--brand-500))" letter-spacing="0.8">TAP HERE</text>
    </svg>`,
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
