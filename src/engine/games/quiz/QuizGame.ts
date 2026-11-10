import { QUIZ_QUESTIONS, type QuizQuestion } from '@content/quiz';
import type { QuizExtra, QuizPrompt } from '@shared/types';
import { loadCustomQuestions } from '../../customQuestions';
import { shuffle } from '../../utils/random';
import { RoundGame, type RoundSpec } from '../RoundGame';

const CATEGORY_LABELS: Record<QuizQuestion['category'], string> = {
  culture: '🌍 Culture G',
  enigme: '🧩 Énigme',
  piege: '🪤 Question piège',
};

type Settings = { rounds: number; time: string; category: string };

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
    const order = shuffle([0, 1, 2, 3]);
    const choices = order.map((i) => q.choices[i]);
    return {
      prompt: { category: q.category, categoryLabel: CATEGORY_LABELS[q.category], question: q.question },
      input: { kind: 'choice', choices, layout: 'grid' },
      durationMs: Number(this.settings.time) * 1000,
      correctIndex: order.indexOf(q.answer),
      answer: q.choices[q.answer],
      extra: { explanation: q.explanation },
    };
  }
}
