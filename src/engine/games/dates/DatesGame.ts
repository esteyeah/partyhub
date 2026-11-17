import { DATE_EVENTS, type DateEvent } from '@content/dates';
import type { DatesExtra, DatesPrompt } from '@shared/types';
import { shuffle } from '../../utils/random';
import { RoundGame, type ChoiceScore, type RoundSpec } from '../RoundGame';

type Settings = { rounds: number; time: string; cat: string };

/**
 * Plus tolérant que le blind test des années : ×0,9 par année d'écart
 * (1 an → 900, 5 → 590, 10 → 349, 20 → 122), 0 au-delà de 40 ans.
 * La rapidité module de 100 % à 80 %.
 */
export function datePoints(diff: number, ms: number, durationMs: number): number {
  if (diff > 40) return 0;
  const precision = 1000 * Math.pow(0.9, diff);
  const speed = 1 - 0.2 * Math.min(1, Math.max(0, ms / durationMs));
  return Math.round(precision * speed) + (diff === 0 ? 100 : 0);
}

export class DatesGame extends RoundGame<DateEvent, DatesPrompt, DatesExtra, Settings> {
  readonly gameId = 'dates' as const;
  protected revealMs = 6000;

  protected prepare() {
    const c = this.settings.cat;
    const pool = c === 'mix' ? DATE_EVENTS : DATE_EVENTS.filter((e) => e.cat === c);
    return shuffle(pool).slice(0, this.settings.rounds);
  }

  protected buildRound(e: DateEvent): RoundSpec<DatesPrompt, DatesExtra> {
    return {
      prompt: { text: e.text, catLabel: e.cat === 'histoire' ? '🏛️ Histoire' : '🎭 Culture' },
      input: { kind: 'number', placeholder: 'Année ?', min: 1, max: new Date().getFullYear() },
      durationMs: Number(this.settings.time) * 1000,
      answer: String(e.year),
      extra: { year: e.year },
    };
  }

  protected scoreNumber(e: DateEvent, spec: RoundSpec<DatesPrompt, DatesExtra>, value: number, ms: number): ChoiceScore {
    const diff = Math.abs(value - e.year);
    return { points: datePoints(diff, ms, spec.durationMs), correct: diff === 0 };
  }
}
