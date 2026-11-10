import type { GameAction, PlaylistItem, SyncPayload } from './types';

export type Ack<T = {}> = (res: ({ ok: true } & T) | { ok: false; error: string }) => void;

export interface Session {
  code: string;
  playerId: string;
  token: string;
}

export interface ProfileInput {
  nickname: string;
  emoji: string;
}

/** Événements émis par le client */
export interface ClientToServerEvents {
  'room:create': (profile: ProfileInput, ack: Ack<{ session: Session }>) => void;
  'room:join': (data: ProfileInput & { code: string }, ack: Ack<{ session: Session }>) => void;
  'room:resume': (session: Session, ack: Ack) => void;
  'room:leave': () => void;
  'room:kick': (playerId: string) => void;
  'room:playlist': (playlist: PlaylistItem[]) => void;
  'room:start': (ack: Ack) => void;
  'room:next': () => void;
  'room:lobby': () => void;
  'game:action': (action: GameAction) => void;
  'game:skip': () => void;
}

/** Événements émis par le serveur */
export interface ServerToClientEvents {
  'room:sync': (payload: SyncPayload) => void;
  'room:kicked': () => void;
  'room:closed': (reason: string) => void;
}
