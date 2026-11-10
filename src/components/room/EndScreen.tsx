'use client';

import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { GAME_CATALOG } from '@shared/catalog';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { backToLobby, leaveRoom } from '@/lib/net';
import { useClientState } from '@/lib/store';

const PODIUM = [
  { place: 2, height: 'h-28 sm:h-36', color: 'from-zinc-300/30 to-zinc-500/10', medal: '🥈', delay: 0.6 },
  { place: 1, height: 'h-40 sm:h-52', color: 'from-amber-300/40 to-amber-600/10', medal: '🥇', delay: 1.2 },
  { place: 3, height: 'h-20 sm:h-28', color: 'from-orange-400/30 to-orange-700/10', medal: '🥉', delay: 0.2 },
];

export function EndScreen() {
  const router = useRouter();
  const { sync } = useClientState();

  useEffect(() => {
    const t = setTimeout(() => {
      const fire = (x: number) => confetti({ particleCount: 90, spread: 70, startVelocity: 45, origin: { x, y: 0.7 } });
      fire(0.25);
      fire(0.75);
      setTimeout(() => fire(0.5), 400);
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  if (!sync) return null;
  const { room, you } = sync;
  const ranked = [...room.players].sort((a, b) => b.score - a.score);
  const byId = new Map(room.players.map((p) => [p.id, p]));
  const winner = ranked[0];

  return (
    <div className="mx-auto max-w-3xl py-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Fin de la partie</p>
        <h2 className="mt-2 text-4xl font-black sm:text-5xl">
          👑 <span className="text-gradient">{winner?.nickname}</span> l’emporte !
        </h2>
      </motion.div>

      {/* Podium */}
      <div className="mt-10 grid grid-cols-3 items-end gap-3 sm:gap-5">
        {PODIUM.map(({ place, height, color, medal, delay }) => {
          const p = ranked[place - 1];
          return (
            <div key={place} className="flex flex-col items-center">
              {p && (
                <motion.div initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: delay + 0.3, type: 'spring' }} className="mb-3 flex flex-col items-center">
                  {place === 1 && <span className="mb-1 animate-float text-3xl">👑</span>}
                  <Avatar player={p} size={place === 1 ? 'xl' : 'lg'} />
                  <span className="mt-2 max-w-full truncate font-bold">{p.nickname}</span>
                  <span className="font-mono text-sm text-zinc-400">{p.score} pts</span>
                </motion.div>
              )}
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay, duration: 0.5, ease: 'easeOut' }}
                style={{ transformOrigin: 'bottom' }}
                className={`flex w-full ${height} items-start justify-center rounded-t-2xl border border-white/10 bg-gradient-to-b ${color} pt-3 text-4xl`}
              >
                {p ? medal : ''}
              </motion.div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <div className="panel p-5">
          <h3 className="mb-3 font-bold">Classement final</h3>
          <ol className="space-y-1.5">
            {ranked.map((p, i) => (
              <li key={p.id} className={`flex items-center gap-3 rounded-xl px-2 py-1.5 ${p.id === you ? 'bg-fuchsia-500/10' : ''}`}>
                <span className="w-6 text-center font-mono font-bold text-zinc-500">{i + 1}</span>
                <Avatar player={p} size="xs" />
                <span className="flex-1 truncate">{p.nickname}</span>
                <span className="font-mono font-bold">{p.score}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="panel p-5">
          <h3 className="mb-3 font-bold">Récap des mini-jeux</h3>
          <ul className="space-y-3">
            {room.history.map((h, i) => {
              const g = GAME_CATALOG[h.gameId];
              return (
                <li key={i} className="rounded-xl bg-white/[0.03] p-3">
                  <div className="mb-2 text-sm font-semibold">
                    {g.emoji} {g.name}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {h.top.map((t, j) => {
                      const p = byId.get(t.playerId);
                      return p ? (
                        <span key={t.playerId} className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 text-xs">
                          {['🥇', '🥈', '🥉'][j]} {p.nickname} <span className="font-mono text-zinc-400">+{t.points}</span>
                        </span>
                      ) : null;
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {room.hostId === you && (
          <Button size="lg" onClick={backToLobby}>
            🔁 Rejouer
          </Button>
        )}
        <Button
          size="lg"
          variant="secondary"
          onClick={() => {
            leaveRoom();
            router.replace('/');
          }}
        >
          Quitter le salon
        </Button>
      </div>
    </div>
  );
}
