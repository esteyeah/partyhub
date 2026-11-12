'use client';

import type { RankExtra, RankPrompt, RoundGameView } from '@shared/types';
import { ClipPlayer } from '@/components/media/ClipPlayer';
import { sendAction } from '@/lib/net';
import { RoundStage } from '../round/RoundStage';
import type { GameViewProps } from '../types';

export function RankView({ view, room, you }: GameViewProps<RoundGameView<RankPrompt, RankExtra>>) {
  return (
    <RoundStage
      view={view}
      room={room}
      you={you}
      introLabel="Clip"
      renderPrompt={(p, v) => {
        const isHost = room.hostId === you;
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-sm font-bold text-cyan-200">🎮 {p.game}</span>
              {p.context && <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-zinc-300">{p.context}</span>}
              {v.judged && <span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm text-amber-200">🧑‍⚖️ Arbitré par l’hôte</span>}
            </div>
            <ClipPlayer clip={p.clip} endedLabel="🤔 Alors, quel rang ?" paused={!!v.judged && v.frozen} />
            {v.judged && v.phase === 'question' && !v.frozen && (
              isHost ? (
                <button
                  onClick={() => sendAction({ type: 'freeze' })}
                  className="w-full rounded-2xl bg-amber-500 py-3 text-lg font-black text-black shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 active:scale-[0.98]"
                >
                  ⏸ STOP — avant que le rang s’affiche !
                </button>
              ) : (
                <p className="text-center text-sm text-zinc-400">Regarde bien… l’hôte va stopper la vidéo avant la révélation. Tu peux déjà voter.</p>
              )
            )}
          </div>
        );
      }}
      renderReveal={(v) => (
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-cyan-500/10 p-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-cyan-300/80">Rang réel</div>
            <div className="text-2xl font-black">{v.reveal!.answer}</div>
            {v.reveal!.extra?.source && <div className="text-xs text-zinc-500">Source : {v.reveal!.extra.source}</div>}
          </div>
          <div className="text-right text-xs text-zinc-400">
            Rang exact : <b className="text-emerald-300">100 pts</b>
            <br />À un rang près : <b className="text-amber-300">50 pts</b>
          </div>
        </div>
      )}
    />
  );
}
