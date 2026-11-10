import { normalize } from '../../utils/fuzzy';

/**
 * Récupère l'extrait officiel (30 s) d'un titre via l'API publique iTunes Search.
 * Résultats mis en cache en mémoire pour la durée de vie du serveur.
 */
export interface ResolvedPreview {
  previewUrl: string;
  artwork?: string;
}

const cache = new Map<string, ResolvedPreview | null>();


export async function resolvePreview(artist: string, title: string): Promise<ResolvedPreview | null> {
  const key = `${artist}|${title}`;
  if (cache.has(key)) return cache.get(key)!;

  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('term', `${artist} ${title}`);
  url.searchParams.set('entity', 'song');
  url.searchParams.set('limit', '8');
  url.searchParams.set('country', process.env.ITUNES_COUNTRY ?? 'FR');

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      results: { previewUrl?: string; artistName: string; trackName: string; artworkUrl100?: string }[];
    };
    const a = normalize(artist);
    const t = normalize(title);
    const candidates = data.results.filter((r) => r.previewUrl);
    const best =
      candidates.find((r) => normalize(r.artistName).includes(a) && normalize(r.trackName).includes(t)) ??
      candidates.find((r) => normalize(r.artistName).includes(a)) ??
      null;
    const out = best
      ? { previewUrl: best.previewUrl!, artwork: best.artworkUrl100?.replace('100x100bb', '600x600bb') }
      : null;
    cache.set(key, out);
    return out;
  } catch (err) {
    console.warn(`[blindtest] iTunes indisponible pour "${artist} - ${title}":`, (err as Error).message);
    return null; // pas mis en cache : on réessaiera à la prochaine partie
  }
}
