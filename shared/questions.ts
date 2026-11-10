import type { QuizQuestion } from '../content/quiz';

/**
 * Questions ajoutées depuis l'espace /admin.
 * Elles sont enregistrées dans public/questions.json (dans le dépôt GitHub)
 * ou, sans clé GitHub, dans le navigateur de l'admin.
 */
export interface CustomQuestion extends QuizQuestion {
  id: string;
  createdAt: number;
  author?: string;
}

export const QUESTION_CATEGORIES = ['culture', 'enigme', 'piege'] as const;

/** Valide et nettoie une question. Renvoie un message d'erreur si elle est invalide. */
export function parseQuestion(raw: unknown): QuizQuestion | string {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');

  const category = r.category as QuizQuestion['category'];
  if (!QUESTION_CATEGORIES.includes(category)) return 'Catégorie invalide.';
  const question = text(r.question, 300);
  if (question.length < 5) return 'La question est trop courte.';
  if (!Array.isArray(r.choices) || r.choices.length !== 4) return 'Il faut exactement 4 réponses.';
  const choices = r.choices.map((c) => text(c, 120));
  if (choices.some((c) => !c)) return 'Les 4 réponses doivent être remplies.';
  if (new Set(choices.map((c) => c.toLowerCase())).size !== 4) return 'Les 4 réponses doivent être différentes.';
  const answer = Number(r.answer);
  if (![0, 1, 2, 3].includes(answer)) return 'Indique la bonne réponse.';
  const explanation = text(r.explanation, 300) || undefined;
  return { category, question, choices: choices as QuizQuestion['choices'], answer: answer as QuizQuestion['answer'], explanation };
}

/** Filtre une liste venant d'un fichier JSON : ne garde que les questions valides. */
export function sanitizeQuestionList(raw: unknown): CustomQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomQuestion[] = [];
  for (const item of raw) {
    const q = parseQuestion(item);
    if (typeof q === 'string') continue;
    const r = item as Partial<CustomQuestion>;
    out.push({
      ...q,
      id: typeof r.id === 'string' && r.id ? r.id : newQuestionId(),
      createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
      author: typeof r.author === 'string' ? r.author.slice(0, 40) : undefined,
    });
  }
  return out;
}

export function newQuestionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const LOCAL_QUESTIONS_KEY = 'partyhub:local-questions';
