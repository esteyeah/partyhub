/**
 * Récupère l'image principale (affiche, jaquette, photo) d'articles Wikipédia anglais.
 * Appel depuis le navigateur de l'hôte (CORS ouvert grâce à `origin=*`), 50 titres par requête.
 * `pilicense=any` : inclut les images non libres (affiches de films, jaquettes de jeux).
 */
const API = 'https://en.wikipedia.org/w/api.php';

export async function resolveWikiImages(titles: string[], size = 900): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50);
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      origin: '*',
      redirects: '1',
      prop: 'pageimages',
      piprop: 'thumbnail',
      pithumbsize: String(size),
      pilicense: 'any',
      titles: chunk.join('|'),
    });
    try {
      const res = await fetch(`${API}?${params}`);
      if (!res.ok) continue;
      const data = await res.json();
      const q = data?.query ?? {};
      // Titre demandé → titre final (normalisation puis redirection)
      const alias = new Map<string, string>();
      for (const n of q.normalized ?? []) alias.set(n.from, n.to);
      for (const r of q.redirects ?? []) alias.set(r.from, r.to);
      const resolve = (t: string) => {
        let cur = t;
        for (let k = 0; k < 3 && alias.has(cur); k++) cur = alias.get(cur)!;
        return cur;
      };
      const images = new Map<string, string>();
      for (const p of q.pages ?? []) if (p?.thumbnail?.source) images.set(p.title, p.thumbnail.source);
      for (const t of chunk) {
        const src = images.get(resolve(t));
        if (src) out.set(t, src);
      }
    } catch {
      /* réseau indisponible : les éléments sans image sont ignorés */
    }
  }
  return out;
}
