'use client';

import { motion } from 'framer-motion';
import type { ClosestExtra, ClosestPrompt, RoundGameView } from '@shared/types';
import { RoundStage } from '../round/RoundStage';
import type { GameViewProps } from '../types';

export function ClosestView({ view, room, you }: GameViewProps<RoundGameView<ClosestPrompt, ClosestExtra>>) {
  return (
    <RoundStage
      view={view}
      room={room}
      you={you}
      introLabel="Question"
      renderPrompt={(p) => (
        <div className="py-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-orange-300/80">🎯 Au plus proche</div>
          <motion.h2 key={p.question} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-2xl font-black sm:text-3xl">
            {p.question}
          </motion.h2>
        </div>
      )}
      renderReveal={(v) => (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 rounded-2xl bg-gradient-to-r from-orange-500/15 to-red-500/10 p-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-orange-300/80">La réponse</div>
          <div className="font-mono text-4xl font-black">{v.reveal!.answer}</div>
        </motion.div>
      )}
    />
  );
}
