import { YEAR_TRACKS, type YearTrack } from '@content/yeartracks';
import type { BlindYearExtra, BlindYearPrompt } from '@shared/types';
import { shuffle } from '../../utils/random';
import { resolvePreview } from '../blindtest/itunes';
import { RoundGame, type ChoiceScore, type RoundSpec } from '../RoundGame';

type Settings = { rounds: number; time: string; scope: string };
type Item = YearTrack & { audioUrl: string; artwork?: string };

const MIN_YEAR = 1700;
const MAX_YEAR = new Date().getFullYear();

/**
 * Précision d'abord : 1000 pts pour l'année exacte, puis ×0,8 par année d'écart
 * (1 an → 800, 2 → 640, 3 → 512, 5 → 328, 10 → 107, 15 ans ou plus → 0).
 * La rapidité module ensuite le score de 100 % (réponse immédiate) à 75 % (dernière seconde).
 */
export function yearPoints(diff: number, ms: number, durationMs: number): number {
  if (diff >= 15) return 0;
  const precision = 1000 * Math.pow(0.8, diff);
  const speed = 1 - 0.25 * Math.min(1, Math.max(0, ms / durationMs));
  return Math.round(precision * speed) + (diff === 0 ? 100 : 0);
}

export class BlindYearGame extends RoundGame<Item, BlindYearPrompt, BlindYearExtra, Settings> {
  readonly gameId = 'blindyear' as const;
  protected introMs = 3500;
  protected revealMs = 8000;

  protected async prepare(): Promise<Item[]> {
    const scope = this.settings.scope;
    const pool = YEAR_TRACKS.filter((t) =>
      scope === 'fr' ? t.fr : scope === 'inter' ? !t.fr : scope === 'old' ? t.year < 2000 : scope === 'new' ? t.year >= 2000 : true,
    );
    const picked = this.fresh(pool).slice(0, this.settings.rounds + 4);
    const resolved = await Promise.all(
      picked.map(async (t): Promise<Item | null> => {
        const r = await resolvePreview(t.artist, t.title);
        return r ? { ...t, audioUrl: r.previewUrl, artwork: r.artwork } : null;
      }),
    );
    return resolved.filter((t): t is Item => !!t).slice(0, this.settings.rounds);
  }

  protected buildRound(t: Item): RoundSpec<BlindYearPrompt, BlindYearExtra> {
    return {
      prompt: { audioUrl: t.audioUrl },
      input: { kind: 'number', placeholder: 'Année ?', min: MIN_YEAR, max: MAX_YEAR },
      durationMs: Number(this.settings.time) * 1000,
      answer: String(t.year),
      extra: { title: t.title, artist: t.artist, year: t.year, artwork: t.artwork },
    };
  }

  protected scoreNumber(t: Item, spec: RoundSpec<BlindYearPrompt, BlindYearExtra>, value: number, ms: number): ChoiceScore {
    const diff = Math.abs(value - t.year);
    return { points: yearPoints(diff, ms, spec.durationMs), correct: diff === 0 };
  }
}
