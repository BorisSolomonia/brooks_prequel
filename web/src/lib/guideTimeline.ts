// BOR-62: geometry + masking constants for the continuous vertical itinerary
// timeline (Day → Block → Place). One shared spine runs the full height; day
// nodes and block dots sit ON TOP of it and punch a clean gap using a box-shadow
// ring coloured the same as the surface behind them (the "masking trick") — no
// actual gaps in the spine div, so collapsing a day can never leave the line
// over- or under-extended.
//
// All values are in px and exported so the few inline-style call sites stay in
// sync (Tailwind can't express the derived dot offset).

/** Horizontal centre of the spine line, measured from the timeline's left edge. */
export const SPINE = 19;
/** Left padding applied to all content so it clears the spine + nodes. */
export const PAD = 44;
/** Diameter of a Day node (the numbered circle on the spine). */
export const DAY_NODE = 28;
/** Diameter of a Block dot. */
export const BLOCK_DOT = 11;
/** Width of the spine line itself. */
export const SPINE_WIDTH = 2;
/** Thickness of the box-shadow masking ring drawn around nodes/dots. */
export const MASK = 4;

/**
 * The colour the masking ring paints, i.e. the surface the spine runs over.
 * Day nodes and block dots both sit over the timeline's BASE background, so this
 * is `--bg-primary`. If a node is ever rendered on an elevated card instead, the
 * caller must pass that surface's variable so the gap still reads cleanly in
 * Light, Dark and Dim — hence this is a parameter, not a hardcode.
 */
export const MASK_BG = 'var(--bg-primary)';

/** `box-shadow` value that masks the spine behind a node/dot against `surface`. */
export function maskRing(surface: string = MASK_BG): string {
  return `0 0 0 ${MASK}px ${surface}`;
}

/** Vertical offset of a Day node from the top of its row (centres it on a 44px row). */
export const NODE_TOP = 8;
/** Vertical centre of a Day node within its row — where the spine should meet it. */
export const NODE_CENTER = NODE_TOP + DAY_NODE / 2; // 22

/** Absolute left offset for a Day node so its centre lands on the spine. */
export const DAY_NODE_LEFT = SPINE - DAY_NODE / 2; // 5
/** Absolute left for the spine line so it is centred on SPINE. */
export const SPINE_LEFT = SPINE - SPINE_WIDTH / 2; // 18

/**
 * Left offset for a Block dot, RELATIVE to the block card's left edge (which sits
 * at PAD). Pushes the dot back onto the spine: card_left(PAD) + this == SPINE
 * centre. Spec formula: -(PAD - SPINE) - BLOCK_DOT/2.
 */
export const BLOCK_DOT_LEFT = -(PAD - SPINE) - BLOCK_DOT / 2; // -30.5
