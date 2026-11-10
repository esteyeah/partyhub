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
  | { type: 'youtube'; id: string; start: number; end: number }
  | { type: 'file'; src: string; start: number; end: number };

/* ------------------------------------------------------------------ */
/* Vue générique des jeux "à manches" (Quiz, Blind Test, Vidéo, Rang)  */
/* ------------------------------------------------------------------ */

export type RoundPhase = 'loading' | 'intro' | 'question' | 'reveal';

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
  clip: Clip;
  question: string;
}
export interface VideoExtra {
  revealClip?: Clip;
  explanation?: string;
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

export interface ElevenBonusResult {
  label: string;
  value: number;
  ok: boolean;
}

export interface ElevenTeamResult {
  playerId: string;
  picks: (string | null)[];
  spent: number;
  average: number;
  note: number;
  bonuses: ElevenBonusResult[];
  points: number;
  complete: boolean;
  best: boolean;
}

export interface ElevenView {
  kind: 'eleven';
  gameId: 'eleven';
  phase: 'build' | 'reveal';
  endsAt: number | null;
  durationMs: number;
  challenge: {
    name: string;
    description: string;
    budget: number;
    rules: string[];
    bonuses: { label: string; value: number }[];
  };
  formation: string;
  slots: ElevenSlot[];
  pool: Footballer[];
  me: { picks: (string | null)[]; spent: number; submitted: boolean };
  progress: Record<string, { filled: number; submitted: boolean }>;
  results: ElevenTeamResult[] | null;
}

export type AnyGameView = RoundGameView | ElevenView;

/* ------------------------------------------------------------------ */
/* Actions envoyées par le client                                      */
/* ------------------------------------------------------------------ */

export type GameAction =
  | { type: 'answer'; choice: number }
  | { type: 'guess'; text: string }
  | { type: 'pick'; slot: number; footballerId: string }
  | { type: 'clear'; slot: number }
  | { type: 'submit'; value: boolean };
