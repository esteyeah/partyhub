import { RANK_CLIPS, RANK_LADDERS, type RankClip } from '@content/rank';
import type { RankExtra, RankPrompt } from '@shared/types';
import { shuffle } from '../../utils/random';
import { RoundGame, type ChoiceScore, type RoundSpec } from '../RoundGame';

type Settings = { rounds: number; time: string };

/**
 * Barème : 100 pts pour le rang exact, 50 pts à un rang près, 0 sinon.
 */
export class RankGame extends RoundGame<RankClip, RankPrompt, RankExtra, Settings> {
  readonly gameId = 'rank' as const;

  protected prepare() {
    const valid = RANK_CLIPS.filter((c) => (RANK_LADDERS[c.game].ranks as readonly string[]).includes(c.rank));
    return shuffle(valid).slice(0, this.settings.rounds);
  }

  protected buildRound(c: RankClip): RoundSpec<RankPrompt, RankExtra> {
    const ladder: string[] = [...RANK_LADDERS[c.game].ranks];
    const clipSeconds = Math.max(0, c.clip.end - c.clip.start);
    return {
      prompt: { game: RANK_LADDERS[c.game].name, clip: c.clip, context: c.context },
      input: { kind: 'choice', choices: ladder, layout: 'ladder' },
      durationMs: (clipSeconds + Number(this.settings.time)) * 1000,
      correctIndex: ladder.indexOf(c.rank),
      answer: c.rank,
      extra: { source: c.source },
    };
  }

  protected scoreChoice(_c: RankClip, spec: RoundSpec<RankPrompt, RankExtra>, choice: number): ChoiceScore {
    const distance = Math.abs(choice - (spec.correctIndex ?? -99));
    return { correct: distance === 0, points: distance === 0 ? 100 : distance === 1 ? 50 : 0 };
  }
}
