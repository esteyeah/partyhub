'use client';

import { useMemo, useState } from 'react';
import { QUIZ_QUESTIONS, type QuizQuestion } from '@content/quiz';
import { LOCAL_QUESTIONS_KEY, newQuestionId, parseQuestion, sanitizeQuestionList, type CustomQuestion } from '@shared/questions';
import { Button } from '@/components/ui/Button';
import { CHOICE_STYLES } from '@/lib/colors';
import { Feedback, RowActions, Stat, Toolbar } from './ui';
import { useListStore, type AdminContext } from './useListStore';

type Category = QuizQuestion['category'];
type Draft = Omit<QuizQuestion, 'answer'> & { id?: string; answer: number };

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'culture', label: '🌍 Culture G' },
  { value: 'enigme', label: '🧩 Énigme' },
  { value: 'piege', label: '🪤 Piège / scolaire' },
];
const catLabel = (c: Category) => CATEGORIES.find((x) => x.value === c)?.label ?? c;
const EMPTY: Draft = { category: 'culture', question: '', choices: ['', '', '', ''], answer: 0, explanation: '' };
const keyOf = (q: QuizQuestion) => q.question.toLowerCase();

export function QuestionsTab({ ctx }: { ctx: AdminContext }) {
  const s = useListStore<CustomQuestion>(ctx, { path: 'public/questions.json', localKey: LOCAL_QUESTIONS_KEY, sanitize: sanitizeQuestionList, key: keyOf });
  const [editing, setEditing] = useState<Draft>(EMPTY);
  const [search, setSearch] = useState('');
  const [showBuiltin, setShowBuiltin] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = parseQuestion(editing);
    if (typeof q === 'string') return s.setError(q);
    const existing = editing.id ? s.list.find((x) => x.id === editing.id) : undefined;
    const next = existing
      ? s.list.map((x) => (x.id === existing.id ? { ...existing, ...q } : x))
      : [...s.list, { ...q, id: newQuestionId(), createdAt: Date.now() }];
    if (await s.persist(next, existing ? 'Quiz : modification d’une question' : `Quiz : ajout « ${q.question.slice(0, 60)} »`)) {
      setEditing({ ...EMPTY, category: editing.category });
    }
  }

  async function remove(q: CustomQuestion) {
    if (!confirm(`Supprimer la question « ${q.question} » ?`)) return;
    if (editing.id === q.id) setEditing(EMPTY);
    await s.persist(s.list.filter((x) => x.id !== q.id), 'Quiz : suppression d’une question', 'Question supprimée');
  }

  const counts = useMemo(() => {
    const all = [...QUIZ_QUESTIONS, ...s.list];
    const by = (c: Category) => all.filter((q) => q.category === c).length;
    return { total: all.length, culture: by('culture'), enigme: by('enigme'), piege: by('piege') };
  }, [s.list]);

  const match = (q: QuizQuestion) => {
    const t = search.trim().toLowerCase();
    return !t || `${q.question} ${q.choices.join(' ')}`.toLowerCase().includes(t);
  };
  const setChoice = (i: number, v: string) => {
    const choices = [...editing.choices] as Draft['choices'];
    choices[i] = v;
    setEditing({ ...editing, choices });
  };
  const sorted = [...s.list].sort((a, b) => b.createdAt - a.createdAt).filter(match);

  return (
    <div className="space-y-6">
      <Toolbar s={s} filename="questions-partyhub.json" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Total" value={counts.total} />
        <Stat label="Ajoutées par toi" value={s.list.length} accent />
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
          <textarea id="q-text" className="input min-h-20 resize-y" maxLength={300} placeholder="Ex : Quelle est la capitale de l’Islande ?" value={editing.question} onChange={(e) => setEditing({ ...editing, question: e.target.value })} />
        </div>
        <ChoicesEditor choices={editing.choices} answer={editing.answer} onChoice={setChoice} onAnswer={(i) => setEditing({ ...editing, answer: i })} />
        <div>
          <label className="label" htmlFor="q-expl">
            Explication (facultative, affichée après la réponse)
          </label>
          <input id="q-expl" className="input" maxLength={300} value={editing.explanation ?? ''} onChange={(e) => setEditing({ ...editing, explanation: e.target.value })} />
        </div>
        <Feedback error={s.error} flash={s.flash} />
        <Button type="submit" variant="success" disabled={s.saving || s.loading}>
          {s.saving ? 'Enregistrement…' : editing.id ? 'Enregistrer les modifications' : 'Ajouter la question'}
        </Button>
      </form>

      <div className="panel p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Tes questions ({s.list.length})</h2>
          <input className="input max-w-xs py-2 text-sm" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {s.loading ? (
          <p className="p-6 text-center text-sm text-zinc-500">Chargement…</p>
        ) : sorted.length ? (
          <ul className="space-y-2">
            {sorted.map((q) => (
              <QuestionRow
                key={q.id}
                q={q}
                actions={
                  <RowActions
                    onEdit={() => {
                      setEditing({ ...q, explanation: q.explanation ?? '' });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onDelete={() => remove(q)}
                  />
                }
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border-2 border-dashed border-white/8 p-6 text-center text-sm text-zinc-500">{s.list.length ? 'Aucun résultat.' : 'Tu n’as pas encore ajouté de question.'}</p>
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

export function ChoicesEditor({ choices, answer, onChoice, onAnswer }: { choices: string[]; answer: number; onChoice: (i: number, v: string) => void; onAnswer: (i: number) => void }) {
  return (
    <div>
      <span className="label">Réponses — clique sur ✓ pour indiquer la bonne</span>
      <div className="grid gap-2 sm:grid-cols-2">
        {choices.map((c, i) => {
          const st = CHOICE_STYLES[i];
          const correct = answer === i;
          return (
            <div key={i} className={`flex items-center gap-2 rounded-2xl p-1.5 ${correct ? 'bg-emerald-500/15 ring-2 ring-emerald-400' : 'bg-white/[0.03]'}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${st.bg} text-sm`}>{st.shape}</span>
              <input className="min-w-0 flex-1 bg-transparent px-1 py-1.5 outline-none placeholder:text-zinc-600" maxLength={120} placeholder={`Réponse ${i + 1}`} value={c} onChange={(e) => onChoice(i, e.target.value)} aria-label={`Réponse ${i + 1}`} />
              <button
                type="button"
                onClick={() => onAnswer(i)}
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
  );
}

function QuestionRow({ q, actions }: { q: QuizQuestion; actions?: React.ReactNode }) {
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
        {actions}
      </div>
    </li>
  );
}
