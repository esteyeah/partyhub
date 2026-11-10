'use client';

import { useSyncExternalStore } from 'react';
import type { SyncPayload } from '@shared/types';

/**
 * Mini store global (sans dépendance) alimenté par les événements Socket.io.
 */
export interface ClientState {
  status: 'idle' | 'connecting' | 'connected' | 'disconnected';
  sync: SyncPayload | null;
  /** Décalage horloge serveur - horloge locale (ms) */
  offset: number;
  notice: string | null;
}

let state: ClientState = { status: 'idle', sync: null, offset: 0, notice: null };
const listeners = new Set<() => void>();

export function setState(patch: Partial<ClientState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getState() {
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useClientState(): ClientState {
  return useSyncExternalStore(subscribe, getState, getState);
}
