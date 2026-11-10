'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { leaveRoom } from '@/lib/net';
import { useClientState } from '@/lib/store';

export function RoomHeader() {
  const router = useRouter();
  const { sync, status } = useClientState();
  const [copied, setCopied] = useState(false);
  if (!sync) return null;
  const { room } = sync;
  const online = room.players.filter((p) => p.connected).length;

  async function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}?salle=${room.code}`;
    try {
      if (navigator.share && /Mobi/i.test(navigator.userAgent)) await navigator.share({ title: 'PartyHub', url });
      else await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* annulé */
    }
  }

  return (
    <header className="sticky top-0 z-30 -mx-3 mb-4 flex items-center justify-between gap-2 border-b border-white/5 bg-ink-950/70 px-3 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
      <Logo small />
      <div className="flex items-center gap-2">
        <button
          onClick={copyLink}
          className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 transition hover:bg-white/10"
          title="Copier le lien d’invitation"
        >
          <span className="hidden text-xs text-zinc-400 sm:inline">Code</span>
          <span className="font-mono text-base font-extrabold tracking-widest">{room.code}</span>
          <span className="text-xs">{copied ? '✅' : '🔗'}</span>
        </button>
        <span className="hidden items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5 text-sm text-zinc-300 sm:flex">
          <span className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-emerald-400' : 'animate-pulse bg-amber-400'}`} />
          {online}/{room.maxPlayers}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            leaveRoom();
            router.replace('/');
          }}
        >
          Quitter
        </Button>
      </div>
    </header>
  );
}
