'use client';

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
      introLabel="Extrait"
      renderPrompt={(p, v) => {
        const revealClip = v.phase === 'reveal' ? v.reveal?.extra?.revealClip : undefined;
        return (
          <div className="space-y-4">
            {/* Au reveal, on enchaîne sur la vraie suite si elle est fournie */}
            <ClipPlayer clip={revealClip ?? p.clip} endedLabel={revealClip ? '🎬 Fin de l’extrait' : undefined} />
            <h2 className="text-center text-xl font-extrabold sm:text-2xl">{p.question}</h2>
          </div>
        );
      }}
      renderReveal={(v) => (
        <div className="mb-4 rounded-2xl bg-emerald-500/10 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">La suite</div>
          <div className="text-lg font-bold">{v.reveal!.answer}</div>
          {v.reveal!.extra?.explanation && <div className="mt-1 text-sm text-zinc-300">{v.reveal!.extra.explanation}</div>}
        </div>
      )}
    />
  );
}
