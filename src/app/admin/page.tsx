'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { CHOICE_STYLES } from '@/lib/colors';

type Category = 'culture' | 'enigme' | 'piege';

interface Question {
  id?: string;
  category: Category;
  question: string;
  choices: [string, string, string, string];
  answer: number;
  explanation?: string;
  author?: string;
  createdAt?: number;
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'culture', label: '🌍 Culture G' },
  { value: 'enigme', label: '🧩 Énigme' },
  { value: 'piege', label: '🪤 Piège / scolaire' },
];
const catLabel = (c: Category) => CATEGORIES.find((x) => x.value === c)?.label ?? c;

const EMPTY: Question = { category: 'culture', question: '', choices: ['', '', '', ''], answer: 0, explanation: '' };
const TOKEN_KEY = 'partyhub:admin-token';

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api/admin/${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? `Erreur ${res.status}`), { status: res.status });
  return data as T;
}

export default function AdminPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    api<{ configured: boolean }>('status').then((r) => setConfigured(r.configured)).catch(() => setConfigured(false));
    setAuthed(!!getToken());
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-8 flex items-center justify-between">
        <Logo />
        <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-200">
          Espace admin
        </span>
      </header>
      {configured === null ? null : !configured ? (
        <NotConfigured />
      ) : authed ? (
        <Dashboard
          onLogout={() => {
            setToken(null);
            setAuthed(false);
          }}
        />
      ) : (
        <Login onSuccess={() => setAuthed(true)} />
      )}
    </main>
  );
}

function NotConfigured() {
  return (
    <div className="panel mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-black">Espace admin non configuré</h1>
      <p className="mt-3 text-zinc-400">
        Crée un fichier <code className="rounded bg-white/10 px-1.5">.env.local</code> à la racine du projet avec ton nom d’admin et un mot de passe (6 caractères minimum), puis redémarre le serveur :
      </p>
      <pre className="mt-4 rounded-xl bg-black/40 p-4 font-mono text-sm text-emerald-300">
        ADMIN_NAME=TonPseudo{'\n'}ADMIN_PASSWORD=unMotDePasseSolide
      </pre>
    </div>
  );
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ token: string }>('login', { method: 'POST', body: JSON.stringify({ name, password }) });
      setToken(r.token);
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel mx-auto max-w-sm space-y-4 p-7">
      <h1 className="text-2xl font-black">Connexion admin</h1>
      <div>
        <label className="label" htmlFor="admin-name">
          Nom admin
        </label>
        <input id="admin-name" className="input" autoComplete="username" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="admin-password">
          Mot de passe
        </label>
        <input id="admin-password" type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading || !name || !password}>
        {loading ? 'Connexion…' : 'Se connecter'}
      </Button>
    </form>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [custom, setCustom] = useState<Question[]>([]);
  const [builtin, setBuiltin] = useState<Question[]>([]);
  const [editing, setEditing] = useState<Question>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showBuiltin, setShowBuiltin] = useState(false);

  const handleError = useCallback(
    (err: unknown) => {
      if ((err as { status?: number }).status === 401) onLogout();
      else setError((err as Error).message);
    },
    [onLogout],
  );

  const refresh = useCallback(() => {
    api<{ custom: Question[]; builtin: Question[] }>('questions')
      .then((r) => {
        setCustom(r.custom);
        setBuiltin(r.builtin);
      })
      .catch(handleError);
  }, [handleError]);

  useEffect(refresh, [refresh]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFlash(null);
    try {
      const body = JSON.stringify(editing);
      if (editing.id) await api(`questions/${editing.id}`, { method: 'PUT', body });
      else await api('questions', { method: 'POST', body });
      setFlash(editing.id ? 'Question modifiée ✅' : 'Question ajoutée au quiz ✅');
      setTimeout(() => setFlash(null), 2500);
      setEditing({ ...EMPTY, category: editing.category });
      refresh();
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  }

  async function remove(q: Question) {
    if (!q.id || !confirm(`Supprimer la question « ${q.question} » ?`)) return;
    try {
      await api(`questions/${q.id}`, { method: 'DELETE' });
      if (editing.id === q.id) setEditing(EMPTY);
      refresh();
    } catch (err) {
      handleError(err);
    }
  }

  const counts = useMemo(() => {
    const all = [...builtin, ...custom];
    return {
      total: all.length,
      culture: all.filter((q) => q.category === 'culture').length,
      enigme: all.filter((q) => q.category === 'enigme').length,
      piege: all.filter((q) => q.category === 'piege').length,
    };
  }, [builtin, custom]);

  const match = (q: Question) => {
    const s = search.trim().toLowerCase();
    return !s || `${q.question} ${q.choices.join(' ')}`.toLowerCase().includes(s);
  };

  const setChoice = (i: number, v: string) => {
    const choices = [...editing.choices] as Question['choices'];
    choices[i] = v;
    setEditing({ ...editing, choices });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Questions du quiz</h1>
          <p className="text-sm text-zinc-400">Les questions ajoutées ici sont utilisées dès la prochaine partie de « Quiz Culture G ».</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          Se déconnecter
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Total" value={counts.total} />
        <Stat label="Ajoutées par toi" value={custom.length} accent />
        <Stat label="🌍 Culture" value={counts.culture} />
        <Stat label="🧩 Énigmes" value={counts.enigme} />
        <Stat label="🪤 Pièges" value={counts.piege} />
      </div>

      {/* Formulaire */}
      <form onSubmit={save} className="panel space-y-4 p-5 sm:p-6">
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
        <div className="flex items-center gap-3">
          <Button type="submit" variant="success" disabled={saving}>
            {editing.id ? 'Enregistrer les modifications' : 'Ajouter la question'}
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

      {/* Liste */}
      <div className="panel p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Tes questions ({custom.length})</h2>
          <input className="input max-w-xs py-2 text-sm" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {custom.filter(match).length ? (
          <ul className="space-y-2">
            {custom.filter(match).map((q) => (
              <QuestionRow key={q.id} q={q} onEdit={() => { setEditing({ ...q, explanation: q.explanation ?? '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onDelete={() => remove(q)} />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border-2 border-dashed border-white/8 p-6 text-center text-sm text-zinc-500">
            {custom.length ? 'Aucun résultat.' : 'Tu n’as pas encore ajouté de question.'}
          </p>
        )}

        <button onClick={() => setShowBuiltin(!showBuiltin)} className="mt-6 text-sm font-semibold text-zinc-400 hover:text-white">
          {showBuiltin ? '▾' : '▸'} Questions intégrées ({builtin.length}) — modifiables dans content/quiz.ts
        </button>
        {showBuiltin && (
          <ul className="mt-3 space-y-2">
            {builtin.filter(match).map((q, i) => (
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

function QuestionRow({ q, onEdit, onDelete }: { q: Question; onEdit?: () => void; onDelete?: () => void }) {
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
