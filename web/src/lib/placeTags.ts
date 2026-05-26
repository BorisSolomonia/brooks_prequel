// Instant, offline heuristic that reorders the suggested-tag pills based on the
// place name/title — no AI call, no latency. E.g. a title containing "theatre"
// pushes entertainment / nightlife / historic site to the front.
//
// Each entry maps trigger keywords → tags to promote (in priority order). Tags
// must match the values in SUGGESTED_TAGS so the promoted pills actually exist.

const RULES: Array<{ keywords: string[]; tags: string[] }> = [
  { keywords: ['theatre', 'theater', 'opera', 'cinema', 'concert', 'club', 'show'], tags: ['entertainment', 'nightlife', 'historic site'] },
  { keywords: ['museum', 'gallery', 'exhibit'], tags: ['museum', 'art gallery', 'historic site'] },
  { keywords: ['restaurant', 'bistro', 'eatery', 'diner', 'grill', 'kitchen'], tags: ['restaurant', 'cafe', 'nightlife'] },
  { keywords: ['cafe', 'coffee', 'bakery', 'tea'], tags: ['cafe', 'restaurant'] },
  { keywords: ['bar', 'pub', 'lounge', 'wine', 'brewery', 'cocktail'], tags: ['bar', 'nightlife', 'entertainment'] },
  { keywords: ['park', 'garden', 'forest', 'lake', 'mountain', 'trail', 'hike'], tags: ['park', 'nature', 'viewpoint'] },
  { keywords: ['beach', 'coast', 'sea', 'bay', 'shore'], tags: ['beach', 'nature', 'viewpoint'] },
  { keywords: ['church', 'cathedral', 'monastery', 'chapel', 'basilica'], tags: ['church', 'historic site'] },
  { keywords: ['temple', 'shrine', 'mosque', 'synagogue'], tags: ['temple', 'historic site'] },
  { keywords: ['market', 'bazaar', 'mall', 'shop', 'store', 'boutique'], tags: ['market', 'shopping'] },
  { keywords: ['castle', 'fortress', 'palace', 'ruins', 'monument', 'tower', 'old town'], tags: ['historic site', 'viewpoint'] },
  { keywords: ['viewpoint', 'lookout', 'overlook', 'panorama', 'hill'], tags: ['viewpoint', 'nature'] },
];

// Return the suggested tags reordered so the ones relevant to `title` come first.
// Stable for the non-promoted tail, so the list never feels random.
export function rankSuggestedTags(title: string, allTags: string[]): string[] {
  const t = title.trim().toLowerCase();
  if (!t) return allTags;

  const promoted: string[] = [];
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => t.includes(kw))) {
      for (const tag of rule.tags) {
        if (allTags.includes(tag) && !promoted.includes(tag)) promoted.push(tag);
      }
    }
  }
  if (promoted.length === 0) return allTags;
  const rest = allTags.filter((tag) => !promoted.includes(tag));
  return [...promoted, ...rest];
}
