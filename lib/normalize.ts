// ── Company name normalization + fuzzy matching ───────────────────────────────
// Used for entity resolution across permits, contacts, CRM data

const LEGAL_SUFFIXES =
  /\b(ltd|limited|inc|incorporated|corp|corporation|llc|lp|co|company|group|holdings|enterprises|properties|development|developments|realty|construction|builders|builder|homes|home|design|designs|architecture|architects|engineering|engineers|consulting|consultants|management|services|solutions)\b\.?/gi;

/** Strip legal suffixes, punctuation, extra whitespace. Returns lowercase. */
export function normalizeCompany(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(LEGAL_SUFFIXES, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Jaccard similarity on word-token sets. Returns 0–1. */
export function companySimilarity(a: string, b: string): number {
  const setA = new Set(normalizeCompany(a).split(" ").filter(Boolean));
  const setB = new Set(normalizeCompany(b).split(" ").filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach((t) => { if (setB.has(t)) intersection++; });
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

/** Returns true if two company names refer to the same entity (threshold 0.75). */
export function isSameCompany(a: string, b: string): boolean {
  return companySimilarity(a, b) >= 0.75;
}

/** Find the best matching company in a list. Returns null if no match ≥ threshold. */
export function findMatchingCompany(
  target: string,
  candidates: string[],
  threshold = 0.75
): { name: string; score: number } | null {
  let best: { name: string; score: number } | null = null;
  for (const c of candidates) {
    const score = companySimilarity(target, c);
    if (score >= threshold && (!best || score > best.score)) {
      best = { name: c, score };
    }
  }
  return best;
}

/** Normalize a person's name for deduplication. */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
}
