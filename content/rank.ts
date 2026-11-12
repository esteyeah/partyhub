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

/** Clip YouTube en mode arbitre : la vidéo se joue depuis le début et révèle le rang elle-même. */
const yt = (game: RankGame, id: string, context: string, source: string): RankClip => ({
  game,
  judged: true,
  clip: { type: 'youtube', id, start: 0, end: 600 },
  context,
  source,
});

export const RANK_CLIPS: RankClip[] = [
  // 🚗 Rocket League — vidéos « guess the rank » qui révèlent le rang à la fin
  yt('rocket', '0DdFpjUEeU8', 'Rankdle #117.1', 'Rankdle (YouTube)'),
  yt('rocket', 'wy7pzuohtAQ', 'Rankdle #217.3', 'Rankdle (YouTube)'),
  yt('rocket', 'CQXFEVENDHk', 'Rankdle #25.1', 'Rankdle (YouTube)'),
  yt('rocket', '_amC3ZAH2ig', 'Guess the rank', 'YouTube'),
  yt('rocket', '_jlSS3juFMQ', 'Guess the rank', 'YouTube'),
  yt('rocket', 'Qjv6uVeM5sA', 'Guess the rank (short)', 'YouTube'),
  yt('rocket', 'JvIYlydYGaY', 'Guess the rank', 'YouTube'),
  yt('rocket', 'E4HAUuXy6Mo', 'Guess the rank', 'YouTube'),

  // 🔫 Counter-Strike — Rankdle CS:GO + shorts « Guess the Counter-Strike Rank »
  yt('cs2', 'Sy1YrKUmoQ0', 'Rankdle CS:GO #157.2', 'Rankdle (YouTube)'),
  yt('cs2', 'P5szRfI-EwE', 'Rankdle CS:GO #238.2', 'Rankdle (YouTube)'),
  yt('cs2', 'Xh9WARSFrws', 'Rankdle CS:GO #238.1', 'Rankdle (YouTube)'),
  yt('cs2', 'dz0KYObJ8Fw', 'Rankdle CS:GO #200.2', 'Rankdle (YouTube)'),
  yt('cs2', 'p_YiNQk9inw', 'Rankdle CS:GO #130.2', 'Rankdle (YouTube)'),
  yt('cs2', 'cCakIXwc-_I', 'Rankdle CS:GO #132.2', 'Rankdle (YouTube)'),
  yt('cs2', 'lCUdLYjojcg', 'Rankdle CS:GO #128.2', 'Rankdle (YouTube)'),
  yt('cs2', 'X5KFpEz4kv0', 'Rankdle CS:GO #25.2', 'Rankdle (YouTube)'),
  yt('cs2', '7-4-F9tT3I0', 'Guess the rank (short)', 'YouTube'),
  yt('cs2', 'N-abQts_gu0', 'Guess the rank (short)', 'YouTube'),
  yt('cs2', '5dX4lmzahfE', 'Guess the rank (short)', 'YouTube'),
  yt('cs2', 'es5TqOHw7ng', 'Guess the rank (short)', 'YouTube'),
  yt('cs2', 'L3E58W55EI4', 'Guess the rank (short)', 'YouTube'),
];
