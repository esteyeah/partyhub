import { RANK_CLIPS } from '@content/rank';
import { defaultSettings } from '@shared/catalog';
import type { GameId, GameSettings, MixExtra, MixPrompt } from '@shared/types';
import { customCounts } from '../../customContent';
import { shuffle } from '../../utils/random';
import { BlindTestGame } from '../blindtest/BlindTestGame';
import { BlindYearGame } from '../blindyear/BlindYearGame';
import { DatesGame } from '../dates/DatesGame';
import type { GameContext } from '../GameModule';
import { MovieTitleGame } from '../movietitle/MovieTitleGame';
import { PixelGame } from '../pixel/PixelGame';
import { QuizGame } from '../quiz/QuizGame';
import { RankGame } from '../rank/RankGame';
import { RoundGame, type ChoiceScore, type RoundSpec } from '../RoundGame';
import { VideoGame } from '../video/VideoGame';
import { WhoAmIGame } from '../whoami/WhoAmIGame';

type Settings = { rounds: number; mode: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRoundGame = RoundGame<any, any, any, any>;
type Ctor = new (ctx: GameContext, settings: never) => AnyRoundGame;

const SUB_GAMES: Partial<Record<GameId, Ctor>> = {
  quiz: QuizGame as unknown as Ctor,
  blindtest: BlindTestGame as unknown as Ctor,
  video: VideoGame as unknown as Ctor,
  pixel: PixelGame as unknown as Ctor,
  whoami: WhoAmIGame as unknown as Ctor,
  movietitle: MovieTitleGame as unknown as Ctor,
  blindyear: BlindYearGame as unknown as Ctor,
  dates: DatesGame as unknown as Ctor,
  rank: RankGame as unknown as Ctor,
};

interface MixItem {
  game: GameId;
  sub: AnyRoundGame;
  item: unknown;
  /** Manche telle que construite par le jeu d'origine */
  inner?: RoundSpec<unknown, unknown>;
}

/* Accès aux méthodes protégées des jeux d'origine */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (g: AnyRoundGame) => g as any;

/**
 * Méli-mélo : N manches piochées au hasard dans tous les jeux à manches
 * (quiz, blind tests, vidéos, images, Qui suis-je, films, dates…), dans un ordre aléatoire.
 * Chaque manche est construite et notée par son jeu d'origine.
 */
export class MixGame extends RoundGame<MixItem, MixPrompt, MixExtra, Settings> {
  readonly gameId = 'mix' as const;
  protected revealMs = 6000;

  protected async prepare(): Promise<MixItem[]> {
    const games = (Object.keys(SUB_GAMES) as GameId[]).filter((g) => g !== 'rank' || RANK_CLIPS.length + customCounts().rank > 0);
    // Tirage du jeu de chaque manche, en évitant de trop répéter le même
    const plan: GameId[] = [];
    while (plan.length < this.settings.rounds) plan.push(...shuffle(games));
    plan.length = this.settings.rounds;
    const counts = new Map<GameId, number>();
    for (const g of plan) counts.set(g, (counts.get(g) ?? 0) + 1);

    const pools = new Map<GameId, MixItem[]>();
    await Promise.all(
      [...counts].map(async ([game, n]) => {
        const settings: GameSettings = { ...defaultSettings(game), rounds: n + 2 };
        if ('mode' in settings) {
          const m = this.settings.mode === 'mixte' ? (Math.random() < 0.5 ? 'qcm' : 'libre') : this.settings.mode;
          settings.mode = m;
        }
        const sub = new SUB_GAMES[game]!(this.ctx, settings as never);
        try {
          const items: unknown[] = await call(sub).prepare();
          pools.set(game, items.map((item) => ({ game, sub, item })));
        } catch {
          pools.set(game, []);
        }
      }),
    );
    const out: MixItem[] = [];
    for (const g of plan) {
      const next = pools.get(g)?.shift();
      if (next) out.push(next);
    }
    return out;
  }

  protected buildRound(m: MixItem): RoundSpec<MixPrompt, MixExtra> {
    const inner: RoundSpec<unknown, unknown> = call(m.sub).buildRound(m.item, 0);
    m.inner = inner;
    return {
      ...inner,
      prompt: { game: m.game, inner: inner.prompt },
      extra: { inner: inner.extra ?? null },
      revealMs: inner.revealMs ?? call(m.sub).revealMs,
    };
  }

  protected scoreChoice(m: MixItem, spec: RoundSpec<MixPrompt, MixExtra>, choice: number, ms: number): ChoiceScore {
    return call(m.sub).scoreChoice(m.item, { ...m.inner!, correctIndex: spec.correctIndex }, choice, ms);
  }

  protected scoreNumber(m: MixItem, _spec: RoundSpec<MixPrompt, MixExtra>, value: number, ms: number): ChoiceScore {
    return call(m.sub).scoreNumber(m.item, m.inner!, value, ms);
  }

  protected matchText(m: MixItem, guess: string, remaining: string[]) {
    return call(m.sub).matchText(m.item, guess, remaining);
  }

  protected textPoints(key: string, ms: number, order: number): number {
    const m = this.items[this.index];
    return call(m.sub).textPoints(key, ms, order, m.inner!);
  }
}
