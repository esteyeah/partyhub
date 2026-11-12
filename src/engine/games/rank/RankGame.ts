import { RANK_CLIPS, RANK_LADDERS, type RankClip } from '@content/rank';
import type { RankExtra, RankPrompt } from '@shared/types';
import { loadCustomRankClips } from '../../customContent';
import { shuffle } from '../../utils/random';
import { RoundGame, type ChoiceScore, type RoundSpec } from '../RoundGame';

type Settings = { rounds: number; time: string; game: string };

/** Durée max d'une vidéo en mode arbitre (l'hôte la stoppe avant la révélation) */
const JUDGED_MAX_MS = 180_000;

/**
 * Barème : 100 pts pour le rang exact, 50 pts à un rang près, 0 sinon.
 * Deux sortes de clips :
 *  - rang connu (rank) : la vidéo s'arrête toute seule à `clip.end` ;
 *  - mode arbitre (judged) : la vidéo révèle elle-même le rang ; l'hôte la stoppe avant,
 *    puis valide le vrai rang après la révélation.
 */
export class RankGame extends RoundGame<RankClip, RankPrompt, RankExtra, Settings> {
  readonly gameId = 'rank' as const;

  protected async prepare() {
    const all = [...RANK_CLIPS, ...(await loadCustomRankClips())];
    const valid = all.filter(
      (c) =>
        (this.settings.game === 'all' ||
          c.game === this.settings.game ||
          (this.settings.game === 'cs2' && (c.game === 'premier' || c.game === 'faceit')) ||
          (this.settings.game === 'cs2-pistol' && (c.game === 'cs2' || c.game === 'premier' || c.game === 'faceit') && c.pistol)) &&
        (c.judged || (c.rank !== undefined && (RANK_LADDERS[c.game].ranks as readonly string[]).includes(c.rank))),
    );
    // Les clips à rang connu d'abord (plus rapides à jouer), puis les clips arbitrés
    const known = shuffle(valid.filter((c) => !c.judged));
    const judged = shuffle(valid.filter((c) => c.judged));
    return shuffle([...known, ...judged].slice(0, this.settings.rounds));
  }

  protected buildRound(c: RankClip): RoundSpec<RankPrompt, RankExtra> {
    const ladder: string[] = [...RANK_LADDERS[c.game].ranks];
    const clipSeconds = Math.max(0, c.clip.end - c.clip.start);
    return {
      prompt: { game: RANK_LADDERS[c.game].name, clip: c.clip, context: c.context },
      input: { kind: 'choice', choices: ladder, layout: 'ladder' },
      durationMs: c.judged ? JUDGED_MAX_MS : (clipSeconds + Number(this.settings.time)) * 1000,
      correctIndex: c.judged || !c.rank ? undefined : ladder.indexOf(c.rank),
      answer: c.rank ?? '',
      extra: { source: c.source },
      judged: !!c.judged,
    };
  }

  protected scoreChoice(_c: RankClip, spec: RoundSpec<RankPrompt, RankExtra>, choice: number): ChoiceScore {
    const distance = Math.abs(choice - (spec.correctIndex ?? -99));
    return { correct: distance === 0, points: distance === 0 ? 100 : distance === 1 ? 50 : 0 };
  }
}
