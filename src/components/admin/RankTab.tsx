'use client';

import { useState } from 'react';
import { RANK_LADDERS, type RankGame } from '@content/rank';
import { formatTime, LOCAL_RANK_KEY, newQuestionIdForClip, parseRankClip, sanitizeRankClips, type CustomRankClip } from './clipShared';
import { Button } from '@/components/ui/Button';
import { Feedback, RowActions, Toolbar } from './ui';
import { useListStore, type AdminContext } from './useListStore';
import { clipToDraft, draftToClip, EMPTY_CLIP, YouTubeEditor, type ClipDraft } from './YouTubeEditor';

interface Draft {
  id?: string;
  game: RankGame;
  rank: string;
  context: string;
  source: string;
  clip: ClipDraft;
}
const EMPTY: Draft = { game: 'valorant', rank: '', context: '', source: '', clip: EMPTY_CLIP };
const keyOf = (c: CustomRankClip) => `${c.clip.type === 'youtube' ? c.clip.id : ''}-${c.clip.start}`;

export function RankTab({ ctx }: { ctx: AdminContext }) {
  const s = useListStore<CustomRankClip>(ctx, { path: 'public/rank-clips.json', localKey: LOCAL_RANK_KEY, sanitize: sanitizeRankClips, key: keyOf });
  const [d, setD] = useState<Draft>(EMPTY);
  const ladder = RANK_LADDERS[d.game].ranks as readonly string[];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseRankClip({ game: d.game, rank: d.rank, context: d.context, source: d.source, clip: draftToClip(d.clip) });
    if (typeof parsed === 'string') return s.setError(parsed);
    const existing = d.id ? s.list.find((x) => x.id === d.id) : undefined;
    const next = existing ? s.list.map((x) => (x.id === existing.id ? { ...existing, ...parsed } : x)) : [...s.list, { ...parsed, id: newQuestionIdForClip(), createdAt: Date.now() }];
    if (await s.persist(next, existing ? 'Devine le rang : modification d’un clip' : `Devine le rang : ajout d’un clip ${RANK_LADDERS[parsed.game].name}`)) {
      setD({ ...EMPTY, game: d.game });
    }
  }

  async function remove(c: CustomRankClip) {
    if (!confirm('Supprimer ce clip ?')) return;
    await s.persist(s.list.filter((x) => x.id !== c.id), 'Devine le rang : suppression d’un clip', 'Clip supprimé');
  }

  return (
    <div className="space-y-6">
      <Toolbar s={s} filename="rank-clips-partyhub.json" />
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4 text-sm text-zinc-300">
        💡 Prends des vidéos où le rang est connu (chaînes « guess the rank », vidéos de joueurs qui annoncent leur rang, replays de parties classées…) et
        coupe l’extrait <b>avant</b> que le rang n’apparaisse à l’écran.
      </div>

      <form onSubmit={submit} className="panel space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{d.id ? '✏️ Modifier le clip' : '➕ Nouveau clip'}</h2>
          {d.id && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setD(EMPTY)}>
              Annuler
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(RANK_LADDERS) as RankGame[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setD({ ...d, game: g, rank: '' })}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${d.game === g ? 'bg-cyan-500/25 text-white ring-2 ring-cyan-400' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
            >
              {RANK_LADDERS[g].name}
            </button>
          ))}
        </div>
        <YouTubeEditor value={d.clip} onChange={(clip) => setD({ ...d, clip })} />
        <div>
          <span className="label">Rang réel du joueur</span>
          <div className="flex flex-wrap gap-2">
            {ladder.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setD({ ...d, rank: r })}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${d.rank === r ? 'bg-emerald-500 text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="rk-context">
              Contexte affiché (facultatif)
            </label>
            <input id="rk-context" className="input" maxLength={80} placeholder="Ex : Clutch 1v3 sur Ascent" value={d.context} onChange={(e) => setD({ ...d, context: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="rk-source">
              Source affichée au reveal (facultatif)
            </label>
            <input id="rk-source" className="input" maxLength={120} placeholder="Ex : chaîne YouTube de …" value={d.source} onChange={(e) => setD({ ...d, source: e.target.value })} />
          </div>
        </div>
        <Feedback error={s.error} flash={s.flash} />
        <Button type="submit" variant="success" disabled={s.saving || s.loading}>
          {s.saving ? 'Enregistrement…' : d.id ? 'Enregistrer' : 'Ajouter le clip'}
        </Button>
      </form>

      <div className="panel p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">Tes clips ({s.list.length})</h2>
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
                  <div className="text-xs text-zinc-500">{RANK_LADDERS[c.game].name}</div>
                  <div className="font-semibold">
                    Rang : <span className="text-emerald-300">{c.rank}</span>
                    {c.context && <span className="text-zinc-400"> · {c.context}</span>}
                  </div>
                  <div className="font-mono text-xs text-zinc-500">
                    {formatTime(c.clip.start)} → {formatTime(c.clip.end)}
                  </div>
                </div>
                <RowActions
                  onEdit={() => {
                    if (c.clip.type !== 'youtube') return;
                    setD({ id: c.id, game: c.game, rank: c.rank, context: c.context ?? '', source: c.source ?? '', clip: clipToDraft(c.clip) });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onDelete={() => remove(c)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border-2 border-dashed border-white/8 p-6 text-center text-sm text-zinc-500">Aucun clip pour l’instant : le jeu reste grisé dans le lobby tant qu’il n’y en a pas.</p>
        )}
      </div>
    </div>
  );
}
