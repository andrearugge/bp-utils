// Similarità tra nomi fornitore normalizzati, senza dipendenze esterne.
// Combina overlap token-set (robusto a riordino e token extra: "google ads" vs
// "google ireland") ed edit distance normalizzata (robusta a refusi:
// "hetzner" vs "hetznr"). Input attesi: stringhe già passate da normalizeFornitore.

import { tokens } from "./normalize";

/** Distanza di Levenshtein classica, due righe di DP. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Similarità 0–1 da edit distance, normalizzata sulla lunghezza maggiore. */
export function editSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - editDistance(a, b) / max;
}

/**
 * Overlap token-set 0–1: media tra recall dei token di a e di b (coefficiente
 * di Dice sui set), dove due token contano come uguali anche con un refuso
 * (edit similarity ≥ 0.8, solo per token di 4+ caratteri).
 */
export function tokenSetSimilarity(a: string, b: string): number {
  const ta = [...new Set(tokens(a))];
  const tb = [...new Set(tokens(b))];
  if (ta.length === 0 || tb.length === 0) return a === b ? 1 : 0;

  const matchesToken = (x: string, y: string) =>
    x === y || (x.length >= 4 && y.length >= 4 && editSimilarity(x, y) >= 0.8);

  let matchedA = 0;
  for (const x of ta) if (tb.some((y) => matchesToken(x, y))) matchedA++;
  let matchedB = 0;
  for (const y of tb) if (ta.some((x) => matchesToken(x, y))) matchedB++;

  return (matchedA + matchedB) / (ta.length + tb.length);
}

/**
 * Similarità complessiva 0–1 tra due nomi normalizzati:
 * 1 solo per match esatto; altrimenti max tra token-set overlap ed edit
 * similarity dell'intera stringa, con tetto < 1 per non confondere un fuzzy
 * forte con un match esatto.
 */
export function similarity(a: string, b: string): number {
  if (a === b) return a === "" ? 0 : 1;
  const s = Math.max(tokenSetSimilarity(a, b), editSimilarity(a, b));
  return Math.min(s, 0.99);
}
