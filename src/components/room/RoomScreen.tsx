'use client';

import { useEffect, useState } from 'react';
import { loadSession } from '@/lib/session';
import { getSocket } from '@/lib/socket';
import { useClientState } from '@/lib/store';
import { EndScreen } from './EndScreen';
import { GameStage } from './GameStage';
import { JoinCard } from './JoinCard';
import { Lobby } from './Lobby';
import { RoomHeader } from './RoomHeader';
import { Scoreboard } from './Scoreboard';

export function RoomScreen({ code }: { code: string }) {
  const { sync, status, notice } = useClientState();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    getSocket();
    setMounted(true);
  }, []);

  if (!mounted) return <Splash text="Chargement…" />;

  const inThisRoom = sync && sync.room.code === code;
  if (!inThisRoom) {
    const session = loadSession();
    if (session?.code === code && !notice) return <Splash text={status === 'connected' ? 'Connexion au salon…' : 'Connexion au serveur…'} />;
    return <JoinCard code={code} />;
  }

  const { room } = sync;
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-3 pb-6 sm:px-6">
      <RoomHeader />
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
