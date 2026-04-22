function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function subsequenceScore(query: string, target: string): number {
  let queryIndex = 0;
  let score = 0;

  for (let targetIndex = 0; targetIndex < target.length && queryIndex < query.length; targetIndex += 1) {
    if (query[queryIndex] === target[targetIndex]) {
      score += queryIndex === targetIndex ? 3 : 1;
      queryIndex += 1;
    }
  }

  return queryIndex === query.length ? score : 0;
}

function tokenScore(token: string, target: string): number {
  if (!token || !target) {
    return 0;
  }

  if (target.startsWith(token)) {
    return 10 + token.length;
  }

  if (target.includes(token)) {
    return 6 + token.length;
  }

  return subsequenceScore(token, target);
}

export function scoreSearchMatch(query: string, values: Array<string | null | undefined>): number {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return 0;
  }

  const normalizedValues = values
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeSearchText(value))
    .filter(Boolean);

  if (normalizedValues.length === 0) {
    return 0;
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  let totalScore = 0;

  for (const token of tokens) {
    let bestTokenScore = 0;
    for (const candidate of normalizedValues) {
      bestTokenScore = Math.max(bestTokenScore, tokenScore(token, candidate));
    }
    if (bestTokenScore <= 0) {
      return 0;
    }
    totalScore += bestTokenScore;
  }

  return totalScore;
}
