'use client';

import type { DataConnection, Peer } from 'peerjs';
import { hostPeerId, type AckResult, type HostEvents, type Notifications, type Requests, type Session, type WireMessage } from '@shared/events';
import type { GameAction, PlaylistItem } from '@shared/types';
import { HostRuntime } from '@/net/host';
import { openPeer, peerErrorMessage } from '@/net/peer';
import { loadSession, saveSession } from './session';
import { getState, setState } from './store';

/**
 * Couche réseau côté joueur.
 * - Si je crée la partie : mon navigateur héberge le salon (HostRuntime).
 * - Sinon : je me connecte en WebRTC au navigateur de l'hôte (RemoteClient).
 * Les composants n'utilisent que les fonctions exportées en bas de ce fichier.
 */

let host: HostRuntime | null = null;
let remote: RemoteClient | null = null;

function dispatch<E extends keyof HostEvents>(event: E, data: HostEvents[E]) {
  if (event === 'room:sync') {
    const payload = data as HostEvents['room:sync'];
    setState({ sync: payload, offset: payload.serverNow - Date.now(), status: 'connected', notice: null });
  } else if (event === 'room:kicked') {
    teardown();
    setState({ sync: null, notice: 'Tu as été exclu du salon par l’hôte.' });
  } else if (event === 'room:closed') {
    teardown();
    setState({ sync: null, notice: String(data) });
  }
}

function teardown() {
  saveSession(null);
  remote?.close();
  remote = null;
  host = null;
  setState({ status: 'idle' });
}

class RemoteClient {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private seq = 0;
  private pending = new Map<number, (r: AckResult<Record<string, unknown>>) => void>();
  private closed = false;
  private reconnecting = false;

  constructor(readonly code: string) {}

  async connect(): Promise<void> {
    if (!this.peer || this.peer.destroyed) this.peer = await openPeer();
    const peer = this.peer;
    if (peer.disconnected) peer.reconnect();
    await new Promise<void>((resolve, reject) => {
      const conn = peer.connect(hostPeerId(this.code), { reliable: true, serialization: 'json' });
      const timer = setTimeout(() => fail('peer-unavailable'), 12000);
      const onPeerError = (err: { type?: string }) => fail(err.type);
      let settled = false;
      function fail(type?: string) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        peer.off('error', onPeerError);
        conn.close();
        reject(Object.assign(new Error(peerErrorMessage(type)), { type }));
      }
      peer.on('error', onPeerError);
      conn.on('error', (err) => fail((err as { type?: string }).type ?? 'peer-unavailable'));
      conn.on('open', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        peer.off('error', onPeerError);
        this.attach(conn);
        resolve();
      });
    });
  }

  private attach(conn: DataConnection) {
    this.conn = conn;
    conn.on('data', (raw) => {
      const msg = raw as WireMessage;
      if (msg?.t === 'res') {
        this.pending.get(msg.id)?.(msg.res);
        this.pending.delete(msg.id);
      } else if (msg?.t === 'ev') {
        dispatch(msg.ev, msg.data as never);
      }
    });
    conn.on('close', () => {
      if (this.conn === conn && !this.closed) this.reconnect();
    });
  }

  /** Connexion perdue : on retente pendant ~30 s puis on abandonne. */
  private async reconnect() {
    if (this.reconnecting) return;
    this.reconnecting = true;
    setState({ status: 'disconnected' });
    for (let attempt = 0; attempt < 15 && !this.closed; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        await this.connect();
        const session = loadSession();
        const res = session ? await this.request('room:resume', session) : { ok: false as const, error: '' };
        this.reconnecting = false;
        if (!res.ok) dispatch('room:closed', 'Ta place dans le salon a expiré.');
        return;
      } catch (err) {
        if ((err as { type?: string }).type === 'peer-unavailable' && attempt >= 4) break;
      }
    }
    this.reconnecting = false;
    if (!this.closed) dispatch('room:closed', 'Connexion à l’hôte perdue : la partie est terminée.');
  }

  request<E extends keyof Requests>(ev: E, data: Requests[E]['req']): Promise<AckResult<Requests[E]['res']>> {
    return new Promise((resolve) => {
      if (!this.conn?.open) return resolve({ ok: false, error: 'Pas connecté à l’hôte.' });
      const id = ++this.seq;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ ok: false, error: 'L’hôte ne répond pas.' });
      }, 8000);
      this.pending.set(id, (r) => {
        clearTimeout(timer);
        resolve(r as AckResult<Requests[E]['res']>);
      });
      this.conn.send({ t: 'req', id, ev, data } satisfies WireMessage);
    });
  }

  notify<E extends keyof Notifications>(ev: E, data: Notifications[E]) {
    if (this.conn?.open) this.conn.send({ t: 'note', ev, data } satisfies WireMessage);
  }

  close() {
    this.closed = true;
    this.conn?.close();
    setTimeout(() => this.peer?.destroy(), 200);
  }
}

/* ------------------------------------------------------------------ */
/* API utilisée par l'interface                                        */
/* ------------------------------------------------------------------ */

type Result = AckResult<{ session: Session }>;

export async function createRoom(nickname: string, emoji: string): Promise<Result> {
  leaveRoom();
  setState({ status: 'connecting', notice: null });
  try {
    const { runtime, session } = await HostRuntime.create({ nickname, emoji }, dispatch);
    host = runtime;
    saveSession(session);
    return { ok: true, session };
  } catch (err) {
    setState({ status: 'idle' });
    return { ok: false, error: peerErrorMessage((err as { type?: string }).type) };
  }
}

export async function joinRoom(code: string, nickname: string, emoji: string): Promise<Result> {
  leaveRoom();
  const client = new RemoteClient(code.toUpperCase());
  setState({ status: 'connecting', notice: null });
  try {
    await client.connect();
  } catch (err) {
    client.close();
    // Le message passe par le store : le formulaire peut avoir été démonté pendant la connexion
    setState({ status: 'idle', notice: (err as Error).message });
    return { ok: false, error: (err as Error).message };
  }
  const res = await client.request('room:join', { code: code.toUpperCase(), nickname, emoji });
  if (!res.ok) {
    client.close();
    setState({ status: 'idle', notice: res.error });
    return res;
  }
  remote = client;
  saveSession(res.session);
  return res;
}

/** Au chargement d'un lien ?salle=CODE : reprend la session de cet onglet si elle existe. */
let resuming: Promise<void> | null = null;
export function resumeSession(code: string): Promise<void> {
  if (resuming) return resuming;
  const session = loadSession();
  if (!session || session.code !== code || host || remote) return Promise.resolve();
  if (session.host) {
    saveSession(null);
    setState({ notice: 'Tu as quitté ou rechargé la page : la partie que tu hébergeais est terminée.' });
    return Promise.resolve();
  }
  resuming = (async () => {
    const client = new RemoteClient(code);
    setState({ status: 'connecting' });
    try {
      await client.connect();
      const res = await client.request('room:resume', session);
      if (!res.ok) throw new Error(res.error);
      remote = client;
    } catch (err) {
      client.close();
      saveSession(null);
      setState({ status: 'idle', notice: (err as Error).message || 'Session expirée.' });
    } finally {
      resuming = null;
    }
  })();
  return resuming;
}

export function leaveRoom() {
  if (host) host.destroy();
  else remote?.notify('room:leave', null);
  teardown();
  setState({ sync: null });
}

export const isHosting = () => !!host;

function note<E extends keyof Notifications>(ev: E, data: Notifications[E]) {
  if (host) host.localNotify(ev, data);
  else remote?.notify(ev, data);
}

export async function startGame(): Promise<AckResult> {
  if (host) return host.localRequest('room:start', null);
  return remote ? remote.request('room:start', null) : { ok: false, error: 'Pas connecté.' };
}
export const setPlaylist = (playlist: PlaylistItem[]) => note('room:playlist', playlist);
export const kickPlayer = (id: string) => note('room:kick', id);
export const nextGame = () => note('room:next', null);
export const backToLobby = () => note('room:lobby', null);
export const sendAction = (action: GameAction) => note('game:action', action);
export const skipStep = () => note('game:skip', null);

/** Heure de l'hôte estimée */
export const serverNow = () => Date.now() + getState().offset;
