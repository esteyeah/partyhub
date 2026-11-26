'use client';

import { motion } from 'framer-motion';
import type { OrderExtra, OrderPrompt, RoundGameView } from '@shared/types';
import { RoundStage } from '../round/RoundStage';
import type { GameViewProps } from '../types';

export function OrderView({ view, room, you }: GameViewProps<RoundGameView<OrderPrompt, OrderExtra>>) {
  return (
    <RoundStage
      view={view}
      room={room}
      you={you}
      introLabel="Thème"
      renderPrompt={(p) => (
        <div className="py-3 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-lime-300/80">🔢 Classe 7</div>
          <motion.h2 key={p.question} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-xl font-black sm:text-2xl">
            {p.question}
          </motion.h2>
        </div>
      )}
      renderReveal={(v) => {
        const x = v.reveal!.extra;
        const items = v.input?.kind === 'order' ? v.input.items : [];
        if (!x) return null;
        const mine = v.me.order;
        return (
          <div className="mb-4 space-y-1.5">
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-lime-300/80">Le bon ordre</div>
            {x.correct.map((item, rank) => {
              const myRank = mine ? mine.indexOf(item) : -1;
              const gap = myRank < 0 ? null : Math.abs(myRank - rank);
              return (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: rank * 0.12 }}
                  className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2"
                >
                  <span className="w-6 text-center font-mono text-lg font-black text-lime-300">{rank + 1}</span>
                  <span className="flex-1">
                    <span className="font-semibold">{items[item]}</span>
                    {x.shows[item] && <span className="ml-2 text-xs text-zinc-400">{x.shows[item]}</span>}
                  </span>
                  {gap !== null && (
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${gap === 0 ? 'bg-emerald-500/20 text-emerald-300' : gap === 1 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      {gap === 0 ? '✓' : `toi : ${myRank + 1}e (−${gap})`}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        );
      }}
    />
  );
}
