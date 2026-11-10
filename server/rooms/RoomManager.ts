import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/events';
import { randomCode } from '../utils/random';
import { Room } from './Room';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

const IDLE_ROOM_MS = 1000 * 60 * 60 * 2; // salon inactif supprimé au bout de 2 h

export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor(private io: IO) {
    setInterval(() => this.cleanup(), 60_000).unref();
  }

  create(): Room {
    let code = randomCode(5);
    while (this.rooms.has(code)) code = randomCode(5);
    const room = new Room(this.io, code, (r) => this.rooms.delete(r.code));
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(String(code ?? '').trim().toUpperCase());
  }

  private cleanup() {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      const nobody = [...room.players.values()].every((p) => !p.socket);
      if (nobody && now - room.lastActivity > IDLE_ROOM_MS) {
        room.destroy();
        this.rooms.delete(room.code);
      }
    }
  }

  get size() {
    return this.rooms.size;
  }
}
