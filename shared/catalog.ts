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
    tagline: 'Vidéo coupée ou réplique à compléter',
    description: 'Une vidéo s’arrête au moment clé (ou une réplique culte est coupée) : vote pour la bonne suite, puis découvre la fin.',
    gradient: 'from-amber-500 to-orange-600',
    settings: [
      {
        key: 'source',
        label: 'Contenu',
        type: 'select',
        options: [
          { value: 'mix', label: '🎲 Vidéos + mèmes' },
          { value: 'videos', label: '🎬 Vidéos' },
          { value: 'memes', label: '💬 Complète la phrase' },
        ],
        default: 'mix',
      },
      { key: 'rounds', label: 'Manches', type: 'number', min: 1, max: 20, default: 8 },
      { key: 'time', label: 'Temps de vote', type: 'select', options: timeOptions([10, 15, 20]), default: '15' },
    ],
  },
  rank: {
    id: 'rank',
    name: 'Devine le Rang',
    emoji: '🏆',
    tagline: 'Bronze ou Champion ? Silver ou Global ?',
    description:
      'Regarde le gameplay et estime le rang du joueur. 100 pts pour le rang exact, 50 pts à un rang près. Sur les vidéos « guess the rank », l’hôte stoppe avant la révélation puis valide le vrai rang.',
    gradient: 'from-cyan-500 to-sky-600',
    settings: [
      {
        key: 'game',
        label: 'Jeu',
        type: 'select',
        options: [
          { value: 'all', label: '🎲 Tous' },
          { value: 'rocket', label: '🚗 Rocket League' },
          { value: 'cs2', label: '🔫 Counter-Strike' },
          { value: 'cs2-pistol', label: '🔫 CS — rounds pistolet uniquement' },
          { value: 'valorant', label: '🎯 Valorant' },
          { value: 'lol', label: '🧙 League of Legends' },
        ],
        default: 'all',
      },
      { key: 'rounds', label: 'Clips', type: 'number', min: 1, max: 20, default: 6 },
      { key: 'time', label: 'Temps / clip', type: 'select', options: timeOptions([15, 20, 30]), default: '20' },
    ],
  },
  eleven: {
    id: 'eleven',
    name: 'Compose ton 11',
    emoji: '⚽',
    tagline: 'Draft poste par poste, duels & surprises',
    description:
      'À chaque poste, choisis un joueur parmi ceux proposés sans dépasser ton budget. Même choix qu’un autre ? Duel sur une question foot : le perdant hérite d’un joueur surprise…',
    gradient: 'from-emerald-500 to-teal-600',
    settings: [
      {
        key: 'theme',
        label: 'Thème',
        type: 'select',
        options: [
          { value: 'all', label: '🌍 Tous les joueurs' },
          { value: 'ligue1', label: '🇫🇷 Ligue 1' },
          { value: 'premier', label: '🏴 Premier League' },
          { value: 'liga', label: '🇪🇸 Liga' },
          { value: 'seriea', label: '🇮🇹 Serie A' },
          { value: 'bundesliga', label: '🇩🇪 Bundesliga' },
          { value: 'ucl', label: '⭐ Ligue des champions' },
          { value: 'france', label: '🐓 Équipe de France' },
          { value: 'pepites', label: '🌱 Pépites (≤ 23 ans)' },
          { value: 'veterans', label: '🧓 Vétérans (≥ 32 ans)' },
        ],
        default: 'all',
      },
      { key: 'choices', label: 'Choix / poste', type: 'number', min: 3, max: 5, default: 4 },
      {
        key: 'budget',
        label: 'Budget',
        type: 'select',
        options: [150, 200, 250, 300, 400, 500].map((v) => ({ value: String(v), label: `${v} M€` })),
        default: '300',
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
      { key: 'time', label: 'Temps / poste', type: 'select', options: timeOptions([15, 20, 30]), default: '20' },
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
