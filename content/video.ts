import type { Clip } from '../shared/types';
import BURLESQUE from './burlesque.json';

/**
 * "Devine la suite" : l'extrait `clip` est joué puis coupé à `clip.end`.
 * Au reveal, `revealClip` (facultatif) montre la vraie suite.
 *
 * Deux sources possibles :
 *   { type: 'youtube', id: 'ID_DE_LA_VIDEO', start: 12, end: 27 }
 *   { type: 'file', src: '/clips/ma-video.mp4', start: 0, end: 8 }   // fichier dans public/clips
 *
 * ⚠️ Ajoute tes propres extraits ci-dessous : le jeu est automatiquement grisé
 * dans le lobby tant que la liste est vide.
 */
export interface VideoQuestion {
  clip: Clip;
  revealClip?: Clip;
  question: string;
  choices: string[]; // 3 ou 4 propositions
  answer: number;
  explanation?: string;
}

/** Gags de films burlesques du domaine public (Lumière, Max Linder, Arbuckle, Semon…), découpés avec tools/clips */
export const BURLESQUE_QUESTIONS = BURLESQUE as VideoQuestion[];

export const VIDEO_QUESTIONS: VideoQuestion[] = [
  ...BURLESQUE_QUESTIONS,
  // Exemple (remplace l'id et les timings par une vraie vidéo) :
  // {
  //   clip: { type: 'youtube', id: 'XXXXXXXXXXX', start: 30, end: 42 },
  //   revealClip: { type: 'youtube', id: 'XXXXXXXXXXX', start: 42, end: 50 },
  //   question: 'Que va faire le chat ?',
  //   choices: ['Il saute sur la table', 'Il fait tomber le verre', 'Il s’endort', 'Il rate son saut'],
  //   answer: 3,
  // },
];
