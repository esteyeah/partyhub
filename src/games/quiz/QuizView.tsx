'use client';

import { motion } from 'framer-motion';
import type { QuizExtra, QuizPrompt, RoundGameView } from '@shared/types';
import { RoundStage } from '../round/RoundStage';
import type { GameViewProps } from '../types';

export function QuizView({ view, room, you }: GameViewProps<RoundGameView<QuizPrompt, QuizExtra>>) {
  return (
    <RoundStage
      view={view}
      room={room}
      you={you}
      introLabel="Question"
      renderPrompt={(p) => (
        <div className="py-4 text-center sm:py-8">
          <span className="rounded-full bg-white/5 px-3 py-1 text-sm font-semibold text-zinc-300">{p.categoryLabel}</span>
          <motion.h2 key={p.question} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-5 max-w-3xl text-2xl font-extrabold leading-snug sm:text-4xl">
            {p.question}
          </motion.h2>
        </div>
      )}
      renderReveal={(v) => {
        const r = v.reveal!;
        const total = r.stats?.reduce((a, b) => a + b, 0) ?? 0;
        const right = r.correctIndex !== null ? r.stats?.[r.correctIndex] ?? 0 : 0;
        return (
          <div className="mb-4 flex flex-col gap-2 rounded-2xl bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">Bonne réponse</div>
              <div className="text-lg font-bold">{r.answer}</div>
              {r.extra?.explanation && <div className="mt-1 text-sm text-zinc-300">💡 {r.extra.explanation}</div>}
            </div>
            <div className="shrink-0 text-right">
              <div className="font-mono text-3xl font-black text-emerald-300">{total ? Math.round((right / total) * 100) : 0}%</div>
              <div className="text-xs text-zinc-400">du salon a trouvé</div>
            </div>
          </div>
        );
      }}
    />
  );
}
