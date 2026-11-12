import { QUIZ_QUESTIONS, type QuizQuestion } from '@content/quiz';
import type { QuizExtra, QuizPrompt } from '@shared/types';
import { loadCustomQuestions } from '../../customContent';
import { fuzzyMatch, normalize } from '../../utils/fuzzy';
import { shuffle } from '../../utils/random';
import { speedPoints } from '../GameModule';
import { RoundGame, type RoundSpec } from '../RoundGame';

const CATEGORY_LABELS: Record<QuizQuestion['category'], string> = {
  culture: '🌍 Culture G',
  enigme: '🧩 Énigme',
  piege: '🪤 Question piège',
};

/** Temps minimum pour une énigme (réponse libre au clavier) */
const RIDDLE_MIN_MS = 30_000;

type Settings = { rounds: number; time: string; category: string };

/**
 * Quiz : QCM pour la culture G et les pièges, RÉPONSE LIBRE au clavier pour les énigmes
 * (sinon les 4 propositions donnent la solution). Tolérance aux fautes de frappe.
 */
export class QuizGame extends RoundGame<QuizQuestion, QuizPrompt, QuizExtra, Settings> {
  readonly gameId = 'quiz' as const;
  protected revealMs = 7000;

  protected async prepare() {
    // Questions intégrées + questions ajoutées depuis l'espace admin
    const all: QuizQuestion[] = [...QUIZ_QUESTIONS, ...(await loadCustomQuestions())];
    const pool = this.settings.category === 'mix' ? all : all.filter((q) => q.category === this.settings.category);
    return shuffle(pool).slice(0, this.settings.rounds);
  }

  protected buildRound(q: QuizQuestion): RoundSpec<QuizPrompt, QuizExtra> {
    const prompt = { category: q.category, categoryLabel: CATEGORY_LABELS[q.category], question: q.question };
    const durationMs = Number(this.settings.time) * 1000;
    if (q.category === 'enigme') {
      return {
        prompt,
        input: { kind: 'text', placeholder: 'Ta réponse…', keys: [{ key: 'answer', label: 'Réponse' }] },
        durationMs: Math.max(durationMs, RIDDLE_MIN_MS),
        answer: q.choices[q.answer],
        extra: { explanation: q.explanation },
      };
    }
    const order = shuffle([0, 1, 2, 3]);
    return {
      prompt,
      input: { kind: 'choice', choices: order.map((i) => q.choices[i]), layout: 'grid' },
      durationMs,
      correctIndex: order.indexOf(q.answer),
      answer: q.choices[q.answer],
      extra: { explanation: q.explanation },
    };
  }

  /** Réponses acceptées : la bonne réponse, la liste `accept`, et les mots propres à la bonne réponse */
  private accepted(q: QuizQuestion): string[] {
    const answer = q.choices[q.answer];
    const others = new Set(q.choices.filter((_, i) => i !== q.answer).flatMap((c) => normalize(c).split(' ')));
    const words = normalize(answer).split(' ').filter((w) => w.length >= 4 && !others.has(w));
    return [answer, ...(q.accept ?? []), ...words];
  }

  protected matchText(q: QuizQuestion, guess: string, remaining: string[]) {
    if (!remaining.includes('answer')) return { found: [], close: false };
    const m = fuzzyMatch(guess, this.accepted(q));
    return { found: m === 'exact' ? ['answer'] : [], close: m === 'close' };
  }

  /** Même barème que les QCM (1000 → 500 selon la rapidité) + bonus pour les premiers */
  protected textPoints(_key: string, ms: number, order: number, spec: RoundSpec<QuizPrompt, QuizExtra>): number {
    const bonus = order === 0 ? 150 : order === 1 ? 75 : order === 2 ? 25 : 0;
    return speedPoints(ms, spec.durationMs) + bonus;
  }
}
