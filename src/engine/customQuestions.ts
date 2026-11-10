import type { QuizQuestion } from '@content/quiz';
import { LOCAL_QUESTIONS_KEY, sanitizeQuestionList } from '@shared/questions';
import { BASE_PATH } from '@/lib/basePath';

/**
 * Questions ajoutées via /admin, chargées par l'hôte au lancement du quiz :
 *  - public/questions.json publié avec le site (sauvegarde GitHub)
 *  - + les questions locales de ce navigateur (mode sans clé GitHub)
 */
export async function loadCustomQuestions(): Promise<QuizQuestion[]> {
  let published: QuizQuestion[] = [];
  try {
    const res = await fetch(`${BASE_PATH}/questions.json?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    if (res.ok) published = sanitizeQuestionList(await res.json());
  } catch {
    /* hors-ligne : on garde les questions intégrées */
  }
  let local: QuizQuestion[] = [];
  try {
    local = sanitizeQuestionList(JSON.parse(localStorage.getItem(LOCAL_QUESTIONS_KEY) ?? '[]'));
  } catch {
    /* ignore */
  }
  const seen = new Set(published.map((q) => q.question.toLowerCase()));
  return [...published, ...local.filter((q) => !seen.has(q.question.toLowerCase()))];
}
