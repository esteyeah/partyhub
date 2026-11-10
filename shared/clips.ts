import { RANK_LADDERS, type RankClip, type RankGame } from '../content/rank';
import type { VideoQuestion } from '../content/video';
import { newQuestionId } from './questions';

/**
 * Clips vidéo ajoutés depuis /admin (YouTube uniquement) :
 *  - public/rank-clips.json  → « Devine le rang »
 *  - public/video-clips.json → « Devine la suite »
 */
export interface CustomRankClip extends RankClip {
  id: string;
  createdAt: number;
}
export interface CustomVideoQuestion extends VideoQuestion {
  id: string;
  createdAt: number;
}

export const LOCAL_RANK_KEY = 'partyhub:local-rank-clips';
export const LOCAL_VIDEO_KEY = 'partyhub:local-video-clips';
export const MAX_CLIP_SECONDS = 120;

/* ---------------- YouTube ---------------- */

/** "1:30", "90", "1m30s", "1h2m3s" → secondes */
export function parseTime(input: unknown): number | null {
  if (typeof input === 'number') return Number.isFinite(input) && input >= 0 ? input : null;
  if (typeof input !== 'string' || !input.trim()) return null;
  const s = input.trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  if (/^\d+(:\d{1,2}){1,2}$/.test(s)) return s.split(':').reduce((acc, part) => acc * 60 + Number(part), 0);
  const m = s.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (m && (m[1] || m[2] || m[3])) return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return null;
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Extrait l'id d'une URL YouTube (watch, youtu.be, shorts, embed) et le temps éventuel (?t=). */
export function parseYouTubeUrl(input: string): { id: string; start: number | null } | null {
  const raw = input.trim();
  if (/^[\w-]{11}$/.test(raw)) return { id: raw, start: null };
  try {
    const u = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`);
    if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)youtube-nocookie\.com$/.test(u.hostname)) return null;
    let id: string | null = null;
    if (u.hostname.endsWith('youtu.be')) id = u.pathname.slice(1, 12);
    else if (u.searchParams.get('v')) id = u.searchParams.get('v');
    else id = u.pathname.match(/\/(?:shorts|embed|live|v)\/([\w-]{11})/)?.[1] ?? null;
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    return { id, start: parseTime(u.searchParams.get('t') ?? u.searchParams.get('start') ?? '') };
  } catch {
    return null;
  }
}

/* ---------------- Validation ---------------- */

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');

function parseClip(raw: unknown): { id: string; start: number; end: number } | string {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const id = typeof c.id === 'string' ? c.id : '';
  if (!/^[\w-]{11}$/.test(id)) return 'Lien YouTube invalide.';
  const start = parseTime(c.start);
  const end = parseTime(c.end);
  if (start === null || end === null) return 'Indique le début et la fin de l’extrait.';
  if (end <= start + 2) return 'L’extrait doit durer au moins 3 secondes.';
  if (end - start > MAX_CLIP_SECONDS) return `L’extrait ne doit pas dépasser ${MAX_CLIP_SECONDS} secondes.`;
  return { id, start: Math.round(start), end: Math.round(end) };
}

export function parseRankClip(raw: unknown): RankClip | string {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const game = r.game as RankGame;
  if (!(game in RANK_LADDERS)) return 'Choisis le jeu.';
  const rank = text(r.rank, 40);
  if (!(RANK_LADDERS[game].ranks as readonly string[]).includes(rank)) return 'Choisis le rang réel du joueur.';
  const clip = parseClip(r.clip);
  if (typeof clip === 'string') return clip;
  return {
    game,
    rank,
    clip: { type: 'youtube', ...clip },
    context: text(r.context, 80) || undefined,
    source: text(r.source, 120) || undefined,
  };
}

export function parseVideoQuestion(raw: unknown): VideoQuestion | string {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const clip = parseClip(r.clip);
  if (typeof clip === 'string') return clip;
  const question = text(r.question, 200);
  if (question.length < 5) return 'Écris la question (ex : « Que va-t-il se passer ? »).';
  if (!Array.isArray(r.choices)) return 'Ajoute 3 ou 4 propositions.';
  const choices = r.choices.map((c) => text(c, 120)).filter(Boolean);
  if (choices.length < 3 || choices.length > 4) return 'Il faut 3 ou 4 propositions remplies.';
  if (new Set(choices.map((c) => c.toLowerCase())).size !== choices.length) return 'Les propositions doivent être différentes.';
  const answer = Number(r.answer);
  if (!Number.isInteger(answer) || answer < 0 || answer >= choices.length) return 'Indique la bonne suite.';
  let revealClip: VideoQuestion['revealClip'];
  const rc = r.revealClip as Record<string, unknown> | undefined;
  if (rc && rc.end !== undefined && rc.end !== null && rc.end !== '') {
    const end = parseTime(rc.end);
    if (end === null || end <= clip.end) return 'La fin de la suite doit être après la coupure.';
    if (end - clip.end > 60) return 'La suite révélée ne doit pas dépasser 60 secondes.';
    revealClip = { type: 'youtube', id: clip.id, start: clip.end, end: Math.round(end) };
  }
  return { clip: { type: 'youtube', ...clip }, revealClip, question, choices, answer, explanation: text(r.explanation, 200) || undefined };
}

function sanitizeList<T>(raw: unknown, parse: (x: unknown) => T | string): (T & { id: string; createdAt: number })[] {
  if (!Array.isArray(raw)) return [];
  const out: (T & { id: string; createdAt: number })[] = [];
  for (const item of raw) {
    const v = parse(item);
    if (typeof v === 'string') continue;
    const r = item as { id?: unknown; createdAt?: unknown };
    out.push({ ...v, id: typeof r.id === 'string' && r.id ? r.id : newQuestionId(), createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now() });
  }
  return out;
}

export const sanitizeRankClips = (raw: unknown): CustomRankClip[] => sanitizeList(raw, parseRankClip);
export const sanitizeVideoQuestions = (raw: unknown): CustomVideoQuestion[] => sanitizeList(raw, parseVideoQuestion);
