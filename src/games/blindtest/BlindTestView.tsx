'use client';

import { motion } from 'framer-motion';
import type { BlindExtra, BlindPrompt, RoundGameView } from '@shared/types';
import { AudioPlayer } from '@/components/media/AudioPlayer';
import { RoundStage } from '../round/RoundStage';
import type { GameViewProps } from '../types';

export function BlindTestView({ view, room, you }: GameViewProps<RoundGameView<BlindPrompt, BlindExtra>>) {
  return (
    <RoundStage
      view={view}
      room={room}
      you={you}
      introLabel="Extrait"
      renderPrompt={(p, v) => (
        <div className="py-2">
          <AudioPlayer src={p.audioUrl} />
          {v.phase === 'question' && (
            <p className="mt-4 text-center text-sm text-zinc-400">
              {v.input?.kind === 'text' ? 'Tape l’artiste et/ou le titre — les petites fautes sont tolérées 😉' : 'Quel est ce morceau ?'}
            </p>
          )}
        </div>
      )}
      renderReveal={(v) => {
        const x = v.reveal!.extra;
        if (!x) return null;
        return (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-fuchsia-500/15 to-violet-500/10 p-4">
            {x.artwork ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={x.artwork} alt="" className="h-20 w-20 rounded-xl object-cover shadow-lg" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white/5 text-4xl">🎵</div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-fuchsia-300/80">C’était…</div>
              <div className="truncate text-xl font-black">{x.title}</div>
              <div className="truncate text-zinc-300">{x.artist}</div>
            </div>
          </motion.div>
        );
      }}
    />
  );
}
