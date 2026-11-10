import type { GameId, GameSettings, SettingValue } from './types';

/**
 * Catalogue des mini-jeux : métadonnées + paramètres réglables par l'hôte.
 * Le lobby génère automatiquement les formulaires à partir de ce schéma,
 * et le serveur s'en sert pour valider/nettoyer les réglages reçus.
 *
 * ➜ Pour ajouter un jeu : ajoute une entrée ici, un module serveur dans
 *   server/games/ et une vue client dans src/games/.
 */

export type SettingField =
  | { key: string; label: string; type: 'number'; min: number; max: number; step?: number; default: number }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[]; default: string }
  | { key: string; label: string; type: 'boolean'; default: boolean };

export interface GameMeta {
  id: GameId;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  /** Classes Tailwind du dégradé de la carte */
  gradient: string;
  settings: SettingField[];
}

const timeOptions = (values: number[]) => values.map((v) => ({ value: String(v), label: `${v} s` }));

export const GAME_CATALOG: Record<GameId, GameMeta> = {
  quiz: {
    id: 'quiz',
    name: 'Quiz Culture G',
    emoji: '🧠',
    tagline: 'Culture générale, énigmes & pièges',
    description: 'QCM rapide : plus tu réponds vite, plus tu marques. Les stats du salon s’affichent après chaque question.',
    gradient: 'from-violet-500 to-indigo-600',
    settings: [
      { key: 'rounds', label: 'Questions', type: 'number', min: 3, max: 25, default: 10 },
      { key: 'time', label: 'Temps / question', type: 'select', options: timeOptions([10, 15, 20, 30]), default: '20' },
      {
        key: 'category',
        label: 'Catégorie',
        type: 'select',
        options: [
          { value: 'mix', label: '🎲 Mélange' },
          { value: 'culture', label: '🌍 Culture G' },
          { value: 'enigme', label: '🧩 Énigmes' },
          { value: 'piege', label: '🪤 Pièges' },
        ],
        default: 'mix',
      },
    ],
  },
  blindtest: {
    id: 'blindtest',
    name: 'Blind Test',
    emoji: '🎵',
    tagline: 'Trouve le titre ou l’artiste',
    description: 'Un extrait se lance : QCM ou réponse libre avec tolérance aux fautes. Le premier à trouver marque le plus.',
    gradient: 'from-fuchsia-500 to-rose-600',
    settings: [
      {
        key: 'mode',
        label: 'Mode',
        type: 'select',
        options: [
          { value: 'qcm', label: '🔘 QCM (4 choix)' },
          { value: 'libre', label: '⌨️ Réponse libre' },
        ],
        default: 'qcm',
      },
      { key: 'rounds', label: 'Extraits', type: 'number', min: 3, max: 20, default: 8 },
      { key: 'time', label: 'Temps / extrait', type: 'select', options: timeOptions([15, 20, 25, 30]), default: '25' },
      {
        key: 'genre',
        label: 'Playlist',
        type: 'select',
        options: [
          { value: 'mix', label: '🎲 Mélange' },
          { value: 'fr', label: '🇫🇷 Francophone' },
          { value: 'inter', label: '🌎 International' },
          { value: 'retro', label: '📼 Années 80-2000' },
        ],
        default: 'mix',
      },
    ],
  },
  video: {
    id: 'video',
    name: 'Devine la suite',
    emoji: '🎬',
    tagline: 'La vidéo s’arrête… que se passe-t-il ?',
    description: 'Un extrait se coupe au moment clé. Vote pour la bonne suite, puis découvre la fin en direct.',
    gradient: 'from-amber-500 to-orange-600',
    settings: [
      { key: 'rounds', label: 'Extraits', type: 'number', min: 1, max: 15, default: 5 },
      { key: 'time', label: 'Temps de vote', type: 'select', options: timeOptions([10, 15, 20]), default: '15' },
    ],
  },
  rank: {
    id: 'rank',
    name: 'Devine le Rang',
    emoji: '🏆',
    tagline: 'Bronze ou Challenger ?',
    description: 'Regarde le gameplay et estime le rang du joueur. 100 pts pour le rang exact, 50 pts à un rang près.',
    gradient: 'from-cyan-500 to-sky-600',
    settings: [
      { key: 'rounds', label: 'Clips', type: 'number', min: 1, max: 15, default: 5 },
      { key: 'time', label: 'Temps / clip', type: 'select', options: timeOptions([15, 20, 30]), default: '20' },
    ],
  },
  eleven: {
    id: 'eleven',
    name: 'Compose ton 11',
    emoji: '⚽',
    tagline: 'Budget, contraintes & tactique',
    description: 'Compose ton 11 type sous contrainte (budget, nationalité, club…). La meilleure note l’emporte.',
    gradient: 'from-emerald-500 to-teal-600',
    settings: [
      {
        key: 'challenge',
        label: 'Défi',
        type: 'select',
        options: [
          { value: 'budget', label: '💸 Budget serré (250 M€)' },
          { value: 'bleus', label: '🇫🇷 100% Bleus' },
          { value: 'galacticos', label: '🤍 Passés par le Real' },
          { value: 'europe', label: '🌍 Tour d’Europe' },
        ],
        default: 'budget',
      },
      {
        key: 'formation',
        label: 'Formation',
        type: 'select',
        options: [
          { value: '4-3-3', label: '4-3-3' },
          { value: '4-4-2', label: '4-4-2' },
          { value: '3-5-2', label: '3-5-2' },
        ],
        default: '4-3-3',
      },
      { key: 'time', label: 'Temps', type: 'select', options: timeOptions([60, 90, 120, 180, 240]), default: '120' },
    ],
  },
};

export const GAME_IDS = Object.keys(GAME_CATALOG) as GameId[];

export function defaultSettings(id: GameId): GameSettings {
  const out: GameSettings = {};
  for (const f of GAME_CATALOG[id].settings) out[f.key] = f.default;
  return out;
}

/** Nettoie des réglages venant du client (bornes, options valides…). */
export function sanitizeSettings(id: GameId, raw: unknown): GameSettings {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: GameSettings = {};
  for (const f of GAME_CATALOG[id].settings) {
    const v = input[f.key];
    let value: SettingValue = f.default;
    if (f.type === 'number') {
      const n = Number(v);
      if (Number.isFinite(n)) value = Math.min(f.max, Math.max(f.min, Math.round(n)));
    } else if (f.type === 'select') {
      if (typeof v === 'string' && f.options.some((o) => o.value === v)) value = v;
    } else if (typeof v === 'boolean') {
      value = v;
    }
    out[f.key] = value;
  }
  return out;
}
