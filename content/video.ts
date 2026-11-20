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
  // Mèmes et répliques cultes
  {
    clip: { type: 'youtube', id: 'eFUc7ln2PKI', start: 0, end: 3 },
    revealClip: { type: 'youtube', id: 'eFUc7ln2PKI', start: 3, end: 10 },
    question: 'Que va-t-elle faire ?',
    choices: ['Elle crie « Mon sac est fait ! » et frappe son sac', 'Elle part en claquant la porte', 'Elle jette son sac par la fenêtre', 'Elle éclate en sanglots'],
    answer: 0,
  },
  {
    clip: { type: 'youtube', id: 'UQsOt23hB0E', start: 0, end: 1 },
    revealClip: { type: 'youtube', id: 'UQsOt23hB0E', start: 1, end: 4 },
    question: 'Complète la réplique !',
    choices: ['« Tequila, Heineken, ça va être la fête ! »', '« Tequila, Heineken, et au lit ! »', '« Tequila, Heineken, on va tout casser ! »', '« Tequila, Heineken, pas le temps de niaiser ! »'],
    answer: 3,
  },
  {
    clip: { type: 'youtube', id: 'UQsOt23hB0E', start: 5, end: 9 },
    revealClip: { type: 'youtube', id: 'UQsOt23hB0E', start: 9, end: 12 },
    question: 'Complète la réplique !',
    choices: ['« J’suis pas venu ici pour rigoler, OK ? »', '« J’suis pas venu ici pour parler, OK ? »', '« J’suis pas venu ici pour dormir, OK ? »', '« J’suis pas venu ici pour souffrir, OK ? »'],
    answer: 3,
  },
  {
    clip: { type: 'youtube', id: 'UQsOt23hB0E', start: 52, end: 65 },
    revealClip: { type: 'youtube', id: 'UQsOt23hB0E', start: 65, end: 72 },
    question: 'Que va-t-il dire ?',
    choices: ['« Faites gaffe ! »', '« Méfiez-vous ! »', '« Attention ! »', '« Courez ! »'],
    answer: 1,
  },
  {
    clip: { type: 'youtube', id: 'UQsOt23hB0E', start: 189, end: 193 },
    revealClip: { type: 'youtube', id: 'UQsOt23hB0E', start: 193, end: 199 },
    question: 'Que va-t-il dire ?',
    choices: ['« Ohhh ! »', '« Ahhh ! »', '« Bravo ! »', '« Incroyable ! »'],
    answer: 1,
  },
  {
    clip: { type: 'youtube', id: 'UQsOt23hB0E', start: 359, end: 363 },
    revealClip: { type: 'youtube', id: 'UQsOt23hB0E', start: 363, end: 385 },
    question: 'Complète la réplique !',
    choices: ['« C’est la mer Morte »', '« C’est la Méditerranée »', '« C’est la mer Noire »', '« C’est la mer Rouge »'],
    answer: 2,
  },
  {
    clip: { type: 'youtube', id: 'UQsOt23hB0E', start: 448, end: 457 },
    revealClip: { type: 'youtube', id: 'UQsOt23hB0E', start: 457, end: 483 },
    question: 'Que va-t-il répondre ?',
    choices: ['« Mais si, je vais très bien ! »', '« Mais si, je suis très net ! »', '« Non, je suis pas bourré ! »', '« Mais non, j’ai rien bu ! »'],
    answer: 1,
  },
  {
    clip: { type: 'youtube', id: 'UQsOt23hB0E', start: 562, end: 565 },
    revealClip: { type: 'youtube', id: 'UQsOt23hB0E', start: 565, end: 570 },
    question: 'Que va-t-il dire ?',
    choices: ['« Salut ! »', '« Bonne soirée ! »', '« Au revoir ! »', '« À plus ! »'],
    answer: 2,
  },
  // Exemple (remplace l'id et les timings par une vraie vidéo) :
  // {
  //   clip: { type: 'youtube', id: 'XXXXXXXXXXX', start: 30, end: 42 },
  //   revealClip: { type: 'youtube', id: 'XXXXXXXXXXX', start: 42, end: 50 },
  //   question: 'Que va faire le chat ?',
  //   choices: ['Il saute sur la table', 'Il fait tomber le verre', 'Il s’endort', 'Il rate son saut'],
  //   answer: 3,
  // },
];
