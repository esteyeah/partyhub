'use client';

import { GAME_CATALOG } from '@shared/catalog';
import { Button } from '@/components/ui/Button';
import { GAME_VIEWS } from '@/games/registry';
import { skipStep } from '@/lib/net';
import { useClientState } from '@/lib/store';

/** Affiche le mini-jeu en cours grâce au registre des vues client. */
export function GameStage() {
  const { sync } = useClientState();
  if (!sync) return null;
  const { room, game, you } = sync;
  const item = room.playlist[room.currentIndex];
  const meta = GAME_CATALOG[item.gameId];
  const View = GAME_VIEWS[item.gameId];
  const isHost = room.hostId === you;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${meta.gradient} text-xl shadow-lg`}>
            {meta.emoji}
          </span>
          <div>
            <div className="font-bold leading-tight">{meta.name}</div>
            <div className="text-xs text-zinc-500">
              Jeu {room.currentIndex + 1}/{room.playlist.length}
            </div>
          </div>
        </div>
        {isHost && game && (
          <Button variant="secondary" size="sm" onClick={skipStep} title="Passer à l’étape suivante">
            ⏭ Passer
          </Button>
        )}
      </div>
      {game && game.gameId === item.gameId ? (
        <View view={game} room={room} you={you} />
      ) : (
        <div className="panel flex h-64 items-center justify-center text-zinc-400">Chargement du jeu…</div>
      )}
    </div>
  );
}
