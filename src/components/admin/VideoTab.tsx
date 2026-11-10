'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatTime, LOCAL_VIDEO_KEY, newQuestionIdForClip, parseVideoQuestion, sanitizeVideoQuestions, type CustomVideoQuestion } from './clipShared';
import { ChoicesEditor } from './QuestionsTab';
import { Feedback, RowActions, Toolbar } from './ui';
import { useListStore, type AdminContext } from './useListStore';
import { clipToDraft, draftToClip, EMPTY_CLIP, YouTubeEditor, type ClipDraft } from './YouTubeEditor';
import { parseTime } from '@shared/clips';

interface Draft {
  id?: string;
  clip: ClipDraft;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
}
const EMPTY: Draft = { clip: EMPTY_CLIP, question: 'Que va-t-il se passer ?', choices: ['', '', '', ''], answer: 0, explanation: '' };
const keyOf = (c: CustomVideoQuestion) => `${c.clip.type === 'youtube' ? c.clip.id : ''}-${c.clip.start}`;

export function VideoTab({ ctx }: { ctx: AdminContext }) {
  const s = useListStore<CustomVideoQuestion>(ctx, { path: 'public/video-clips.json', localKey: LOCAL_VIDEO_KEY, sanitize: sanitizeVideoQuestions, key: keyOf });
  const [d, setD] = useState<Draft>(EMPTY);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const choices = d.choices.map((c) => c.trim());
    // Une 4e proposition vide est autorisée (3 choix) : on ajuste l'index de la bonne réponse
    const kept = choices.map((c, i) => ({ c, i })).filter((x) => x.c);
    const answer = kept.findIndex((x) => x.i === d.answer);
    const parsed = parseVideoQuestion({
      clip: draftToClip(d.clip),
      revealClip: d.clip.revealEnd ? { end: parseTime(d.clip.revealEnd) } : undefined,
      question: d.question,
      choices: kept.map((x) => x.c),
      answer,
      explanation: d.explanation,
    });
    if (typeof parsed === 'string') return s.setError(answer === -1 ? 'La bonne réponse cochée est vide.' : parsed);
    const existing = d.id ? s.list.find((x) => x.id === d.id) : undefined;
    const next = existing ? s.list.map((x) => (x.id === existing.id ? { ...existing, ...parsed } : x)) : [...s.list, { ...parsed, id: newQuestionIdForClip(), createdAt: Date.now() }];
    if (await s.persist(next, existing ? 'Devine la suite : modification d’une vidéo' : `Devine la suite : ajout « ${parsed.question.slice(0, 50)} »`)) {
      setD(EMPTY);
    }
  }

  async function remove(c: CustomVideoQuestion) {
    if (!confirm('Supprimer cette vidéo ?')) return;
    await s.persist(s.list.filter((x) => x.id !== c.id), 'Devine la suite : suppression d’une vidéo', 'Vidéo supprimée');
  }

  return (
    <div className="space-y-6">
      <Toolbar s={s} filename="video-clips-partyhub.json" />
      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm text-zinc-300">
        💡 Choisis une vidéo courte et drôle (shorts, fails, animaux…), règle la <b>coupure</b> juste avant le moment clé, puis la <b>fin de la suite</b> pour la
        révéler à tout le monde après le vote.
      </div>

      <form onSubmit={submit} className="panel space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{d.id ? '✏️ Modifier la vidéo' : '➕ Nouvelle vidéo'}</h2>
          {d.id && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setD(EMPTY)}>
              Annuler
            </Button>
          )}
        </div>
        <YouTubeEditor value={d.clip} onChange={(clip) => setD({ ...d, clip })} withReveal />
        <div>
          <label className="label" htmlFor="vd-question">
            Question
          </label>
          <input id="vd-question" className="input" maxLength={200} value={d.question} onChange={(e) => setD({ ...d, question: e.target.value })} />
        </div>
        <ChoicesEditor
          choices={d.choices}
          answer={d.answer}
          onChoice={(i, v) => setD({ ...d, choices: d.choices.map((c, j) => (j === i ? v : c)) })}
          onAnswer={(i) => setD({ ...d, answer: i })}
        />
        <p className="-mt-2 text-xs text-zinc-500">3 ou 4 propositions : laisse la 4ᵉ vide si tu n’en veux que 3.</p>
        <div>
          <label className="label" htmlFor="vd-expl">
            Commentaire au reveal (facultatif)
          </label>
          <input id="vd-expl" className="input" maxLength={200} value={d.explanation} onChange={(e) => setD({ ...d, explanation: e.target.value })} />
        </div>
        <Feedback error={s.error} flash={s.flash} />
        <Button type="submit" variant="success" disabled={s.saving || s.loading}>
          {s.saving ? 'Enregistrement…' : d.id ? 'Enregistrer' : 'Ajouter la vidéo'}
        </Button>
      </form>

      <div className="panel p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">Tes vidéos ({s.list.length})</h2>
        {s.loading ? (
          <p className="p-6 text-center text-sm text-zinc-500">Chargement…</p>
        ) : s.list.length ? (
          <ul className="space-y-2">
            {[...s.list].sort((a, b) => b.createdAt - a.createdAt).map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-ink-900/70 p-3">
                {c.clip.type === 'youtube' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`https://i.ytimg.com/vi/${c.clip.id}/mqdefault.jpg`} alt="" className="h-14 w-24 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{c.question}</div>
                  <div className="truncate text-xs text-emerald-300">✔ {c.choices[c.answer]}</div>
                  <div className="font-mono text-xs text-zinc-500">
                    {formatTime(c.clip.start)} → coupure {formatTime(c.clip.end)}
                    {c.revealClip ? ` → fin ${formatTime(c.revealClip.end)}` : ''}
                  </div>
                </div>
                <RowActions
                  onEdit={() => {
                    if (c.clip.type !== 'youtube') return;
                    const choices = [...c.choices, '', '', '', ''].slice(0, 4);
                    setD({ id: c.id, clip: clipToDraft(c.clip, c.revealClip?.end), question: c.question, choices, answer: c.answer, explanation: c.explanation ?? '' });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onDelete={() => remove(c)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border-2 border-dashed border-white/8 p-6 text-center text-sm text-zinc-500">Aucune vidéo pour l’instant : le jeu reste grisé dans le lobby tant qu’il n’y en a pas.</p>
        )}
      </div>
    </div>
  );
}
