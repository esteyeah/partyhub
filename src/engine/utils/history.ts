import { shuffle } from './random';

/**
 * Mémoire des questions déjà posées (dans le navigateur de l'hôte), pour qu'une nouvelle
 * partie ne repose pas les mêmes questions : les inédites d'abord, puis les plus anciennes.
 */
const KEY = 'partyhub-history';
const MAX = 3000;

function load(): Record<string, string[]> {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

export function freshOrder<T>(game: string, pool: readonly T[], id: (t: T) => string | undefined): T[] {
  const seen = load()[game] ?? [];
  const pos = new Map(seen.map((s, i) => [s, i]));
  const unseen = shuffle(pool.filter((t) => !pos.has(id(t) ?? '')));
  const old = shuffle(pool.filter((t) => pos.has(id(t) ?? ''))).sort((a, b) => pos.get(id(a)!)! - pos.get(id(b)!)!);
  return [...unseen, ...old];
}

export function remember(game: string, id: string | undefined) {
  if (!id) return;
  try {
    const all = load();
    const list = (all[game] ?? []).filter((x) => x !== id);
    list.push(id);
    all[game] = list.slice(-MAX);
    globalThis.localStorage?.setItem(KEY, JSON.stringify(all));
  } catch {
    /* stockage indisponible */
  }
}
