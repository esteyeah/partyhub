'use client';

import { motion } from 'framer-motion';
import type { MovieTitleExtra, MovieTitlePrompt, RoundGameView } from '@shared/types';
import { RoundStage } from '../round/RoundStage';
import type { GameViewProps } from '../types';

export function MovieTitleView({ view, room, you }: GameViewProps<RoundGameView<MovieTitlePrompt, MovieTitleExtra>>) {
  return (
    <RoundStage
      view={view}
      room={room}
      you={you}
      introLabel="Film"
      renderPrompt={(p, v) => (
        <div className="py-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-300/80">
            {p.flag} {p.langLabel}
          </div>
          <motion.h2 key={p.foreign} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-3xl font-black sm:text-4xl">
            « {p.foreign} »
          </motion.h2>
          {v.phase === 'question' && (
            <p className="mt-4 text-sm text-zinc-400">
              {v.input?.kind === 'text' ? 'Quel est le titre de ce film en France ? (fautes tolérées)' : 'Quel est le titre de ce film en France ?'}
            </p>
          )}
        </div>
      )}
      renderReveal={(v) => (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 rounded-2xl bg-gradient-to-r from-rose-500/15 to-red-500/10 p-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-300/80">C’était…</div>
          <div className="text-2xl font-black">
            {v.reveal!.answer} {v.reveal!.extra && <span className="text-base font-semibold text-zinc-400">({v.reveal!.extra.year})</span>}
          </div>
        </motion.div>
      )}
    />
  );
}
