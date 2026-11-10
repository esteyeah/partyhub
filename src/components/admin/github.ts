'use client';

/**
 * Sauvegarde des fichiers de l'admin dans le dépôt GitHub (API "contents"),
 * avec une clé personnelle limitée au dépôt et stockée uniquement dans le navigateur.
 */

export const TOKEN_KEY = 'partyhub:gh-token';
export const REPO_KEY = 'partyhub:gh-repo';
export const MODE_KEY = 'partyhub:admin-mode';
export const DEFAULT_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? '';

export const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string | null) => {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
};

const toBase64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const fromBase64 = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

export class GitHubError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function gh<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      res.status === 401
        ? 'Clé GitHub invalide ou expirée.'
        : res.status === 403
          ? 'Cette clé n’a pas le droit d’écrire dans le dépôt (permission « Contents : Read and write »).'
          : res.status === 404
            ? 'Dépôt introuvable avec cette clé.'
            : res.status === 409 || res.status === 422
              ? 'Le fichier a changé entre-temps : recharge la page et réessaie.'
              : data.message ?? `Erreur GitHub ${res.status}`;
    throw new GitHubError(msg, res.status);
  }
  return data as T;
}

export async function loadJsonFile<T>(token: string, repo: string, path: string, sanitize: (raw: unknown) => T[]) {
  try {
    const file = await gh<{ content: string; sha: string }>(token, `/repos/${repo}/contents/${path}`);
    return { list: sanitize(JSON.parse(fromBase64(file.content) || '[]')), sha: file.sha as string | undefined };
  } catch (err) {
    if (err instanceof GitHubError && err.status === 404) {
      await gh(token, `/repos/${repo}`); // le dépôt existe-t-il ?
      return { list: [] as T[], sha: undefined };
    }
    throw err;
  }
}

export async function saveJsonFile(token: string, repo: string, path: string, list: unknown[], sha: string | undefined, message: string) {
  const res = await gh<{ content: { sha: string } }>(token, `/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: toBase64(`${JSON.stringify(list, null, 2)}\n`), ...(sha ? { sha } : {}) }),
  });
  return res.content.sha;
}
