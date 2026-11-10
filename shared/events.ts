import type { GameAction, PlaylistItem, SyncPayload } from './types';

/**
 * Protocole pair-à-pair (PeerJS / WebRTC) entre les joueurs et le navigateur de l'hôte.
 * L'hôte fait tourner le salon et les jeux ; les autres envoient des requêtes et reçoivent des snapshots.
 */
export interface Session {
  code: string;
  playerId: string;
  token: string;
  /** true si ce navigateur héberge la partie */
  host?: boolean;
}

export interface ProfileInput {
  nickname: string;
  emoji: string;
}

export type AckResult<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

/** Requêtes client → hôte qui attendent une réponse */
export interface Requests {
  'room:join': { req: ProfileInput & { code: string }; res: { session: Session } };
  'room:resume': { req: Session; res: {} };
  'room:start': { req: null; res: {} };
}

/** Messages client → hôte sans réponse */
export interface Notifications {
  'room:leave': null;
  'room:kick': string;
  'room:playlist': PlaylistItem[];
  'room:next': null;
  'room:lobby': null;
  'game:action': GameAction;
  'game:skip': null;
}

/** Événements hôte → client */
export interface HostEvents {
  'room:sync': SyncPayload;
  'room:kicked': null;
  'room:closed': string;
}

export type WireMessage =
  | { t: 'req'; id: number; ev: keyof Requests; data: unknown }
  | { t: 'note'; ev: keyof Notifications; data: unknown }
  | { t: 'res'; id: number; res: AckResult<Record<string, unknown>> }
  | { t: 'ev'; ev: keyof HostEvents; data: unknown };

/** Identifiant PeerJS du navigateur hôte pour un code de salon */
export const hostPeerId = (code: string) => `partyhub-v1-${code.toUpperCase()}`;
