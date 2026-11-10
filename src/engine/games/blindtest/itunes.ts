import { normalize } from '../../utils/fuzzy';

/**
 * Récupère l'extrait officiel (30 s) d'un titre via l'API publique iTunes Search.
 * Appel en JSONP depuis le navigateur de l'hôte (l'API n'autorise pas toujours le CORS).
 */
export interface ResolvedPreview {
  previewUrl: string;
  artwork?: string;
}

interface ItunesResult {
  previewUrl?: string;
  artistName: string;
  trackName: string;
  artworkUrl100?: string;
}

const cache = new Map<string, ResolvedPreview | null>();
const COUNTRY = process.env.NEXT_PUBLIC_ITUNES_COUNTRY ?? 'FR';
let jsonpSeq = 0;

function jsonp<T>(url: string, timeoutMs = 6000): Promise<T> {
  return new Promise((resolve, reject) => {
    const cb = `__partyhubItunes${++jsonpSeq}`;
    const script = document.createElement('script');
    const w = window as unknown as Record<string, unknown>;
    const cleanup = () => {
      clearTimeout(timer);
      delete w[cb];
      script.remove();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('timeout'));
    }, timeoutMs);
    w[cb] = (data: T) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('network'));
    };
    script.src = `${url}&callback=${cb}`;
    document.head.appendChild(script);
  });
}

export async function resolvePreview(artist: string, title: string): Promise<ResolvedPreview | null> {
  const key = `${artist}|${title}`;
  if (cache.has(key)) return cache.get(key)!;

  const params = new URLSearchParams({ term: `${artist} ${title}`, entity: 'song', limit: '8', country: COUNTRY });
  try {
    const data = await jsonp<{ results: ItunesResult[] }>(`https://itunes.apple.com/search?${params}`);
    const a = normalize(artist);
    const t = normalize(title);
    const candidates = data.results.filter((r) => r.previewUrl);
    const best =
      candidates.find((r) => normalize(r.artistName).includes(a) && normalize(r.trackName).includes(t)) ??
      candidates.find((r) => normalize(r.artistName).includes(a)) ??
      null;
    const out = best ? { previewUrl: best.previewUrl!, artwork: best.artworkUrl100?.replace('100x100bb', '600x600bb') } : null;
    cache.set(key, out);
    return out;
  } catch (err) {
    console.warn(`[blindtest] iTunes indisponible pour "${artist} - ${title}":`, (err as Error).message);
    return null;
  }
}
