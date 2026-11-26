import { CLOSEST_QUESTIONS, type ClosestQuestion } from '@content/closest';
import type { ClosestExtra, ClosestPrompt } from '@shared/types';
import { shuffle } from '../../utils/random';
import { RoundGame, type ChoiceScore, type RoundSpec } from '../RoundGame';

type Settings = { rounds: number; time: string };

/**
 * Précision avant tout :
 *  - années : ×0,85 par année d'écart (1 an → 850, 5 → 444, 10 → 197), 0 au-delà de 25 ans ;
 *  - autres : selon l'écart relatif (5 % → 860, 10 % → 740, 25 % → 470, 50 % → 220, 100 % → 50).
 * Réponse exacte (à 0,5 % près) : +100. La rapidité module de 100 % à 85 %.
 */
export function closestPoints(q: ClosestQuestion, value: number, ms: number, durationMs: number): { points: number; exact: boolean } {
  let precision: number;
  let exact: boolean;
  if (q.years) {
    const diff = Math.abs(Math.round(value) - q.answer);
    exact = diff === 0;
    precision = diff > 25 ? 0 : 1000 * Math.pow(0.85, diff);
  } else {
    const rel = Math.abs(value - q.answer) / Math.max(Math.abs(q.answer), 1e-9);
    exact = rel <= 0.005;
    precision = rel >= 1.5 ? 0 : 1000 * Math.exp(-3 * rel);
  }
  const speed = 1 - 0.15 * Math.min(1, Math.max(0, ms / durationMs));
  return { points: Math.round(precision * speed) + (exact ? 100 : 0), exact };
}

export class ClosestGame extends RoundGame<ClosestQuestion, ClosestPrompt, ClosestExtra, Settings> {
  readonly gameId = 'closest' as const;
  protected revealMs = 7000;

  protected prepare() {
    return this.fresh(CLOSEST_QUESTIONS).slice(0, this.settings.rounds);
  }

  protected buildRound(q: ClosestQuestion): RoundSpec<ClosestPrompt, ClosestExtra> {
    return {
      prompt: { question: q.q, unit: q.unit ?? (q.years ? '' : '') },
      input: { kind: 'number', placeholder: q.unit ? `Ta réponse (${q.unit})` : 'Ta réponse', min: 0, max: 1e12, decimals: !!q.decimals },
      durationMs: Number(this.settings.time) * 1000,
      answer: format(q.answer) + (q.unit ? ` ${q.unit}` : ''),
      extra: { answer: q.answer, unit: q.unit },
    };
  }

  protected scoreNumber(q: ClosestQuestion, spec: RoundSpec<ClosestPrompt, ClosestExtra>, value: number, ms: number): ChoiceScore {
    const r = closestPoints(q, value, ms, spec.durationMs);
    return { points: r.points, correct: r.exact };
  }
}

export function format(v: number): string {
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
}
