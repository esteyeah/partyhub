'use client';

import { motion } from 'framer-motion';
import type { RoundGameView, VideoExtra, VideoPrompt } from '@shared/types';
import { ClipPlayer } from '@/components/media/ClipPlayer';
import { RoundStage } from '../round/RoundStage';
import type { GameViewProps } from '../types';

export function VideoView({ view, room, you }: GameViewProps<RoundGameView<VideoPrompt, VideoExtra>>) {
  return (
    <RoundStage
      view={view}
      room={room}
      you={you}
      introLabel="Manche"
      renderPrompt={(p, v) => {
        if (p.quote) {
          const full = v.phase === 'reveal' ? v.reveal?.extra?.fullQuote : undefined;
          return (
            <div className="py-6 text-center sm:py-10">
              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm font-semibold text-amber-200">💬 {p.question}</span>
              <motion.blockquote
                key={full ?? p.quote.text}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto mt-6 max-w-3xl text-2xl font-extrabold leading-snug sm:text-4xl"
              >
                {full ?? p.quote.text}
              </motion.blockquote>
              <p className="mt-4 text-sm text-zinc-400">— {p.quote.source}</p>
            </div>
          );
        }
        if (!p.clip) return null;
        // Au reveal, on enchaîne sur la vraie suite si elle est fournie
        const revealClip = v.phase === 'reveal' ? v.reveal?.extra?.revealClip : undefined;
        return (
          <div className="space-y-4">
            <div className={p.clip.type === 'file' ? 'mx-auto max-w-sm' : ''}>
              <ClipPlayer clip={revealClip ?? p.clip} endedLabel={revealClip ? '🎬 Fin de l’action' : undefined} portrait={p.clip.type === 'file'} />
            </div>
            <h2 className="text-center text-xl font-extrabold sm:text-2xl">{p.question}</h2>
          </div>
        );
      }}
      renderReveal={(v) => (
        <div className="mb-4 rounded-2xl bg-emerald-500/10 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">{v.prompt?.quote && v.prompt.question === 'Complète la réplique' ? 'La réplique' : 'La suite'}</div>
          <div className="text-lg font-bold">{v.reveal!.answer}</div>
          {v.reveal!.extra?.explanation && <div className="mt-1 text-sm text-zinc-300">{v.reveal!.extra.explanation}</div>}
        </div>
      )}
    />
  );
}
