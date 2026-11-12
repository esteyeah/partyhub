import type { Clip } from '../shared/types';

/**
 * "Devine le Rang" : chaque clip est associé à un jeu et au rang réel du joueur.
 * Les échelles de rangs sont définies par jeu ci-dessous (ordre croissant).
 *
 * ⚠️ Ajoute tes clips (YouTube ou fichiers dans public/clips) : le jeu est grisé
 * dans le lobby tant que la liste est vide.
 */
export const RANK_LADDERS = {
  lol: { name: 'League of Legends', ranks: ['Fer', 'Bronze', 'Argent', 'Or', 'Platine', 'Émeraude', 'Diamant', 'Maître', 'Grand Maître', 'Challenger'] },
  valorant: { name: 'Valorant', ranks: ['Fer', 'Bronze', 'Argent', 'Or', 'Platine', 'Diamant', 'Ascendant', 'Immortel', 'Radiant'] },
  rocket: { name: 'Rocket League', ranks: ['Bronze', 'Argent', 'Or', 'Platine', 'Diamant', 'Champion', 'Grand Champion', 'Supersonic Legend'] },
  cs2: { name: 'Counter-Strike', ranks: ['Silver', 'Gold Nova', 'Master Guardian', 'Legendary Eagle', 'Supreme', 'Global Elite'] },
  premier: {
    name: 'CS2 Premier',
    ranks: ['< 5 000', '5 000 – 9 999', '10 000 – 14 999', '15 000 – 19 999', '20 000 – 24 999', '25 000 – 29 999', '30 000+'],
  },
} as const;

export type RankGame = keyof typeof RANK_LADDERS;

export interface RankClip {
  game: RankGame;
  clip: Clip;
  /** Rang réel (doit exister dans RANK_LADDERS[game].ranks)… */
  rank?: string;
  /** …ou mode arbitre : la vidéo révèle le rang elle-même et l'hôte le valide pendant la partie */
  judged?: boolean;
  /** Round pistolet (CS) : utilisé par le mode « rounds pistolet uniquement » */
  pistol?: boolean;
  context?: string;
  source?: string;
}

/**
 * Clips intégrés au code (rang vérifié uniquement). Les clips ajoutés via /admin
 * sont dans public/rank-clips.json.
 */
export const RANK_CLIPS: RankClip[] = [];
