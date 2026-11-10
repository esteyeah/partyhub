import type { GameId } from '@shared/types';
import { BlindTestView } from './blindtest/BlindTestView';
import { ElevenView } from './eleven/ElevenView';
import { QuizView } from './quiz/QuizView';
import { RankView } from './rank/RankView';
import type { GameViewComponent } from './types';
import { VideoView } from './video/VideoView';

/**
 * Registre des vues client : gameId -> composant React.
 * ➜ Nouveau jeu = une ligne ici.
 */
export const GAME_VIEWS: Record<GameId, GameViewComponent> = {
  quiz: QuizView,
  blindtest: BlindTestView,
  video: VideoView,
  rank: RankView,
  eleven: ElevenView,
};
