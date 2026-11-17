'use client';

import { motion } from 'framer-motion';
import type { DatesExtra, DatesPrompt, RoundGameView } from '@shared/types';
import { RoundStage } from '../round/RoundStage';
import type { GameViewProps } from '../types';

export function DatesView({ view, room, you }: GameViewProps<RoundGameView<DatesPrompt, DatesExtra>>) {
  return (
    <RoundStage
      view={view}
      room={room}
      you={you}
      introLabel="Date"
      renderPrompt={(p, v) => (
        <div className="py-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-sky-300/80">{p.catLabel}</div>
          <motion.h2 key={p.text} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-2xl font-black sm:text-3xl">
            {p.text}
          </motion.h2>
          {v.phase === 'question' && <p className="mt-4 text-sm text-zinc-400">En quelle année ?</p>}
        </div>
      )}
      renderReveal={(v) => (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 rounded-2xl bg-gradient-to-r from-sky-500/15 to-blue-500/10 p-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-sky-300/80">C’était en…</div>
          <div className="font-mono text-4xl font-black">{v.reveal!.answer}</div>
        </motion.div>
      )}
    />
  );
}
