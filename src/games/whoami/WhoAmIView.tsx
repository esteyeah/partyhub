'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { RoundGameView, WhoExtra, WhoPrompt } from '@shared/types';
import { useRemaining } from '@/lib/hooks';
import { RoundStage } from '../round/RoundStage';
import type { GameViewProps } from '../types';

function Clues({ prompt, view }: { prompt: WhoPrompt; view: RoundGameView<WhoPrompt, WhoExtra> }) {
  const remaining = useRemaining(view.phase === 'question' ? view.endsAt : null);
  const all = view.phase === 'reveal' || view.me.found.includes('answer');
  const elapsed = view.phase === 'question' ? Math.max(0, view.durationMs - remaining) : 0;
  const shown = all ? prompt.clues.length : Math.min(prompt.clues.length, Math.floor(elapsed / prompt.clueMs) + 1);
  const nextIn = shown < prompt.clues.length ? Math.ceil((prompt.clueMs - (elapsed % prompt.clueMs)) / 1000) : null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
        <span className="text-amber-300/80">{prompt.categoryLabel}</span>
        <span className="text-zinc-500">
          Indice {shown}/{prompt.clues.length}
          {!all && nextIn !== null && view.phase === 'question' ? ` · suivant dans ${nextIn} s` : ''}
        </span>
      </div>
      <ol className="space-y-2">
        <AnimatePresence initial={false}>
          {prompt.clues.slice(0, shown).map((c, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex gap-3 rounded-xl px-4 py-3 text-base sm:text-lg ${i === shown - 1 && !all ? 'bg-amber-500/15 ring-1 ring-amber-400/40' : 'bg-white/[0.04]'}`}
            >
              <span className="font-mono font-black text-amber-300">{i + 1}</span>
              <span>{c}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  );
}

export function WhoAmIView({ view, room, you }: GameViewProps<RoundGameView<WhoPrompt, WhoExtra>>) {
  return (
    <RoundStage
      view={view}
      room={room}
      you={you}
      introLabel="Qui suis-je"
      renderPrompt={(p, v) => <Clues prompt={p} view={v} />}
      renderReveal={(v) => (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 p-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">C’était…</div>
          <div className="text-2xl font-black">{v.reveal!.answer}</div>
        </motion.div>
      )}
    />
  );
}
