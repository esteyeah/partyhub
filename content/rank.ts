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
  cs2: { name: 'Counter-Strike 2', ranks: ['Argent', 'Nova', 'Master Guardian', 'Aigle', 'Suprême', 'Global Elite'] },
} as const;

export type RankGame = keyof typeof RANK_LADDERS;

export interface RankClip {
  game: RankGame;
  clip: Clip;
  /** Rang réel, doit exister dans RANK_LADDERS[game].ranks */
  rank: string;
  context?: string;
  source?: string;
}

export const RANK_CLIPS: RankClip[] = [
  // Exemple :
  // { game: 'valorant', clip: { type: 'youtube', id: 'XXXXXXXXXXX', start: 60, end: 85 }, rank: 'Or', context: 'Clutch 1v3 sur Ascent' },
  // { game: 'rocket', clip: { type: 'file', src: '/clips/rl-goal.mp4', start: 0, end: 20 }, rank: 'Champion' },
];
