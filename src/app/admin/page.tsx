'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_REPO, gh, MODE_KEY, REPO_KEY, store, TOKEN_KEY } from '@/components/admin/github';
import { QuestionsTab } from '@/components/admin/QuestionsTab';
import { RankTab } from '@/components/admin/RankTab';
import type { AdminContext } from '@/components/admin/useListStore';
import { VideoTab } from '@/components/admin/VideoTab';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';

/**
 * Espace admin (site statique) : questions du quiz + clips vidéo.
 *  - mode GitHub : enregistrés dans public/*.json du dépôt via l'API GitHub (clé limitée au dépôt),
 *    le site se met à jour tout seul ;
 *  - mode local : enregistrés dans ce navigateur (export / import possibles).
 */

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<'none' | 'github' | 'local'>('none');
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState(DEFAULT_REPO);

  useEffect(() => {
    const t = store.get(TOKEN_KEY);
    setRepo(store.get(REPO_KEY) || DEFAULT_REPO);
    if (t) {
      setToken(t);
      setMode('github');
    } else if (store.get(MODE_KEY) === 'local') setMode('local');
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    store.set(TOKEN_KEY, null);
    store.set(MODE_KEY, null);
    setToken('');
    setMode('none');
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-8 flex items-center justify-between">
        <Logo />
        <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-200">
          Espace admin
        </span>
      </header>
      {!ready ? null : mode === 'none' ? (
        <Connect
          repo={repo}
          onGitHub={(t, r) => {
            store.set(TOKEN_KEY, t);
            store.set(REPO_KEY, r);
            setToken(t);
            setRepo(r);
            setMode('github');
          }}
          onLocal={() => {
            store.set(MODE_KEY, 'local');
            setMode('local');
          }}
        />
      ) : (
        <Dashboard ctx={{ mode, token, repo, onLogout: logout }} />
      )}
    </main>
  );
}

const TABS = [
  { id: 'questions', label: '🧠 Questions du quiz' },
  { id: 'rank', label: '🏆 Devine le rang' },
  { id: 'video', label: '🎬 Devine la suite' },
] as const;

function Dashboard({ ctx }: { ctx: AdminContext }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('questions');
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Contenu des jeux</h1>
          <p className="mt-1 text-sm">
            {ctx.mode === 'github' ? (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-emerald-200">☁️ Sauvegarde GitHub · {ctx.repo}</span>
            ) : (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-amber-200">💾 Sauvegarde dans ce navigateur</span>
            )}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={ctx.onLogout}>
          {ctx.mode === 'github' ? 'Se déconnecter' : 'Changer de mode'}
        </Button>
      </div>
      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-ink-900 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === t.id ? 'bg-white/10 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'questions' && <QuestionsTab ctx={ctx} />}
      {tab === 'rank' && <RankTab ctx={ctx} />}
      {tab === 'video' && <VideoTab ctx={ctx} />}
    </div>
  );
}

function Connect({ repo: initialRepo, onGitHub, onLocal }: { repo: string; onGitHub: (token: string, repo: string) => void; onLocal: () => void }) {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState(initialRepo);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = repo.trim().replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '');
      const info = await gh<{ permissions?: { push?: boolean } }>(token.trim(), `/repos/${r}`);
      if (info.permissions && !info.permissions.push) throw new Error('Ce compte n’a pas le droit de modifier ce dépôt.');
      onGitHub(token.trim(), r);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-[1.3fr_1fr]">
      <form onSubmit={submit} className="panel space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-black">Connexion avec GitHub</h1>
          <p className="mt-1 text-sm text-zinc-400">Tes questions sont enregistrées dans ton dépôt et le site se met à jour tout seul (1 à 2 min).</p>
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-300">
          <li>
            Ouvre{' '}
            <a className="text-fuchsia-300 underline" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
              la création de clé GitHub
            </a>{' '}
            (« Fine-grained token »).
          </li>
          <li>
            <b>Repository access</b> → <i>Only select repositories</i> → choisis ton dépôt.
          </li>
          <li>
            <b>Permissions</b> → <i>Contents</i> → <b>Read and write</b>.
          </li>
          <li>Génère la clé, copie-la et colle-la ici (elle reste uniquement dans ce navigateur).</li>
        </ol>
        <div>
          <label className="label" htmlFor="gh-repo">
            Dépôt (propriétaire/nom)
          </label>
          <input id="gh-repo" className="input" placeholder="pseudo/partyhub" value={repo} onChange={(e) => setRepo(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="gh-token">
            Clé GitHub
          </label>
          <input id="gh-token" type="password" className="input font-mono text-sm" placeholder="github_pat_…" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} />
        </div>
        {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading || !token.trim() || !repo.includes('/')}>
          {loading ? 'Vérification…' : 'Se connecter'}
        </Button>
      </form>
      <div className="panel flex flex-col justify-between gap-4 p-6">
        <div>
          <h2 className="text-lg font-bold">Sans GitHub</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Les questions sont gardées dans ce navigateur et utilisées quand tu héberges une partie depuis cet appareil. Pense à les exporter pour les sauvegarder.
          </p>
        </div>
        <Button variant="secondary" onClick={onLocal}>
          Continuer en mode local
        </Button>
      </div>
    </div>
  );
}

