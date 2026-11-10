import { RANK_CLIPS } from '../../content/rank';
import { VIDEO_QUESTIONS } from '../../content/video';
import type { GameAvailability, GameId, GameSettings } from '../../shared/types';
import { BlindTestGame } from './blindtest/BlindTestGame';
import { ElevenGame } from './eleven/ElevenGame';
import type { GameContext, GameModule } from './GameModule';
import { QuizGame } from './quiz/QuizGame';
import { RankGame } from './rank/RankGame';
import { VideoGame } from './video/VideoGame';

/**
 * Registre des mini-jeux côté serveur.
 * ➜ Nouveau jeu = une entrée ici (+ catalogue partagé + vue client).
 */
interface GameDefinition {
  create(ctx: GameContext, settings: GameSettings): GameModule;
  availability(): GameAvailability;
}

const always = (): GameAvailability => ({ available: true });

export const GAME_REGISTRY: Record<GameId, GameDefinition> = {
  quiz: { create: (ctx, s) => new QuizGame(ctx, s as never), availability: always },
  blindtest: { create: (ctx, s) => new BlindTestGame(ctx, s as never), availability: always },
  video: {
    create: (ctx, s) => new VideoGame(ctx, s as never),
    availability: () =>
      VIDEO_QUESTIONS.length ? { available: true } : { available: false, reason: 'Ajoute tes extraits dans content/video.ts' },
  },
  rank: {
    create: (ctx, s) => new RankGame(ctx, s as never),
    availability: () =>
      RANK_CLIPS.length ? { available: true } : { available: false, reason: 'Ajoute tes clips dans content/rank.ts' },
  },
  eleven: { create: (ctx, s) => new ElevenGame(ctx, s as never), availability: always },
};

export function availabilityMap(): Record<GameId, GameAvailability> {
  return Object.fromEntries(
    (Object.keys(GAME_REGISTRY) as GameId[]).map((id) => [id, GAME_REGISTRY[id].availability()]),
  ) as Record<GameId, GameAvailability>;
}
