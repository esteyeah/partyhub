import type { Server } from 'socket.io';
import type { ClientToServerEvents, ProfileInput, ServerToClientEvents } from '../shared/events';
import type { AppSocket } from './rooms/Room';
import { RoomManager } from './rooms/RoomManager';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

function validProfile(p: ProfileInput | undefined): string | null {
  if (!p || typeof p.nickname !== 'string' || !p.nickname.trim()) return 'Choisis un pseudo.';
  if (p.nickname.trim().length > 16) return 'Pseudo trop long (16 caractères max).';
  return null;
}

export function registerSocketHandlers(io: IO) {
  const rooms = new RoomManager(io);

  io.on('connection', (socket: AppSocket) => {
    const current = () => {
      const code = socket.data.roomCode as string | undefined;
      const playerId = socket.data.playerId as string | undefined;
      const room = code ? rooms.get(code) : undefined;
      return room && playerId && room.players.has(playerId) ? { room, playerId } : null;
    };
    const leaveCurrent = () => {
      const c = current();
      if (c) c.room.removePlayer(c.playerId);
    };

    socket.on('room:create', (profile, ack) => {
      const err = validProfile(profile);
      if (err) return ack({ ok: false, error: err });
      leaveCurrent();
      const room = rooms.create();
      const player = room.addPlayer(profile.nickname, profile.emoji);
      room.attach(player.id, socket);
      ack({ ok: true, session: { code: room.code, playerId: player.id, token: player.token } });
    });

    socket.on('room:join', (data, ack) => {
      const err = validProfile(data);
      if (err) return ack({ ok: false, error: err });
      const room = rooms.get(data.code);
      if (!room) return ack({ ok: false, error: 'Aucun salon avec ce code.' });
      if (room.isFull()) return ack({ ok: false, error: 'Le salon est complet.' });
      leaveCurrent();
      const player = room.addPlayer(data.nickname, data.emoji);
      room.attach(player.id, socket);
      ack({ ok: true, session: { code: room.code, playerId: player.id, token: player.token } });
    });

    socket.on('room:resume', (session, ack) => {
      const room = rooms.get(session?.code);
      const player = room?.players.get(session?.playerId);
      if (!room || !player || player.token !== session.token) {
        return ack({ ok: false, error: 'Session expirée.' });
      }
      room.attach(player.id, socket);
      ack({ ok: true });
    });

    socket.on('room:leave', leaveCurrent);

    socket.on('room:kick', (targetId) => {
      const c = current();
      c?.room.kick(c.playerId, targetId);
    });

    socket.on('room:playlist', (playlist) => {
      const c = current();
      c?.room.setPlaylist(c.playerId, playlist);
    });

    socket.on('room:start', (ack) => {
      const c = current();
      if (!c) return ack({ ok: false, error: 'Salon introuvable.' });
      const err = c.room.start(c.playerId);
      ack(err ? { ok: false, error: err } : { ok: true });
    });

    socket.on('room:next', () => {
      const c = current();
      c?.room.next(c.playerId);
    });

    socket.on('room:lobby', () => {
      const c = current();
      c?.room.backToLobby(c.playerId);
    });

    socket.on('game:action', (action) => {
      const c = current();
      c?.room.gameAction(c.playerId, action);
    });

    socket.on('game:skip', () => {
      const c = current();
      c?.room.skip(c.playerId);
    });

    socket.on('disconnect', () => {
      const c = current();
      c?.room.detach(c.playerId, socket.id);
    });
  });

  return rooms;
}
