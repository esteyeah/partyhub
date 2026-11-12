/**
 * Types partagés entre le serveur (Socket.io) et le client (Next.js).
 * Le serveur est la seule source de vérité : le client ne fait qu'afficher
 * les "vues" (snapshots) qu'il reçoit et envoyer des actions.
 */

export type GameId = 'quiz' | 'blindtest' | 'video' | 'rank' | 'eleven';

export type SettingValue = string | number | boolean;
export type GameSettings = Record<string, SettingValue>;

export const PLAYER_COLORS = [
  'violet', 'fuchsia', 'rose', 'orange', 'amber', 'lime', 'emerald', 'cyan', 'sky', 'indigo',
] as const;
export type PlayerColor = (typeof PLAYER_COLORS)[number];

export interface PlayerPublic {
  id: string;
  nickname: string;
  emoji: string;
  color: PlayerColor;
  score: number;
  connected: boolean;
  isHost: boolean;
}

export interface PlaylistItem {
  uid: string;
  gameId: GameId;
  settings: GameSettings;
}

export interface ScoreRow {
  playerId: string;
  score: number;
  previousScore: number;
  rank: number;
  previousRank: number;
  gained: number;
}

export interface HistoryEntry {
  gameId: GameId;
  top: { playerId: string; points: number }[];
}

export type RoomPhase = 'lobby' | 'playing' | 'scoreboard' | 'ended';

export interface GameAvailability {
  available: boolean;
  reason?: string;
}

export interface RoomSnapshot {
  code: string;
  phase: RoomPhase;
  hostId: string;
  players: PlayerPublic[];
  playlist: PlaylistItem[];
  currentIndex: number;
  scoreboard: ScoreRow[] | null;
  history: HistoryEntry[];
  availability: Record<GameId, GameAvailability>;
  maxPlayers: number;
}

export interface SyncPayload {
  room: RoomSnapshot;
  game: AnyGameView | null;
  you: string;
  serverNow: number;
}

/* ------------------------------------------------------------------ */
/* Médias                                                              */
/* ------------------------------------------------------------------ */

/** Un extrait vidéo : YouTube (id + bornes en secondes) ou fichier local (public/clips). */
export type Clip =
  | { type: 'youtube'; id: string; start: number; end: number; maskBottom?: number }
  | { type: 'file'; src: string; start: number; end: number; maskBottom?: number };
/* maskBottom : hauteur (en %) d'un cache noir en bas de l'image, pour masquer une barre avec un pseudo */

/* ------------------------------------------------------------------ */
/* Vue générique des jeux "à manches" (Quiz, Blind Test, Vidéo, Rang)  */
/* ------------------------------------------------------------------ */

export type RoundPhase = 'loading' | 'intro' | 'question' | 'judge' | 'reveal';

export type RoundInput =
  | { kind: 'choice'; choices: string[]; layout: 'grid' | 'ladder' }
  | { kind: 'text'; placeholder: string; keys: { key: string; label: string }[] };

export type ProgressStatus = 'waiting' | 'answered' | 'partial' | 'done';

export interface RoundResult {
  playerId: string;
  points: number;
  correct: boolean;
  /** Ce que le joueur a répondu (ex: "Diamant") */
  label?: string;
  ms?: number;
}

export interface FeedItem {
  id: number;
  text: string;
}

export interface RoundGameView<P = unknown, X = unknown> {
  kind: 'round';
  gameId: GameId;
  phase: RoundPhase;
  round: number;
  totalRounds: number;
  endsAt: number | null;
  durationMs: number;
  prompt: P | null;
  input: RoundInput | null;
  progress: Record<string, ProgressStatus>;
  feed: FeedItem[];
  me: {
    locked: boolean;
    choice: number | null;
    found: string[];
    feedback: { type: 'close' | 'wrong' | 'found'; text: string; id: number } | null;
  };
  /** Mode arbitre : la réponse n'est pas connue, l'hôte la choisit après la révélation */
  judged?: boolean;
  /** Mode arbitre : l'hôte a stoppé la vidéo (vote en cours) */
  frozen?: boolean;
  reveal: {
    correctIndex: number | null;
    answer: string;
    stats: number[] | null;
    results: RoundResult[];
    extra: X | null;
  } | null;
  message?: string;
}

export interface QuizPrompt {
  category: 'culture' | 'enigme' | 'piege';
  categoryLabel: string;
  question: string;
}
export interface QuizExtra {
  explanation?: string;
}

export interface BlindPrompt {
  audioUrl: string;
}
export interface BlindExtra {
  title: string;
  artist: string;
  artwork?: string;
}

export interface VideoPrompt {
  /** Extrait vidéo… */
  clip?: Clip;
  /** …ou réplique à compléter (« Complète la phrase ») */
  quote?: { text: string; source: string };
  question: string;
}
export interface VideoExtra {
  revealClip?: Clip;
  explanation?: string;
  /** Réplique complète, pour « Complète la phrase » */
  fullQuote?: string;
}

export interface RankPrompt {
  game: string;
  clip: Clip;
  context?: string;
}
export interface RankExtra {
  source?: string;
}

/* ------------------------------------------------------------------ */
/* Compose ton 11                                                      */
/* ------------------------------------------------------------------ */

export type FootPos = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface Footballer {
  id: string;
  name: string;
  pos: FootPos;
  nat: string;
  flag: string;
  club: string;
  league: string;
  rating: number;
  /** Prix fictif en M€ */
  price: number;
}

export interface ElevenSlot {
  pos: FootPos;
  label: string;
  /** Coordonnées en % sur le terrain (0,0 = haut gauche) */
  x: number;
  y: number;
}

/** Équipe d'un joueur, poste par poste (dans l'ordre des slots) */
export interface ElevenTeam {
  picks: (Footballer | null)[];
  spent: number;
}

/** Comment un footballeur a été obtenu */
export type ElevenHow = 'pick' | 'duel' | 'auto' | 'surprise-star' | 'surprise-flop' | 'broke';

export interface ElevenOutcome {
  playerId: string;
  footballer: Footballer;
  how: ElevenHow;
  price: number;
}

export interface ElevenDuel {
  footballer: Footballer;
  players: string[];
  /** Joueurs ayant déjà répondu (sans dévoiler la réponse) */
  answered: string[];
  /** Réponses dévoilées après le duel */
  answers: Record<string, number | null> | null;
  winner: string | null;
  /** Personne n'a trouvé : tirage au sort */
  byChance: boolean;
}

export interface ElevenTeamResult {
  playerId: string;
  picks: (Footballer | null)[];
  spent: number;
  note: number;
  points: number;
  best: boolean;
}

export interface ElevenView {
  kind: 'eleven';
  gameId: 'eleven';
  /** pick : choix secret · reveal : choix dévoilés · duel : question foot · resolve : attributions · final : notes */
  phase: 'pick' | 'reveal' | 'duel' | 'resolve' | 'final';
  endsAt: number | null;
  durationMs: number;
  formation: string;
  slots: ElevenSlot[];
  slotIndex: number;
  budget: number;
  offers: Footballer[];
  teams: Record<string, ElevenTeam>;
  /** Joueurs ayant fait leur choix pour ce poste */
  picked: string[];
  me: { choice: string | null; duelChoice: number | null };
  /** Choix de chacun, dévoilés après la phase de choix */
  choices: Record<string, string | null> | null;
  duelQuestion: { question: string; choices: string[]; correctIndex: number | null } | null;
  duels: ElevenDuel[];
  outcomes: ElevenOutcome[] | null;
  results: ElevenTeamResult[] | null;
}

export type AnyGameView = RoundGameView | ElevenView;

/* ------------------------------------------------------------------ */
/* Actions envoyées par le client                                      */
/* ------------------------------------------------------------------ */

export type GameAction =
  | { type: 'answer'; choice: number }
  | { type: 'guess'; text: string }
  | { type: 'pick'; footballerId: string }
  /** Hôte, mode arbitre : stopper la vidéo avant la révélation */
  | { type: 'freeze' }
  /** Hôte, mode arbitre : indiquer la bonne réponse */
  | { type: 'judge'; choice: number };
