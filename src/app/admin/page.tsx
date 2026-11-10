'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { QUIZ_QUESTIONS, type QuizQuestion } from '@content/quiz';
import { LOCAL_QUESTIONS_KEY, newQuestionId, parseQuestion, sanitizeQuestionList, type CustomQuestion } from '@shared/questions';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { CHOICE_STYLES } from '@/lib/colors';

/**
 * Espace admin (site statique) :
 *  - mode GitHub : les questions sont enregistrées dans public/questions.json du dépôt
 *    via l'API GitHub, avec une clé personnelle limitée au dépôt → le site se met à jour tout seul ;
 *  - mode local : enregistrées dans ce navigateur (export / import possibles).
 */

type Category = QuizQuestion['category'];
type Draft = Omit<QuizQuestion, 'answer'> & { id?: string; answer: number };

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'culture', label: '🌍 Culture G' },
  { value: 'enigme', label: '🧩 Énigme' },
  { value: 'piege', label: '🪤 Piège / scolaire' },
];
const catLabel = (c: Category) => CATEGORIES.find((x) => x.value === c)?.label ?? c;
const EMPTY: Draft = { category: 'culture', question: '', choices: ['', '', '', ''], answer: 0, explanation: '' };

const FILE_PATH = 'public/questions.json';
const TOKEN_KEY = 'partyhub:gh-token';
const REPO_KEY = 'partyhub:gh-repo';
const MODE_KEY = 'partyhub:admin-mode';
const DEFAULT_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? '';

const store = {
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

/* ---------------- GitHub ---------------- */

const toBase64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const fromBase64 = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

class GitHubError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function gh<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
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
              ? 'Le fichier a changé entre-temps : recharge et réessaie.'
              : data.message ?? `Erreur GitHub ${res.status}`;
    throw new GitHubError(msg, res.status);
  }
  return data as T;
}

async function loadFromGitHub(token: string, repo: string): Promise<{ list: CustomQuestion[]; sha?: string }> {
  try {
    const file = await gh<{ content: string; sha: string }>(token, `/repos/${repo}/contents/${FILE_PATH}`);
    return { list: sanitizeQuestionList(JSON.parse(fromBase64(file.content) || '[]')), sha: file.sha };
  } catch (err) {
    if (err instanceof GitHubError && err.status === 404) {
      await gh(token, `/repos/${repo}`); // le dépôt existe-t-il ?
      return { list: [], sha: undefined };
    }
    throw err;
  }
}

async function saveToGitHub(token: string, repo: string, list: CustomQuestion[], sha: string | undefined, message: string) {
  const res = await gh<{ content: { sha: string } }>(token, `/repos/${repo}/contents/${FILE_PATH}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: toBase64(`${JSON.stringify(list, null, 2)}\n`), ...(sha ? { sha } : {}) }),
  });
  return res.content.sha;
}

/* ---------------- Local ---------------- */

const loadLocal = () => {
  try {
    return sanitizeQuestionList(JSON.parse(store.get(LOCAL_QUESTIONS_KEY) ?? '[]'));
  } catch {
    return [];
  }
};
const saveLocal = (list: CustomQuestion[]) => store.set(LOCAL_QUESTIONS_KEY, JSON.stringify(list));

/* ================================================================== */

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

  const logout = () => {
    store.set(TOKEN_KEY, null);
    store.set(MODE_KEY, null);
    setToken('');
    setMode('none');
  };

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
        <Dashboard mode={mode} token={token} repo={repo} onLogout={logout} />
      )}
    </main>
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

function Dashboard({ mode, token, repo, onLogout }: { mode: 'github' | 'local'; token: string; repo: string; onLogout: () => void }) {
  const [list, setList] = useState<CustomQuestion[]>([]);
  const [sha, setSha] = useState<string | undefined>();
  const [localList, setLocalList] = useState<CustomQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showBuiltin, setShowBuiltin] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLocalList(loadLocal());
    try {
      if (mode === 'github') {
        const r = await loadFromGitHub(token, repo);
        setList(r.list);
        setSha(r.sha);
      } else setList(loadLocal());
    } catch (err) {
      setError((err as Error).message);
      if (err instanceof GitHubError && err.status === 401) onLogout();
    } finally {
      setLoading(false);
    }
  }, [mode, token, repo, onLogout]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Enregistre la nouvelle liste (GitHub ou navigateur). */
  async function persist(next: CustomQuestion[], message: string, success: string) {
    setSaving(true);
    setError(null);
    setFlash(null);
    try {
      if (mode === 'github') setSha(await saveToGitHub(token, repo, next, sha, message));
      else saveLocal(next);
      setList(next);
      setFlash(success);
      setTimeout(() => setFlash(null), 4000);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = parseQuestion(editing);
    if (typeof q === 'string') return setError(q);
    const existing = editing.id ? list.find((x) => x.id === editing.id) : undefined;
    const next = existing
      ? list.map((x) => (x.id === existing.id ? { ...existing, ...q } : x))
      : [...list, { ...q, id: newQuestionId(), createdAt: Date.now(), author: mode === 'github' ? repo.split('/')[0] : undefined }];
    const ok = await persist(
      next,
      existing ? `Quiz : modification d’une question` : `Quiz : ajout « ${q.question.slice(0, 60)} »`,
      mode === 'github' ? 'Enregistré sur GitHub ✅ — en ligne dans 1 à 2 min' : 'Enregistré dans ce navigateur ✅',
    );
    if (ok) setEditing({ ...EMPTY, category: editing.category });
  }

  async function remove(q: CustomQuestion) {
    if (!confirm(`Supprimer la question « ${q.question} » ?`)) return;
    if (editing.id === q.id) setEditing(EMPTY);
    await persist(list.filter((x) => x.id !== q.id), 'Quiz : suppression d’une question', 'Question supprimée');
  }

  async function pushLocalToGitHub() {
    const known = new Set(list.map((q) => q.question.toLowerCase()));
    const extra = localList.filter((q) => !known.has(q.question.toLowerCase()));
    if (!extra.length) return setFlash('Rien de nouveau à envoyer.');
    if (await persist([...list, ...extra], `Quiz : import de ${extra.length} question(s)`, `${extra.length} question(s) envoyée(s) sur GitHub ✅`)) {
      saveLocal([]);
      setLocalList([]);
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'questions-partyhub.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importJson(file: File) {
    try {
      const imported = sanitizeQuestionList(JSON.parse(await file.text()));
      const known = new Set(list.map((q) => q.question.toLowerCase()));
      const extra = imported.filter((q) => !known.has(q.question.toLowerCase()));
      if (!extra.length) return setFlash('Aucune nouvelle question dans ce fichier.');
      await persist([...list, ...extra], `Quiz : import de ${extra.length} question(s)`, `${extra.length} question(s) importée(s) ✅`);
    } catch {
      setError('Fichier invalide (JSON attendu).');
    }
  }

  const counts = useMemo(() => {
    const all = [...QUIZ_QUESTIONS, ...list];
    const by = (c: Category) => all.filter((q) => q.category === c).length;
    return { total: all.length, culture: by('culture'), enigme: by('enigme'), piege: by('piege') };
  }, [list]);

  const match = (q: QuizQuestion) => {
    const s = search.trim().toLowerCase();
    return !s || `${q.question} ${q.choices.join(' ')}`.toLowerCase().includes(s);
  };
  const setChoice = (i: number, v: string) => {
    const choices = [...editing.choices] as Draft['choices'];
    choices[i] = v;
    setEditing({ ...editing, choices });
  };
  const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt).filter(match);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Questions du quiz</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
            {mode === 'github' ? (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-emerald-200">☁️ Sauvegarde GitHub · {repo}</span>
            ) : (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-amber-200">💾 Sauvegarde dans ce navigateur</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={exportJson}>
            ⬇️ Exporter
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-semibold hover:bg-white/12">
            ⬆️ Importer
            <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          </label>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            {mode === 'github' ? 'Se déconnecter' : 'Changer de mode'}
          </Button>
        </div>
      </div>

      {mode === 'github' && localList.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm">
          <span>Tu as {localList.length} question(s) enregistrée(s) dans ce navigateur.</span>
          <Button size="sm" onClick={pushLocalToGitHub} disabled={saving}>
            Les envoyer sur GitHub
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Total" value={counts.total} />
        <Stat label="Ajoutées par toi" value={list.length} accent />
        <Stat label="🌍 Culture" value={counts.culture} />
        <Stat label="🧩 Énigmes" value={counts.enigme} />
        <Stat label="🪤 Pièges" value={counts.piege} />
      </div>

      <form onSubmit={submit} className="panel space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{editing.id ? '✏️ Modifier la question' : '➕ Nouvelle question'}</h2>
          {editing.id && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(EMPTY)}>
              Annuler
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setEditing({ ...editing, category: c.value })}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                editing.category === c.value ? 'bg-fuchsia-500/25 text-white ring-2 ring-fuchsia-400' : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div>
          <label className="label" htmlFor="q-text">
            Question
          </label>
          <textarea
            id="q-text"
            className="input min-h-20 resize-y"
            maxLength={300}
            placeholder="Ex : Quelle est la capitale de l’Islande ?"
            value={editing.question}
            onChange={(e) => setEditing({ ...editing, question: e.target.value })}
          />
        </div>
        <div>
          <span className="label">Réponses — clique sur ✓ pour indiquer la bonne</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {editing.choices.map((c, i) => {
              const s = CHOICE_STYLES[i];
              const correct = editing.answer === i;
              return (
                <div key={i} className={`flex items-center gap-2 rounded-2xl p-1.5 ${correct ? 'bg-emerald-500/15 ring-2 ring-emerald-400' : 'bg-white/[0.03]'}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.bg} text-sm`}>{s.shape}</span>
                  <input
                    className="min-w-0 flex-1 bg-transparent px-1 py-1.5 outline-none placeholder:text-zinc-600"
                    maxLength={120}
                    placeholder={`Réponse ${i + 1}`}
                    value={c}
                    onChange={(e) => setChoice(i, e.target.value)}
                    aria-label={`Réponse ${i + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, answer: i })}
                    className={`h-9 shrink-0 rounded-xl px-3 text-sm font-bold transition ${correct ? 'bg-emerald-500 text-white' : 'bg-white/5 text-zinc-500 hover:bg-white/10'}`}
                    aria-label={`Marquer la réponse ${i + 1} comme bonne`}
                  >
                    ✓
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="q-expl">
            Explication (facultative, affichée après la réponse)
          </label>
          <input
            id="q-expl"
            className="input"
            maxLength={300}
            placeholder="Ex : Reykjavik est la capitale la plus au nord du monde."
            value={editing.explanation ?? ''}
            onChange={(e) => setEditing({ ...editing, explanation: e.target.value })}
          />
        </div>
        {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="success" disabled={saving || loading}>
            {saving ? 'Enregistrement…' : editing.id ? 'Enregistrer les modifications' : 'Ajouter la question'}
          </Button>
          <AnimatePresence>
            {flash && (
              <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-sm font-semibold text-emerald-300">
                {flash}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </form>

      <div className="panel p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Tes questions ({list.length})</h2>
          <input className="input max-w-xs py-2 text-sm" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <p className="p-6 text-center text-sm text-zinc-500">Chargement…</p>
        ) : sorted.length ? (
          <ul className="space-y-2">
            {sorted.map((q) => (
              <QuestionRow
                key={q.id}
                q={q}
                onEdit={() => {
                  setEditing({ ...q, explanation: q.explanation ?? '' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDelete={() => remove(q)}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border-2 border-dashed border-white/8 p-6 text-center text-sm text-zinc-500">
            {list.length ? 'Aucun résultat.' : 'Tu n’as pas encore ajouté de question.'}
          </p>
        )}

        <button onClick={() => setShowBuiltin(!showBuiltin)} className="mt-6 text-sm font-semibold text-zinc-400 hover:text-white">
          {showBuiltin ? '▾' : '▸'} Questions intégrées ({QUIZ_QUESTIONS.length}) — modifiables dans content/quiz.ts
        </button>
        {showBuiltin && (
          <ul className="mt-3 space-y-2">
            {QUIZ_QUESTIONS.filter(match).map((q, i) => (
              <QuestionRow key={i} q={q} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-fuchsia-400/30 bg-fuchsia-500/10' : 'border-white/8 bg-ink-850/80'}`}>
      <div className="font-mono text-2xl font-black">{value}</div>
      <div className="text-xs text-zinc-400">{label}</div>
    </div>
  );
}

function QuestionRow({ q, onEdit, onDelete }: { q: QuizQuestion; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <li className="rounded-2xl border border-white/8 bg-ink-900/70 p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-zinc-500">{catLabel(q.category)}</div>
          <div className="font-semibold">{q.question}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {q.choices.map((c, i) => (
              <span key={i} className={`rounded-lg px-2 py-0.5 text-xs ${i === q.answer ? 'bg-emerald-500/20 font-bold text-emerald-200' : 'bg-white/5 text-zinc-400'}`}>
                {c}
              </span>
            ))}
          </div>
        </div>
        {onEdit && (
          <div className="flex shrink-0 gap-1">
            <button onClick={onEdit} className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Modifier">
              ✏️
            </button>
            <button onClick={onDelete} className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-rose-500/15 hover:text-rose-300" aria-label="Supprimer">
              🗑️
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
