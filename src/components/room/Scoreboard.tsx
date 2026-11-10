'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { GAME_CATALOG } from '@shared/catalog';
import type { PlayerPublic, ScoreRow } from '@shared/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useCountUp } from '@/lib/hooks';
import { nextGame } from '@/lib/net';
import { useClientState } from '@/lib/store';

/** Classement animé affiché entre deux mini-jeux. */
export function Scoreboard() {
  const { sync } = useClientState();
  if (!sync?.room.scoreboard) return null;
  const { room, you } = sync;
  const finished = GAME_CATALOG[room.playlist[room.currentIndex].gameId];
  const upcoming = room.playlist[room.currentIndex + 1];
  const next = upcoming ? GAME_CATALOG[upcoming.gameId] : null;

  return (
    <div className="mx-auto max-w-2xl py-4">
      <div className="mb-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
          {finished.emoji} {finished.name} — terminé
        </p>
        <h2 className="mt-2 text-4xl font-black">Classement</h2>
      </div>
      <AnimatedRanking rows={room.scoreboard!} players={room.players} you={you} />
      <div className="mt-8 flex flex-col items-center gap-3">
        {next && (
          <p className="text-zinc-400">
            Prochain jeu : <span className="font-bold text-white">{next.emoji} {next.name}</span>
          </p>
        )}
        {room.hostId === you ? (
          <Button size="lg" onClick={nextGame}>
            Jeu suivant →
          </Button>
        ) : (
          <p className="text-sm text-zinc-500">L’hôte lance le jeu suivant (automatique dans quelques secondes)…</p>
        )}
      </div>
    </div>
  );
}

export function AnimatedRanking({ rows, players, you }: { rows: ScoreRow[]; players: PlayerPublic[]; you: string }) {
  // On affiche d'abord l'ancien classement, puis on anime vers le nouveau.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 900);
    return () => clearTimeout(t);
  }, []);
  const ordered = [...rows].sort((a, b) =>
    revealed ? a.rank - b.rank || b.score - a.score : a.previousRank - b.previousRank || b.previousScore - a.previousScore,
  );
  const byId = new Map(players.map((p) => [p.id, p]));

  return (
    <ul className="space-y-2.5">
      {ordered.map((row, i) => {
        const p = byId.get(row.playerId);
        if (!p) return null;
        const moved = row.previousRank - row.rank;
        return (
          <motion.li
            key={row.playerId}
            layout
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
              row.playerId === you ? 'border-fuchsia-400/40 bg-fuchsia-500/10' : 'border-white/8 bg-ink-850/80'
            }`}
          >
            <span className={`w-8 text-center font-mono text-xl font-extrabold ${i === 0 ? 'text-amber-300' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-orange-400' : 'text-zinc-500'}`}>
              {revealed ? row.rank : row.previousRank}
            </span>
            <Avatar player={p} size="sm" />
            <span className="flex-1 truncate font-bold">{p.nickname}</span>
            {revealed && moved !== 0 && (
              <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className={`text-sm font-bold ${moved > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {moved > 0 ? `▲${moved}` : `▼${-moved}`}
              </motion.span>
            )}
            {row.gained > 0 && (
              <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 font-mono text-sm font-bold text-emerald-300">+{row.gained}</span>
            )}
            <Score from={row.previousScore} to={row.score} delay={revealed ? 0 : 99999} />
          </motion.li>
        );
      })}
    </ul>
  );
}

function Score({ from, to, delay }: { from: number; to: number; delay: number }) {
  const v = useCountUp(to, from, 1200, delay);
  return <span className="w-20 text-right font-mono text-lg font-extrabold">{v}</span>;
}
