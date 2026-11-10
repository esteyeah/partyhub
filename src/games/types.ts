import type { ComponentType } from 'react';
import type { AnyGameView, RoomSnapshot } from '@shared/types';

export interface GameViewProps<V extends AnyGameView = AnyGameView> {
  view: V;
  room: RoomSnapshot;
  you: string;
}

export type GameViewComponent = ComponentType<GameViewProps<any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
