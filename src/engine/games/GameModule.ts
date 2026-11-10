import type { AnyGameView, GameAction, GameSettings } from '@shared/types';

export interface GamePlayer {
  id: string;
  nickname: string;
  connected: boolean;
}

/** Ce que le salon met à disposition d'un mini-jeu. */
export interface GameContext {
  /** Joueurs actuellement dans le salon */
  players(): GamePlayer[];
  nickname(playerId: string): string;
  /** Ajoute des points au score global du joueur */
  addScore(playerId: string, points: number): void;
  /** Demande une resynchronisation des clients (regroupée automatiquement) */
  sync(): void;
  /** Le mini-jeu est terminé : le salon affiche le classement */
  finish(): void;
}

/**
 * Classe de base de tout mini-jeu.
 * Un jeu est un petit automate côté serveur : il reçoit des actions,
 * gère ses timers et expose une "vue" personnalisée par joueur.
 */
export abstract class GameModule<S extends GameSettings = GameSettings> {
  private timers = new Set<ReturnType<typeof setTimeout>>();
  protected destroyed = false;

  constructor(protected ctx: GameContext, protected settings: S) {}

  abstract start(): void | Promise<void>;
  abstract onAction(playerId: string, action: GameAction): void;
  abstract view(playerId: string): AnyGameView;

  /** L'hôte force le passage à l'étape suivante */
  skip(): void {}
  onPlayerJoin(_playerId: string): void {}
  onPlayerLeave(_playerId: string): void {}

  protected now(): number {
    return Date.now();
  }

  protected setTimer(ms: number, fn: () => void): ReturnType<typeof setTimeout> {
    const t = setTimeout(() => {
      this.timers.delete(t);
      if (!this.destroyed) fn();
    }, ms);
    this.timers.add(t);
    return t;
  }

  protected clearTimers(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }

  destroy(): void {
    this.destroyed = true;
    this.clearTimers();
  }
}

/** Points dégressifs selon la rapidité : de `max` (instantané) à `max * floor` (dernière seconde). */
export function speedPoints(ms: number, durationMs: number, max = 1000, floor = 0.5): number {
  const ratio = Math.min(1, Math.max(0, ms / durationMs));
  return Math.round(max * (1 - (1 - floor) * ratio));
}
