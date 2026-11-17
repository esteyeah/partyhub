'use client';

import type { MixExtra, MixPrompt, RoundGameView } from '@shared/types';
import { GAME_CATALOG } from '@shared/catalog';
import { GAME_VIEWS } from '../registry';
import { RoundStage } from '../round/RoundStage';
import type { GameViewProps } from '../types';

/** Méli-mélo : chaque manche est affichée par la vue de son jeu d'origine. */
export function MixView({ view, room, you }: GameViewProps<RoundGameView<MixPrompt, MixExtra>>) {
  const p = view.prompt;
  if (!p || view.message) {
    return <RoundStage view={view} room={room} you={you} introLabel="Question" renderPrompt={() => null} />;
  }
  const meta = GAME_CATALOG[p.game];
  const Inner = GAME_VIEWS[p.game];
  const innerView = {
    ...view,
    gameId: p.game,
    prompt: p.inner,
    reveal: view.reveal ? { ...view.reveal, extra: view.reveal.extra?.inner ?? null } : null,
  } as RoundGameView;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 text-sm font-bold text-zinc-300">
        <span className="text-lg">{meta.emoji}</span> {meta.name}
      </div>
      <Inner view={innerView} room={room} you={you} />
    </div>
  );
}
