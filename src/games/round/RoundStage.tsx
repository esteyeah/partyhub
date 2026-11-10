'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PlayerPublic, RoomSnapshot, RoundGameView } from '@shared/types';
import { Avatar } from '@/components/ui/Avatar';
import { TimerBar, TimerRing } from '@/components/ui/Timer';
import { CHOICE_STYLES } from '@/lib/colors';
import { sendAction } from '@/lib/socket';

/**
 * Vue générique des jeux à manches. Chaque jeu fournit seulement
 * le rendu de sa "consigne" (question, lecteur audio, vidéo…) via `renderPrompt`,
 * et éventuellement un bloc supplémentaire au reveal via `renderReveal`.
 */
export function RoundStage<P, X>({
  view,
  room,
  you,
  introLabel,
  renderPrompt,
  renderReveal,
}: {
  view: RoundGameView<P, X>;
  room: RoomSnapshot;
  you: string;
  introLabel?: string;
  renderPrompt: (prompt: P, view: RoundGameView<P, X>) => ReactNode;
  renderReveal?: (view: RoundGameView<P, X>) => ReactNode;
}) {
  if (view.message) {
    return <div className="panel p-10 text-center text-lg text-zinc-300">{view.message}</div>;
  }
  if (view.phase === 'loading') {
    return (
      <div className="panel flex flex-col items-center gap-4 p-12 text-zinc-400">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-fuchsia-400" />
        Préparation des manches…
      </div>
    );
  }
  if (view.phase === 'intro') {
    return (
      <div className="panel flex flex-col items-center justify-center gap-3 p-12 text-center">
        <motion.p key={view.round} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }} className="text-6xl font-black sm:text-7xl">
          <span className="text-gradient">
            {introLabel ?? 'Manche'} {view.round}
          </span>
          <span className="text-zinc-600">/{view.totalRounds}</span>
        </motion.p>
        <p className="text-zinc-400">Prépare-toi…</p>
        <div className="mt-4 w-48">
          <TimerBar endsAt={view.endsAt} durationMs={view.durationMs} />
        </div>
      </div>
    );
  }

  const isReveal = view.phase === 'reveal';
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <div className="panel overflow-hidden">
          <div className="flex items-center gap-4 border-b border-white/5 px-5 py-3">
            <span className="rounded-lg bg-white/5 px-2.5 py-1 font-mono text-sm font-bold text-zinc-300">
              {view.round}/{view.totalRounds}
            </span>
            <div className="flex-1">{!isReveal && <TimerBar endsAt={view.endsAt} durationMs={view.durationMs} />}</div>
            {!isReveal && <TimerRing endsAt={view.endsAt} durationMs={view.durationMs} size={48} />}
            {isReveal && <span className="text-sm font-semibold text-emerald-300">Réponse</span>}
          </div>
          <div className="p-5 sm:p-6">{view.prompt && renderPrompt(view.prompt, view)}</div>
        </div>

        {view.input?.kind === 'choice' && <ChoiceInput view={view} />}
        {view.input?.kind === 'text' && <TextInput view={view} />}
        {isReveal && <RevealPanel view={view} players={room.players} extra={renderReveal?.(view)} />}
      </div>

      <aside className="space-y-4">
        <ProgressPanel view={view} players={room.players} you={you} />
        {view.feed.length > 0 && (
          <div className="panel p-4">
            <ul className="space-y-1.5 text-sm">
              <AnimatePresence initial={false}>
                {view.feed.map((f) => (
                  <motion.li key={f.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-emerald-200">
                    {f.text}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ChoiceInput<P, X>({ view }: { view: RoundGameView<P, X> }) {
  if (view.input?.kind !== 'choice') return null;
  const { choices, layout } = view.input;
  const reveal = view.reveal;
  const mine = view.me.choice;
  const total = reveal?.stats?.reduce((a, b) => a + b, 0) ?? 0;

  if (layout === 'ladder') {
    return (
      <div className="panel p-4">
        <p className="mb-3 text-center text-sm text-zinc-400">{reveal ? 'Le vrai rang était…' : mine !== null ? 'Vote enregistré ✅' : 'Quel est son rang ?'}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {choices.map((c, i) => {
            const isCorrect = reveal?.correctIndex === i;
            const near = reveal && reveal.correctIndex !== null && Math.abs(reveal.correctIndex - i) === 1;
            const count = reveal?.stats?.[i] ?? 0;
            return (
              <button
                key={c}
                disabled={!!reveal || mine !== null}
                onClick={() => sendAction({ type: 'answer', choice: i })}
                className={`relative min-w-24 rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                  isCorrect
                    ? 'border-emerald-400 bg-emerald-500/25 text-emerald-100 scale-105'
                    : near
                      ? 'border-amber-400/50 bg-amber-500/10 text-amber-100'
                      : mine === i
                        ? 'border-fuchsia-400 bg-fuchsia-500/25'
                        : 'border-white/10 bg-ink-900 hover:border-white/30 hover:bg-white/5 disabled:hover:bg-ink-900'
                } ${mine !== null && mine !== i && !reveal ? 'opacity-40' : ''}`}
              >
                <span className="mr-1 font-mono text-xs text-zinc-500">{i + 1}</span> {c}
                {reveal && count > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] text-black">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {choices.map((c, i) => {
        const s = CHOICE_STYLES[i % CHOICE_STYLES.length];
        const isCorrect = reveal?.correctIndex === i;
        const pct = total ? Math.round(((reveal?.stats?.[i] ?? 0) / total) * 100) : 0;
        const dim = (reveal && !isCorrect) || (!reveal && mine !== null && mine !== i);
        return (
          <motion.button
            key={`${view.round}-${i}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: dim ? 0.35 : 1, y: 0, scale: isCorrect ? 1.02 : 1 }}
            transition={{ delay: reveal ? 0 : i * 0.06 }}
            disabled={!!reveal || mine !== null}
            onClick={() => sendAction({ type: 'answer', choice: i })}
            className={`relative flex min-h-20 items-center gap-3 overflow-hidden rounded-2xl px-5 py-4 text-left text-lg font-bold text-white shadow-lg transition ${s.bg} ${
              !reveal && mine === null ? `${s.hover} hover:-translate-y-0.5 active:scale-95` : ''
            } ${mine === i ? 'ring-4 ring-white' : ''} ${isCorrect ? 'ring-4 ring-emerald-300' : ''}`}
          >
            {reveal && (
              <motion.span initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="absolute inset-y-0 left-0 bg-black/20" />
            )}
            <span className="relative text-2xl opacity-80">{s.shape}</span>
            <span className="relative flex-1 leading-snug">{c}</span>
            {reveal && <span className="relative font-mono text-base">{pct}%</span>}
            {isCorrect && <span className="relative text-2xl">✅</span>}
          </motion.button>
        );
      })}
    </div>
  );
}

function TextInput<P, X>({ view }: { view: RoundGameView<P, X> }) {
  const [text, setText] = useState('');
  const [shaking, setShaking] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const fb = view.me.feedback;
  const reveal = view.reveal;

  useEffect(() => {
    setText('');
    ref.current?.focus();
  }, [view.round]);
  const fbId = fb && fb.type !== 'found' ? fb.id : null;
  useEffect(() => {
    if (fbId === null) return;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 400);
    return () => clearTimeout(t);
  }, [fbId]);

  if (view.input?.kind !== 'text') return null;
  const keys = view.input.keys;
  const done = view.me.locked;

  return (
    <div className="panel p-4">
      <div className="mb-3 flex flex-wrap justify-center gap-2">
        {keys.map((k) => {
          const found = view.me.found.includes(k.key);
          return (
            <span key={k.key} className={`rounded-full px-3 py-1 text-sm font-semibold ${found ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-zinc-400'}`}>
              {found ? '✅' : '❔'} {k.label}
            </span>
          );
        })}
      </div>
      {!reveal && !done && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            sendAction({ type: 'guess', text });
            setText('');
          }}
          className="flex gap-2"
        >
          <input
            ref={ref}
            className={`input text-lg ${shaking ? 'animate-shake' : ''}`}
            placeholder={view.input.placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
            autoFocus
          />
          <button className="rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 font-bold">↵</button>
        </form>
      )}
      {fb && !reveal && (
        <p className={`mt-3 text-center text-sm font-semibold ${fb.type === 'found' ? 'text-emerald-300' : fb.type === 'close' ? 'text-amber-300' : 'text-zinc-400'}`}>
          {fb.text}
        </p>
      )}
    </div>
  );
}

function RevealPanel<P, X>({ view, players, extra }: { view: RoundGameView<P, X>; players: PlayerPublic[]; extra?: ReactNode }) {
  const reveal = view.reveal!;
  const byId = new Map(players.map((p) => [p.id, p]));
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="panel p-5">
      {extra}
      <ul className="grid gap-2 sm:grid-cols-2">
        {reveal.results.map((r, i) => {
          const p = byId.get(r.playerId);
          if (!p) return null;
          return (
            <motion.li
              key={r.playerId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2"
            >
              <Avatar player={p} size="xs" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{p.nickname}</span>
                <span className="block truncate text-xs text-zinc-500">{r.label ?? 'Pas de réponse'}</span>
              </span>
              <span className={`font-mono text-sm font-bold ${r.points ? 'text-emerald-300' : 'text-zinc-600'}`}>{r.points ? `+${r.points}` : '0'}</span>
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
}

function ProgressPanel<P, X>({ view, players, you }: { view: RoundGameView<P, X>; players: PlayerPublic[]; you: string }) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const isText = view.input?.kind === 'text';
  return (
    <div className="panel p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Joueurs</h3>
      <ul className="space-y-1.5">
        {ranked.map((p) => {
          const st = view.progress[p.id] ?? 'waiting';
          return (
            <motion.li layout key={p.id} className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 ${p.id === you ? 'bg-white/[0.05]' : ''}`}>
              <Avatar player={p} size="xs" />
              <span className="flex-1 truncate text-sm">{p.nickname}</span>
              {view.phase === 'question' && (
                <span className="text-sm" title={st}>
                  {st === 'waiting' ? <span className="text-zinc-600">…</span> : st === 'partial' ? '🟡' : isText ? '✅' : '🗳️'}
                </span>
              )}
              <span className="w-14 text-right font-mono text-sm font-bold text-zinc-300">{p.score}</span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
