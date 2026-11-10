/**
 * Comparaison tolérante aux fautes de frappe pour les réponses libres.
 * - minuscules, accents et ponctuation supprimés
 * - "(feat. X)", "- Remastered"... ignorés
 * - distance de Levenshtein avec une tolérance proportionnelle à la longueur
 */

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\s-\s.*(remaster|version|edit|mix).*$/g, ' ')
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|le|la|les|l)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

export function tolerance(length: number): number {
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  if (length <= 12) return 2;
  return 3;
}

export type MatchResult = 'exact' | 'close' | 'none';

/** Compare une proposition à une liste de réponses acceptées. */
export function fuzzyMatch(guess: string, accepted: string[]): MatchResult {
  const g = normalize(guess);
  if (!g) return 'none';
  let close = false;
  for (const answer of accepted) {
    const a = normalize(answer);
    if (!a) continue;
    if (g === a) return 'exact';
    const tol = tolerance(a.length);
    const d = levenshtein(g, a);
    if (d <= tol) return 'exact';
    // "daft punk one more time" contient "daft punk" -> accepté
    if (a.length >= 4 && (` ${g} `).includes(` ${a} `)) return 'exact';
    if (d <= tol + 2 || (g.length >= 4 && a.startsWith(g))) close = true;
  }
  return close ? 'close' : 'none';
}
