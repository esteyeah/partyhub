import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { QuizQuestion } from '../../content/quiz';

/**
 * Questions ajoutées depuis l'espace admin du site.
 * Stockées dans un fichier JSON (par défaut data/custom-questions.json, configurable via QUESTIONS_FILE).
 */
export interface CustomQuestion extends QuizQuestion {
  id: string;
  createdAt: number;
  author: string;
}

const CATEGORIES = ['culture', 'enigme', 'piege'] as const;

function filePath() {
  return resolve(process.env.QUESTIONS_FILE ?? 'data/custom-questions.json');
}

export function loadCustomQuestions(): CustomQuestion[] {
  try {
    const data = JSON.parse(readFileSync(filePath(), 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function save(list: CustomQuestion[]) {
  const file = filePath();
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(list, null, 2));
  renameSync(tmp, file); // écriture atomique
}

/** Valide et nettoie une question envoyée par le formulaire admin. */
export function parseQuestion(raw: unknown): QuizQuestion | string {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');

  const category = r.category as QuizQuestion['category'];
  if (!CATEGORIES.includes(category)) return 'Catégorie invalide.';
  const question = text(r.question, 300);
  if (question.length < 5) return 'La question est trop courte.';
  if (!Array.isArray(r.choices) || r.choices.length !== 4) return 'Il faut exactement 4 réponses.';
  const choices = r.choices.map((c) => text(c, 120));
  if (choices.some((c) => !c)) return 'Les 4 réponses doivent être remplies.';
  if (new Set(choices.map((c) => c.toLowerCase())).size !== 4) return 'Les 4 réponses doivent être différentes.';
  const answer = Number(r.answer);
  if (![0, 1, 2, 3].includes(answer)) return 'Indique la bonne réponse.';
  const explanation = text(r.explanation, 300) || undefined;

  return {
    category,
    question,
    choices: choices as QuizQuestion['choices'],
    answer: answer as QuizQuestion['answer'],
    explanation,
  };
}

export function addQuestion(q: QuizQuestion, author: string): CustomQuestion {
  const list = loadCustomQuestions();
  const created: CustomQuestion = { ...q, id: randomUUID(), createdAt: Date.now(), author };
  save([...list, created]);
  return created;
}

export function updateQuestion(id: string, q: QuizQuestion): CustomQuestion | null {
  const list = loadCustomQuestions();
  const i = list.findIndex((x) => x.id === id);
  if (i === -1) return null;
  list[i] = { ...list[i], ...q, explanation: q.explanation };
  save(list);
  return list[i];
}

export function deleteQuestion(id: string): boolean {
  const list = loadCustomQuestions();
  const next = list.filter((x) => x.id !== id);
  if (next.length === list.length) return false;
  save(next);
  return true;
}
