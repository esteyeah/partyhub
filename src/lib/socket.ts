'use client';

import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, Session } from '@shared/events';
import type { GameAction, PlaylistItem } from '@shared/types';
import { loadSession, saveSession } from './session';
import { getState, setState } from './store';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: ClientSocket | null = null;

export function getSocket(): ClientSocket {
  if (socket) return socket;
  socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    setState({ status: 'connected' });
    const session = loadSession();
    if (session) {
      socket!.emit('room:resume', session, (res) => {
        if (!res.ok) {
          saveSession(null);
          setState({ sync: null, notice: 'Ta session a expiré, rejoins à nouveau le salon.' });
        }
      });
    }
  });
  socket.on('disconnect', () => setState({ status: 'disconnected' }));
  socket.io.on('reconnect_attempt', () => setState({ status: 'connecting' }));

  socket.on('room:sync', (payload) => {
    setState({ sync: payload, offset: payload.serverNow - Date.now(), notice: null });
  });
  socket.on('room:kicked', () => {
    saveSession(null);
    setState({ sync: null, notice: 'Tu as été exclu du salon par l’hôte.' });
  });
  socket.on('room:closed', (reason) => {
    saveSession(null);
    setState({ sync: null, notice: reason });
  });
  return socket;
}

/* ---------------- Actions ---------------- */

type AckResult<T> = ({ ok: true } & T) | { ok: false; error: string };

function withTimeout<T>(run: (done: (r: AckResult<T>) => void) => void): Promise<AckResult<T>> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve({ ok: false, error: 'Le serveur ne répond pas.' }), 6000);
    run((r) => {
      clearTimeout(t);
      resolve(r);
    });
  });
}

export async function createRoom(nickname: string, emoji: string) {
  const res = await withTimeout<{ session: Session }>((done) => getSocket().emit('room:create', { nickname, emoji }, done));
  if (res.ok) saveSession(res.session);
  return res;
}

export async function joinRoom(code: string, nickname: string, emoji: string) {
  const res = await withTimeout<{ session: Session }>((done) =>
    getSocket().emit('room:join', { code: code.toUpperCase(), nickname, emoji }, done),
  );
  if (res.ok) saveSession(res.session);
  return res;
}

export function leaveRoom() {
  getSocket().emit('room:leave');
  saveSession(null);
  setState({ sync: null });
}

export const startGame = () => withTimeout<{}>((done) => getSocket().emit('room:start', done));
export const setPlaylist = (playlist: PlaylistItem[]) => getSocket().emit('room:playlist', playlist);
export const kickPlayer = (id: string) => getSocket().emit('room:kick', id);
export const nextGame = () => getSocket().emit('room:next');
export const backToLobby = () => getSocket().emit('room:lobby');
export const sendAction = (action: GameAction) => getSocket().emit('game:action', action);
export const skipStep = () => getSocket().emit('game:skip');

/** Heure serveur estimée */
export const serverNow = () => Date.now() + getState().offset;
