import type { DataConnection, Peer } from 'peerjs';
import { hostPeerId, type AckResult, type HostEvents, type Notifications, type ProfileInput, type Requests, type Session, type WireMessage } from '@shared/events';
import type { GameAction, PlaylistItem } from '@shared/types';
import { Room, type Connection } from '@/engine/Room';
import { randomCode, randomId } from '@/engine/utils/random';
import { openPeer } from './peer';

/**
 * Le navigateur de l'hôte fait office de serveur : il héberge le salon (Room + mini-jeux)
 * et accepte les connexions WebRTC des autres joueurs via PeerJS.
 */
type Sink = <E extends keyof HostEvents>(event: E, data: HostEvents[E]) => void;

interface Ctx {
  conn: Connection;
  playerId?: string;
}

function validProfile(p: Partial<ProfileInput> | undefined): string | null {
  if (!p || typeof p.nickname !== 'string' || !p.nickname.trim()) return 'Choisis un pseudo.';
  if (p.nickname.trim().length > 16) return 'Pseudo trop long (16 caractères max).';
  return null;
}

export class HostRuntime {
  private ctxs = new Set<Ctx>();
  private local!: Ctx;
  private destroyed = false;

  private constructor(private peer: Peer, readonly room: Room) {}

  static async create(profile: ProfileInput, sink: Sink): Promise<{ runtime: HostRuntime; session: Session }> {
    let peer: Peer | null = null;
    let code = '';
    for (let attempt = 0; attempt < 5 && !peer; attempt++) {
      code = randomCode(5);
      try {
        peer = await openPeer(hostPeerId(code));
      } catch (err) {
        if ((err as { type?: string }).type !== 'unavailable-id') throw err;
      }
    }
    if (!peer) throw Object.assign(new Error('no code'), { type: 'server-error' });

    const runtime = new HostRuntime(peer, new Room(code, () => {}));
    // Le joueur hôte est relié par une connexion "locale" (pas de réseau)
    const localConn: Connection = {
      id: `local-${randomId(6)}`,
      send: (event, data) => sink(event, structuredClone(data)),
      close: () => {},
    };
    runtime.local = { conn: localConn };
    const player = runtime.room.addPlayer(profile.nickname, profile.emoji);
    runtime.local.playerId = player.id;
    runtime.room.attach(player.id, localConn);

    peer.on('connection', (dc) => runtime.accept(dc));
    peer.on('disconnected', () => {
      if (!runtime.destroyed) peer.reconnect();
    });
    return { runtime, session: { code, playerId: player.id, token: player.token, host: true } };
  }

  private accept(dc: DataConnection) {
    const ctx: Ctx = {
      conn: {
        id: dc.connectionId,
        send: (event, data) => {
          if (dc.open) dc.send({ t: 'ev', ev: event, data } satisfies WireMessage);
        },
        close: () => dc.close(),
      },
    };
    this.ctxs.add(ctx);
    dc.on('data', (raw) => {
      const msg = raw as WireMessage;
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'req') {
        const res = this.request(ctx, msg.ev, msg.data);
        if (dc.open) dc.send({ t: 'res', id: msg.id, res } satisfies WireMessage);
      } else if (msg.t === 'note') {
        this.notify(ctx, msg.ev, msg.data);
      }
    });
    const onGone = () => {
      this.ctxs.delete(ctx);
      if (ctx.playerId) this.room.detach(ctx.playerId, ctx.conn.id);
    };
    dc.on('close', onGone);
    dc.on('error', onGone);
  }

  private request(ctx: Ctx, ev: keyof Requests, data: unknown): AckResult<Record<string, unknown>> {
    const room = this.room;
    switch (ev) {
      case 'room:join': {
        const d = data as Requests['room:join']['req'];
        const err = validProfile(d);
        if (err) return { ok: false, error: err };
        if (String(d.code).toUpperCase() !== room.code) return { ok: false, error: 'Aucun salon avec ce code.' };
        if (room.isFull()) return { ok: false, error: 'Le salon est complet.' };
        if (ctx.playerId) room.removePlayer(ctx.playerId);
        const player = room.addPlayer(d.nickname, d.emoji);
        ctx.playerId = player.id;
        room.attach(player.id, ctx.conn);
        return { ok: true, session: { code: room.code, playerId: player.id, token: player.token } };
      }
      case 'room:resume': {
        const s = data as Session;
        const player = room.players.get(s?.playerId);
        if (!player || player.token !== s.token) return { ok: false, error: 'Session expirée.' };
        ctx.playerId = player.id;
        room.attach(player.id, ctx.conn);
        return { ok: true };
      }
      case 'room:start': {
        if (!ctx.playerId) return { ok: false, error: 'Salon introuvable.' };
        const err = room.start(ctx.playerId);
        return err ? { ok: false, error: err } : { ok: true };
      }
      default:
        return { ok: false, error: 'Requête inconnue.' };
    }
  }

  private notify(ctx: Ctx, ev: keyof Notifications, data: unknown) {
    const id = ctx.playerId;
    if (!id || !this.room.players.has(id)) return;
    const room = this.room;
    switch (ev) {
      case 'room:leave':
        ctx.playerId = undefined;
        room.removePlayer(id);
        break;
      case 'room:kick':
        room.kick(id, String(data));
        break;
      case 'room:playlist':
        room.setPlaylist(id, data as PlaylistItem[]);
        break;
      case 'room:next':
        room.next(id);
        break;
      case 'room:lobby':
        room.backToLobby(id);
        break;
      case 'game:action':
        room.gameAction(id, data as GameAction);
        break;
      case 'game:skip':
        room.skip(id);
        break;
    }
  }

  /* Actions du joueur hôte lui-même */
  localRequest(ev: keyof Requests, data: unknown) {
    return this.request(this.local, ev, data);
  }
  localNotify(ev: keyof Notifications, data: unknown) {
    this.notify(this.local, ev, data);
  }

  destroy(reason = 'L’hôte a fermé la partie.') {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const ctx of this.ctxs) ctx.conn.send('room:closed', reason);
    this.room.destroy();
    // Laisse le temps au message de partir avant de couper
    setTimeout(() => this.peer.destroy(), 300);
  }
}
