import type { QuizQuestion } from '@content/quiz';
import type { RankClip } from '@content/rank';
import type { VideoQuestion } from '@content/video';
import { LOCAL_RANK_KEY, LOCAL_VIDEO_KEY, sanitizeRankClips, sanitizeVideoQuestions } from '@shared/clips';
import { LOCAL_QUESTIONS_KEY, sanitizeQuestionList } from '@shared/questions';
import { BASE_PATH } from '@/lib/basePath';

/**
 * Contenu ajouté via /admin, chargé par l'hôte :
 *  - fichiers publiés avec le site (public/*.json, sauvegarde GitHub)
 *  - + contenu enregistré dans ce navigateur (mode local)
 */
async function loadList<T extends { id: string }>(file: string, localKey: string, sanitize: (raw: unknown) => T[], key: (x: T) => string): Promise<T[]> {
  let published: T[] = [];
  try {
    const res = await fetch(`${BASE_PATH}/${file}?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    if (res.ok) published = sanitize(await res.json());
  } catch {
    /* hors-ligne : on garde le contenu intégré */
  }
  let local: T[] = [];
  try {
    local = sanitize(JSON.parse(localStorage.getItem(localKey) ?? '[]'));
  } catch {
    /* ignore */
  }
  const seen = new Set(published.map(key));
  return [...published, ...local.filter((x) => !seen.has(key(x)))];
}

export const loadCustomQuestions = (): Promise<QuizQuestion[]> =>
  loadList('questions.json', LOCAL_QUESTIONS_KEY, sanitizeQuestionList, (q) => q.question.toLowerCase());

export const loadCustomRankClips = (): Promise<RankClip[]> =>
  loadList('rank-clips.json', LOCAL_RANK_KEY, sanitizeRankClips, (c) => `${c.clip.type === 'youtube' ? c.clip.id : ''}-${c.clip.start}`);

export const loadCustomVideoQuestions = (): Promise<VideoQuestion[]> =>
  loadList('video-clips.json', LOCAL_VIDEO_KEY, sanitizeVideoQuestions, (c) => `${c.clip.type === 'youtube' ? c.clip.id : ''}-${c.clip.start}`);

/* Nombre de clips disponibles : sert à griser ou non les jeux vidéo dans le lobby */
let counts = { rank: 0, video: 0 };
export const customCounts = () => counts;

export async function refreshCustomCounts(): Promise<boolean> {
  const [rank, video] = await Promise.all([loadCustomRankClips(), loadCustomVideoQuestions()]);
  const next = { rank: rank.length, video: video.length };
  const changed = next.rank !== counts.rank || next.video !== counts.video;
  counts = next;
  return changed;
}
