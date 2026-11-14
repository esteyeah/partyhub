'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import type { PixelExtra, PixelPrompt, RoundGameView } from '@shared/types';
import { useRemaining } from '@/lib/hooks';
import { RoundStage } from '../round/RoundStage';
import type { GameViewProps } from '../types';

/** Point de zoom « aléatoire » mais identique pour tous les joueurs (dérivé de l'URL) */
function focus(src: string, category: PixelPrompt['category']): string {
  let h = 0;
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) >>> 0;
  const x = 35 + (h % 31); // 35 → 65 %
  const y = category === 'celeb' ? 25 + ((h >> 5) % 21) : 30 + ((h >> 5) % 41); // visages plutôt en haut
  return `${x}% ${y}%`;
}

function BlurredImage({ prompt, view }: { prompt: PixelPrompt; view: RoundGameView<PixelPrompt, PixelExtra> }) {
  const remaining = useRemaining(view.phase === 'question' ? view.endsAt : null);
  const [failed, setFailed] = useState(false);
  const clear = view.phase === 'reveal' || view.me.found.includes('answer');
  // 0 → 1 au fil du chrono. Le zoom recule un peu plus vite (fini à 85 % du temps),
  // le flou dure un peu plus longtemps (net à 95 %, et décroît plus lentement)
  const t = view.phase === 'question' && view.durationMs ? 1 - remaining / view.durationMs : 0;
  const qZoom = clear ? 1 : Math.min(1, t / 0.85);
  const qBlur = clear ? 1 : Math.min(1, t / 0.95);
  const blur = 26 * Math.pow(1 - qBlur, 1.35);
  const scale = 1 + 3.2 * Math.pow(1 - qZoom, 1.3);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-2xl bg-black">
      {failed ? (
        <div className="flex h-full items-center justify-center text-zinc-500">Image indisponible 😕</div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={prompt.image}
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
          onContextMenu={(e) => e.preventDefault()}
          className="pointer-events-none h-full w-full select-none object-contain"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: focus(prompt.image, prompt.category),
            filter: `blur(${blur}px)`,
            transition: clear ? 'transform 0.8s ease-out, filter 0.8s ease-out' : 'transform 0.15s linear, filter 0.15s linear',
          }}
        />
      )}
      {view.phase === 'question' && view.me.found.includes('answer') && (
        <div className="absolute inset-x-0 bottom-0 bg-emerald-500/80 py-1.5 text-center text-sm font-bold">Trouvé ! 🎉</div>
      )}
    </div>
  );
}

export function PixelView({ view, room, you }: GameViewProps<RoundGameView<PixelPrompt, PixelExtra>>) {
  return (
    <RoundStage
      view={view}
      room={room}
      you={you}
      introLabel="Image"
      renderPrompt={(p, v) => (
        <div className="space-y-3">
          <div className="text-center text-xs font-semibold uppercase tracking-wider text-teal-300/80">{p.categoryLabel}</div>
          <BlurredImage key={p.image} prompt={p} view={v} />
          {v.phase === 'question' && (
            <p className="text-center text-sm text-zinc-400">
              {v.input?.kind === 'text' ? 'Tape ta réponse dès que tu reconnais — les petites fautes sont tolérées 😉' : 'Qui ou qu’est-ce que c’est ?'}
            </p>
          )}
        </div>
      )}
      renderReveal={(v) => (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 rounded-2xl bg-gradient-to-r from-teal-500/15 to-emerald-500/10 p-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-300/80">C’était…</div>
          <div className="text-2xl font-black">{v.reveal!.answer}</div>
        </motion.div>
      )}
    />
  );
}
