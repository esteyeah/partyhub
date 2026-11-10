'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { GAME_CATALOG, GAME_IDS, defaultSettings, type SettingField } from '@shared/catalog';
import type { GameId, PlaylistItem, SettingValue } from '@shared/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { kickPlayer, setPlaylist, startGame } from '@/lib/net';
import { useClientState } from '@/lib/store';

const uid = () => Math.random().toString(36).slice(2, 8);

export function Lobby() {
  const { sync } = useClientState();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  if (!sync) return null;
  const { room, you } = sync;
  const isHost = room.hostId === you;
  const playlist = room.playlist;

  const update = (next: PlaylistItem[]) => setPlaylist(next);
  const add = (gameId: GameId) => update([...playlist, { uid: uid(), gameId, settings: defaultSettings(gameId) }]);
  const available = GAME_IDS.filter((id) => room.availability[id]?.available);

  async function launch() {
    setStarting(true);
    setError(null);
    const res = await startGame();
    setStarting(false);
    if (!res.ok) setError(res.error);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      {/* ------- Joueurs ------- */}
      <section className="space-y-5">
        <div className="panel relative overflow-hidden p-6 text-center">
          <div className="absolute inset-x-0 -top-24 mx-auto h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <p className="relative text-sm text-zinc-400">Code du salon</p>
          <p className="relative mt-1 font-mono text-5xl font-extrabold tracking-[0.25em] text-gradient">{room.code}</p>
          <p className="relative mt-2 text-xs text-zinc-500">Partage ce code ou le lien 🔗 en haut de l’écran</p>
          {isHost && (
            <p className="relative mt-3 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
              💡 La partie tourne dans ton onglet : garde-le ouvert jusqu’à la fin.
            </p>
          )}
        </div>

        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Joueurs</h2>
            <span className="rounded-lg bg-white/5 px-2 py-0.5 text-sm text-zinc-400">
              {room.players.length}/{room.maxPlayers}
            </span>
          </div>
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {room.players.map((p) => (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${p.id === you ? 'bg-white/[0.06] ring-1 ring-white/10' : ''}`}
                >
                  <Avatar player={p} size="sm" showHost />
                  <span className="flex-1 truncate font-semibold">
                    {p.nickname}
                    {p.id === you && <span className="ml-1.5 text-xs font-normal text-zinc-500">(toi)</span>}
                  </span>
                  {!p.connected && <span className="text-xs text-amber-400">reconnexion…</span>}
                  {isHost && p.id !== you && (
                    <button
                      onClick={() => kickPlayer(p.id)}
                      className="rounded-lg px-2 py-1 text-xs text-zinc-500 transition hover:bg-rose-500/15 hover:text-rose-300"
                      title="Exclure"
                    >
                      ✕
                    </button>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {room.players.length < 2 && (
            <p className="mt-4 rounded-xl bg-white/[0.03] p-3 text-center text-sm text-zinc-400">
              En attente de tes amis… <span className="inline-block animate-bounce">👀</span>
              <br />
              <span className="text-xs text-zinc-500">Astuce : ouvre un 2ᵉ onglet pour tester seul.</span>
            </p>
          )}
        </div>
      </section>

      {/* ------- Programme ------- */}
      <section className="panel flex flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Programme de la partie</h2>
            <p className="text-sm text-zinc-400">
              {isHost ? 'Ajoute des mini-jeux, règle-les et lance quand tout le monde est là.' : 'L’hôte prépare la partie…'}
            </p>
          </div>
          {isHost && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  update(
                    (['quiz', 'blindtest', 'eleven'] as GameId[])
                      .filter((id) => available.includes(id))
                      .map((gameId) => ({
                        uid: uid(),
                        gameId,
                        settings: { ...defaultSettings(gameId), ...(gameId === 'eleven' ? { time: '15' } : { rounds: 5 }) },
                      })),
                  )
                }
              >
                ⚡ Partie express
              </Button>
              {playlist.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => update([])}>
                  Vider
                </Button>
              )}
            </div>
          )}
        </div>

        {isHost && (
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
            {GAME_IDS.map((id) => {
              const g = GAME_CATALOG[id];
              const av = room.availability[id];
              return (
                <button
                  key={id}
                  disabled={!av?.available}
                  onClick={() => add(id)}
                  title={av?.reason ?? g.description}
                  className="group relative overflow-hidden rounded-2xl border border-white/8 bg-ink-900 p-3 text-left transition hover:-translate-y-0.5 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${g.gradient} opacity-0 transition group-hover:opacity-15`} />
                  <div className="flex items-start justify-between">
                    <span className="text-2xl">{g.emoji}</span>
                    <span className="rounded-lg bg-white/10 px-1.5 text-sm font-bold opacity-0 transition group-hover:opacity-100">+</span>
                  </div>
                  <div className="mt-1.5 text-sm font-bold leading-tight">{g.name}</div>
                  <div className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">{av?.available ? g.tagline : av?.reason}</div>
                </button>
              );
            })}
          </div>
        )}

        <ol className="mt-5 flex-1 space-y-2.5">
          <AnimatePresence initial={false}>
            {playlist.map((item, i) => (
              <motion.li
                key={item.uid}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <PlaylistRow
                  item={item}
                  index={i}
                  count={playlist.length}
                  editable={isHost}
                  onChange={(next) => update(playlist.map((x) => (x.uid === item.uid ? next : x)))}
                  onRemove={() => update(playlist.filter((x) => x.uid !== item.uid))}
                  onMove={(dir) => {
                    const next = [...playlist];
                    const j = i + dir;
                    [next[i], next[j]] = [next[j], next[i]];
                    update(next);
                  }}
                />
              </motion.li>
            ))}
          </AnimatePresence>
          {!playlist.length && (
            <li className="flex h-full min-h-32 items-center justify-center rounded-2xl border-2 border-dashed border-white/8 p-6 text-center text-zinc-500">
              {isHost ? 'Clique sur un mini-jeu ci-dessus pour l’ajouter au programme' : 'Aucun jeu sélectionné pour le moment'}
            </li>
          )}
        </ol>

        <div className="mt-6 flex flex-col items-center gap-2 border-t border-white/5 pt-5">
          {error && <p className="text-sm text-rose-300">{error}</p>}
          {isHost ? (
            <Button size="lg" className="w-full sm:w-auto sm:min-w-72" disabled={!playlist.length || starting} onClick={launch}>
              🚀 Lancer la partie
            </Button>
          ) : (
            <p className="flex items-center gap-2 text-zinc-400">
              <span className="h-2 w-2 animate-ping rounded-full bg-fuchsia-400" /> En attente du lancement par l’hôte
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function PlaylistRow({
  item,
  index,
  count,
  editable,
  onChange,
  onRemove,
  onMove,
}: {
  item: PlaylistItem;
  index: number;
  count: number;
  editable: boolean;
  onChange: (item: PlaylistItem) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const g = GAME_CATALOG[item.gameId];
  const set = (key: string, value: SettingValue) => onChange({ ...item, settings: { ...item.settings, [key]: value } });

  return (
    <div className="rounded-2xl border border-white/8 bg-ink-900/80 p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 font-mono text-sm font-bold text-zinc-400">
          {index + 1}
        </span>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${g.gradient} text-xl`}>
          {g.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-bold">{g.name}</div>
          {!editable && (
            <div className="truncate text-xs text-zinc-500">
              {g.settings.map((f) => describe(f, item.settings[f.key])).join(' · ')}
            </div>
          )}
        </div>
        {editable && (
          <div className="flex items-center gap-1">
            <IconBtn disabled={index === 0} onClick={() => onMove(-1)} label="Monter">↑</IconBtn>
            <IconBtn disabled={index === count - 1} onClick={() => onMove(1)} label="Descendre">↓</IconBtn>
            <IconBtn onClick={onRemove} label="Retirer" danger>✕</IconBtn>
          </div>
        )}
      </div>
      {editable && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {g.settings.map((f) => (
            <SettingInput key={f.key} field={f} value={item.settings[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
        </div>
      )}
    </div>
  );
}

function describe(f: SettingField, v: SettingValue | undefined): string {
  if (f.type === 'select') return f.options.find((o) => o.value === v)?.label ?? String(v);
  if (f.type === 'boolean') return `${f.label} : ${v ? 'oui' : 'non'}`;
  return `${v} ${f.label.toLowerCase()}`;
}

function SettingInput({ field, value, onChange }: { field: SettingField; value: SettingValue | undefined; onChange: (v: SettingValue) => void }) {
  const cls = 'w-full rounded-xl border border-white/10 bg-ink-800 px-2.5 py-1.5 text-sm outline-none focus:border-fuchsia-400/60';
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{field.label}</span>
      {field.type === 'select' ? (
        <select className={cls} value={String(value ?? field.default)} onChange={(e) => onChange(e.target.value)}>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === 'number' ? (
        <div className="flex items-center gap-1">
          <button type="button" className="rounded-lg bg-white/5 px-2 py-1.5 text-sm hover:bg-white/10" onClick={() => onChange(Math.max(field.min, Number(value) - 1))}>
            −
          </button>
          <span className="flex-1 text-center font-mono font-bold">{String(value)}</span>
          <button type="button" className="rounded-lg bg-white/5 px-2 py-1.5 text-sm hover:bg-white/10" onClick={() => onChange(Math.min(field.max, Number(value) + 1))}>
            +
          </button>
        </div>
      ) : (
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
      )}
    </label>
  );
}

function IconBtn({ children, onClick, disabled, label, danger }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm text-zinc-400 transition disabled:opacity-20 ${
        danger ? 'hover:bg-rose-500/15 hover:text-rose-300' : 'hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
