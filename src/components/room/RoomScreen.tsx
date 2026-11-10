'use client';

import { useEffect, useState } from 'react';
import { isHosting, resumeSession } from '@/lib/net';
import { useClientState } from '@/lib/store';
import { EndScreen } from './EndScreen';
import { GameStage } from './GameStage';
import { JoinCard } from './JoinCard';
import { Lobby } from './Lobby';
import { RoomHeader } from './RoomHeader';
import { Scoreboard } from './Scoreboard';

export function RoomScreen({ code }: { code: string }) {
  const { sync, status } = useClientState();
  const [mounted, setMounted] = useState(false);
  const inThisRoom = !!sync && sync.room.code === code;

  useEffect(() => {
    setMounted(true);
    resumeSession(code);
  }, [code]);

  // L'hôte héberge la partie dans son onglet : on le prévient avant de le fermer.
  useEffect(() => {
    if (!inThisRoom || !isHosting()) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [inThisRoom]);

  if (!mounted) return <Splash text="Chargement…" />;
  if (!inThisRoom) {
    if (status === 'connecting') return <Splash text="Connexion au salon…" />;
    return <JoinCard code={code} />;
  }

  const { room } = sync;
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-3 pb-6 sm:px-6">
      <RoomHeader />
      {status === 'disconnected' && (
        <div className="mb-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-200">
          Connexion à l’hôte perdue, reconnexion en cours…
        </div>
      )}
      <main className="flex-1">
        {room.phase === 'lobby' && <Lobby />}
        {room.phase === 'playing' && <GameStage />}
        {room.phase === 'scoreboard' && <Scoreboard />}
        {room.phase === 'ended' && <EndScreen />}
      </main>
    </div>
  );
}

function Splash({ text }: { text: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 text-zinc-400">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-fuchsia-400" />
      {text}
    </div>
  );
}
