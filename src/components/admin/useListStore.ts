'use client';

import { useCallback, useEffect, useState } from 'react';
import { GitHubError, loadJsonFile, saveJsonFile, store } from './github';

export interface AdminContext {
  mode: 'github' | 'local';
  token: string;
  repo: string;
  onLogout: () => void;
}

interface Options<T> {
  path: string;
  localKey: string;
  sanitize: (raw: unknown) => T[];
  /** Clé de dédoublonnage (import, envoi du local vers GitHub) */
  key: (x: T) => string;
}

/**
 * Liste éditable par l'admin, enregistrée sur GitHub ou dans le navigateur.
 */
export function useListStore<T>(ctx: AdminContext, opts: Options<T>) {
  const { mode, token, repo, onLogout } = ctx;
  const { path, localKey, sanitize, key } = opts;
  const [list, setList] = useState<T[]>([]);
  const [localList, setLocalList] = useState<T[]>([]);
  const [sha, setSha] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const readLocal = useCallback(() => {
    try {
      return sanitize(JSON.parse(store.get(localKey) ?? '[]'));
    } catch {
      return [];
    }
  }, [localKey, sanitize]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLocalList(readLocal());
    try {
      if (mode === 'github') {
        const r = await loadJsonFile(token, repo, path, sanitize);
        setList(r.list);
        setSha(r.sha);
      } else setList(readLocal());
    } catch (err) {
      setError((err as Error).message);
      if (err instanceof GitHubError && err.status === 401) onLogout();
    } finally {
      setLoading(false);
    }
  }, [mode, token, repo, path, sanitize, readLocal, onLogout]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = useCallback(
    async (next: T[], message: string, success?: string) => {
      setSaving(true);
      setError(null);
      setFlash(null);
      try {
        if (mode === 'github') setSha(await saveJsonFile(token, repo, path, next, sha, message));
        else store.set(localKey, JSON.stringify(next));
        setList(next);
        setFlash(success ?? (mode === 'github' ? 'Enregistré sur GitHub ✅ — en ligne dans 1 à 2 min' : 'Enregistré dans ce navigateur ✅'));
        setTimeout(() => setFlash(null), 4000);
        return true;
      } catch (err) {
        setError((err as Error).message);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [mode, token, repo, path, sha, localKey],
  );

  /** Ajoute des éléments en ignorant les doublons */
  const merge = useCallback(
    async (extra: T[], message: string) => {
      const known = new Set(list.map(key));
      const fresh = extra.filter((x) => !known.has(key(x)));
      if (!fresh.length) {
        setFlash('Rien de nouveau à ajouter.');
        return false;
      }
      return persist([...list, ...fresh], message, `${fresh.length} élément(s) ajouté(s) ✅`);
    },
    [list, key, persist],
  );

  const pushLocal = useCallback(async () => {
    if (await merge(localList, `Admin : envoi de ${localList.length} élément(s) depuis le navigateur`)) {
      store.set(localKey, null);
      setLocalList([]);
    }
  }, [merge, localList, localKey]);

  const exportJson = useCallback(
    (filename: string) => {
      const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    },
    [list],
  );

  const importJson = useCallback(
    async (file: File) => {
      try {
        await merge(sanitize(JSON.parse(await file.text())), 'Admin : import de fichier');
      } catch {
        setError('Fichier invalide (JSON attendu).');
      }
    },
    [merge, sanitize],
  );

  return { list, localList, loading, saving, error, setError, flash, persist, pushLocal, exportJson, importJson, mode };
}

export type ListStore<T> = ReturnType<typeof useListStore<T>>;
