import { GAME_CATALOG, sanitizeSettings } from '@shared/catalog';
import type { HostEvents } from '@shared/events';
import {
  PLAYER_COLORS,
  type GameAction,
  type HistoryEntry,
  type PlayerColor,
  type PlaylistItem,
  type RoomPhase,
  type RoomSnapshot,
  type ScoreRow,
} from '@shared/types';
import type { GameContext, GameModule } from './games/GameModule';
import { availabilityMap, GAME_REGISTRY } from './games/registry';
import { randomId } from './utils/random';

/** Lien vers un joueur : connexion WebRTC distante, ou locale pour l'hôte lui-même. */
export interface Connection {
  readonly id: string;
  send<E extends keyof HostEvents>(event: E, data: HostEvents[E]): void;
  close(): void;
}

export const MAX_PLAYERS = 16;
const RECONNECT_GRACE_MS = 60_000;
const SCOREBOARD_AUTO_NEXT_MS = 15_000;

interface Player {
  id: string;
  token: string;
  nickname: string;
  emoji: string;
  color: PlayerColor;
  score: number;
  socket: Connection | null;
  joinedAt: number;
  removeTimer?: ReturnType<typeof setTimeout>;
}

/**
 * Un salon : liste des joueurs, programme de mini-jeux, scores, et le jeu en cours.
 * Toute modification d'état passe par `sync()` qui envoie à chaque joueur
 * un snapshot personnalisé (regroupé en un seul envoi par tick).
 */
export class Room {
  readonly players = new Map<string, Player>();
  hostId = '';
  phase: RoomPhase = 'lobby';
  playlist: PlaylistItem[] = [];
  currentIndex = -1;
  game: GameModule | null = null;
  scoreboard: ScoreRow[] | null = null;
  history: HistoryEntry[] = [];
  lastActivity = Date.now();

  private scoresBeforeGame = new Map<string, number>();
  private syncQueued = false;
  private nextTimer?: ReturnType<typeof setTimeout>;

  constructor(readonly code: string, private onEmpty: (room: Room) => void) {}

  /* ---------------- Joueurs ---------------- */

  addPlayer(nickname: string, emoji: string): Player {
    let name = nickname.trim().slice(0, 16) || 'Joueur';
    const taken = new Set([...this.players.values()].map((p) => p.nickname.toLowerCase()));
    if (taken.has(name.toLowerCase())) {
      let i = 2;
      while (taken.has(`${name}${i}`.toLowerCase())) i++;
      name = `${name}${i}`;
    }
    const used = new Set([...this.players.values()].map((p) => p.color));
    const color = PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[this.players.size % PLAYER_COLORS.length];
    const player: Player = {
      id: randomId(),
      token: randomId(24),
      nickname: name,
      emoji: [...emoji].slice(0, 2).join('') || '😎',
      color,
      score: 0,
      socket: null,
      joinedAt: Date.now(),
    };
    this.players.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;
    this.game?.onPlayerJoin(player.id);
    return player;
  }

  isFull() {
    return this.players.size >= MAX_PLAYERS;
  }

  attach(playerId: string, socket: Connection) {
    const p = this.players.get(playerId);
    if (!p) return;
    if (p.removeTimer) clearTimeout(p.removeTimer);
    p.removeTimer = undefined;
    if (p.socket && p.socket.id !== socket.id) p.socket.close();
    p.socket = socket;
    this.touch();
    this.sync();
  }

  /** Socket perdu : on garde le joueur un moment pour lui permettre de revenir. */
  detach(playerId: string, socketId: string) {
    const p = this.players.get(playerId);
    if (!p || p.socket?.id !== socketId) return;
    p.socket = null;
    p.removeTimer = setTimeout(() => this.removePlayer(playerId), RECONNECT_GRACE_MS);
    if (this.hostId === playerId) this.migrateHost();
    this.sync();
  }

  removePlayer(playerId: string) {
    const p = this.players.get(playerId);
    if (!p) return;
    if (p.removeTimer) clearTimeout(p.removeTimer);
    this.players.delete(playerId);
    this.game?.onPlayerLeave(playerId);
    if (!this.players.size) {
      this.destroy();
      this.onEmpty(this);
      return;
    }
    if (this.hostId === playerId) this.migrateHost();
    this.sync();
  }

  private migrateHost() {
    const candidates = [...this.players.values()].sort((a, b) => a.joinedAt - b.joinedAt);
    const next = candidates.find((p) => p.socket) ?? candidates[0];
    if (next) this.hostId = next.id;
  }

  kick(byId: string, targetId: string) {
    if (byId !== this.hostId || byId === targetId) return;
    const target = this.players.get(targetId);
    target?.socket?.send('room:kicked', null);
    this.removePlayer(targetId);
  }

  /* ---------------- Lobby / programme ---------------- */

  setPlaylist(byId: string, raw: PlaylistItem[]) {
    if (byId !== this.hostId || this.phase !== 'lobby' || !Array.isArray(raw)) return;
    const availability = availabilityMap();
    this.playlist = raw
      .filter((it) => it && it.gameId in GAME_CATALOG && availability[it.gameId].available)
      .slice(0, 12)
      .map((it) => ({
        uid: String(it.uid || randomId(6)).slice(0, 16),
        gameId: it.gameId,
        settings: sanitizeSettings(it.gameId, it.settings),
      }));
    this.sync();
  }

  start(byId: string): string | null {
    if (byId !== this.hostId) return 'Seul l’hôte peut lancer la partie.';
    if (this.phase !== 'lobby') return 'La partie est déjà lancée.';
    if (!this.playlist.length) return 'Choisis au moins un mini-jeu.';
    for (const p of this.players.values()) p.score = 0;
    this.history = [];
    this.startGame(0);
    return null;
  }

  private startGame(index: number) {
    clearTimeout(this.nextTimer);
    this.game?.destroy();
    this.currentIndex = index;
    this.phase = 'playing';
    this.scoreboard = null;
    this.scoresBeforeGame = new Map([...this.players.values()].map((p) => [p.id, p.score]));

    const item = this.playlist[index];
    let game: GameModule | null = null;
    game = GAME_REGISTRY[item.gameId].create(this.createContext(() => game), item.settings);
    this.game = game;
    const started = game;
    Promise.resolve(started.start()).catch((err) => {
      console.error(`[room ${this.code}] game crashed`, err);
      if (this.game === started) this.finishGame();
    });
    this.sync();
  }

  private createContext(owner: () => GameModule | null): GameContext {
    return {
      players: () =>
        [...this.players.values()].map((p) => ({ id: p.id, nickname: p.nickname, connected: !!p.socket })),
      nickname: (id) => this.players.get(id)?.nickname ?? '???',
      addScore: (id, points) => {
        const p = this.players.get(id);
        if (p) p.score += Math.round(points);
      },
      sync: () => this.sync(),
      finish: () => {
        // Ignore les appels d'un jeu déjà remplacé ou arrêté
        if (this.game && this.game === owner()) this.finishGame();
      },
    };
  }

  private ranking(scoreOf: (p: Player) => number): Map<string, number> {
    const sorted = [...this.players.values()].sort((a, b) => scoreOf(b) - scoreOf(a));
    const ranks = new Map<string, number>();
    sorted.forEach((p, i) => {
      const prev = sorted[i - 1];
      ranks.set(p.id, prev && scoreOf(prev) === scoreOf(p) ? ranks.get(prev.id)! : i + 1);
    });
    return ranks;
  }

  private finishGame() {
    const item = this.playlist[this.currentIndex];
    this.game?.destroy();
    this.game = null;

    const before = (p: Player) => this.scoresBeforeGame.get(p.id) ?? 0;
    const prevRanks = this.ranking(before);
    const ranks = this.ranking((p) => p.score);
    this.scoreboard = [...this.players.values()]
      .map((p) => ({
        playerId: p.id,
        score: p.score,
        previousScore: before(p),
        rank: ranks.get(p.id)!,
        previousRank: prevRanks.get(p.id)!,
        gained: p.score - before(p),
      }))
      .sort((a, b) => a.rank - b.rank);

    this.history.push({
      gameId: item.gameId,
      top: [...this.scoreboard]
        .filter((r) => r.gained > 0)
        .sort((a, b) => b.gained - a.gained)
        .slice(0, 3)
        .map((r) => ({ playerId: r.playerId, points: r.gained })),
    });

    const isLast = this.currentIndex >= this.playlist.length - 1;
    this.phase = isLast ? 'ended' : 'scoreboard';
    if (!isLast) this.nextTimer = setTimeout(() => this.next(this.hostId), SCOREBOARD_AUTO_NEXT_MS);
    this.sync();
  }

  next(byId: string) {
    if (byId !== this.hostId || this.phase !== 'scoreboard') return;
    this.startGame(this.currentIndex + 1);
  }

  backToLobby(byId: string) {
    if (byId !== this.hostId) return;
    clearTimeout(this.nextTimer);
    this.game?.destroy();
    this.game = null;
    this.phase = 'lobby';
    this.currentIndex = -1;
    this.scoreboard = null;
    for (const p of this.players.values()) p.score = 0;
    this.sync();
  }

  /* ---------------- Jeu ---------------- */

  gameAction(playerId: string, action: GameAction) {
    if (this.phase !== 'playing' || !this.game || !action || typeof action !== 'object') return;
    this.touch();
    this.game.onAction(playerId, action);
  }

  skip(byId: string) {
    if (byId !== this.hostId || !this.game) return;
    this.game.skip();
  }

  /* ---------------- Synchronisation ---------------- */

  snapshot(): RoomSnapshot {
    return {
      code: this.code,
      phase: this.phase,
      hostId: this.hostId,
      players: [...this.players.values()]
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map((p) => ({
          id: p.id,
          nickname: p.nickname,
          emoji: p.emoji,
          color: p.color,
          score: p.score,
          connected: !!p.socket,
          isHost: p.id === this.hostId,
        })),
      playlist: this.playlist,
      currentIndex: this.currentIndex,
      scoreboard: this.scoreboard,
      history: this.history,
      availability: availabilityMap(),
      maxPlayers: MAX_PLAYERS,
    };
  }

  sync() {
    if (this.syncQueued) return;
    this.syncQueued = true;
    queueMicrotask(() => {
      this.syncQueued = false;
      const room = this.snapshot();
      const serverNow = Date.now();
      for (const p of this.players.values()) {
        if (!p.socket) continue;
        p.socket.send('room:sync', { room, game: this.game?.view(p.id) ?? null, you: p.id, serverNow });
      }
    });
  }

  touch() {
    this.lastActivity = Date.now();
  }

  destroy() {
    clearTimeout(this.nextTimer);
    this.game?.destroy();
    this.game = null;
    for (const p of this.players.values()) if (p.removeTimer) clearTimeout(p.removeTimer);
  }
}
