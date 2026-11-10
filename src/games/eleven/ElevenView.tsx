'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { ElevenSlot, ElevenView as View, FootPos, Footballer, PlayerPublic } from '@shared/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { TimerRing } from '@/components/ui/Timer';
import { sendAction } from '@/lib/net';
import type { GameViewProps } from '../types';

const POS_LABEL: Record<FootPos, string> = { GK: 'Gardiens', DEF: 'Défenseurs', MID: 'Milieux', ATT: 'Attaquants' };
const POS_SHORT: Record<FootPos, string> = { GK: 'G', DEF: 'D', MID: 'M', ATT: 'A' };
const POS_COLOR: Record<FootPos, string> = {
  GK: 'bg-amber-500/20 text-amber-200',
  DEF: 'bg-sky-500/20 text-sky-200',
  MID: 'bg-emerald-500/20 text-emerald-200',
  ATT: 'bg-rose-500/20 text-rose-200',
};

const shortName = (name: string) => {
  const parts = name.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : name;
};

function ratingClass(r: number) {
  if (r >= 89) return 'from-amber-300 to-yellow-500 text-black';
  if (r >= 86) return 'from-zinc-100 to-zinc-300 text-black';
  if (r >= 83) return 'from-orange-300 to-amber-600 text-black';
  return 'from-zinc-500 to-zinc-700 text-white';
}

export function ElevenView({ view, room, you }: GameViewProps<View>) {
  if (view.phase === 'reveal') return <ElevenReveal view={view} players={room.players} you={you} />;
  return <ElevenBuilder view={view} players={room.players} you={you} />;
}

/* ------------------------------------------------------------------ */
/* Construction de l'équipe                                            */
/* ------------------------------------------------------------------ */

function ElevenBuilder({ view, players, you }: { view: View; players: PlayerPublic[]; you: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [filter, setFilter] = useState<FootPos | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'rating' | 'price'>('rating');
  const [hint, setHint] = useState<string | null>(null);

  const byId = useMemo(() => new Map(view.pool.map((p) => [p.id, p])), [view.pool]);
  const { picks, spent, submitted } = view.me;
  const remaining = view.challenge.budget - spent;
  const filled = picks.filter(Boolean).length;
  const activePos = selected !== null ? view.slots[selected].pos : filter === 'ALL' ? null : filter;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return view.pool
      .filter((p) => !activePos || p.pos === activePos)
      .filter((p) => !q || `${p.name} ${p.club} ${p.nat}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q))
      .sort((a, b) => (sort === 'rating' ? b.rating - a.rating || a.price - b.price : a.price - b.price || b.rating - a.rating));
  }, [view.pool, activePos, query, sort]);

  function priceLimitFor(slot: number) {
    const current = picks[slot] ? byId.get(picks[slot]!)?.price ?? 0 : 0;
    return remaining + current;
  }

  function place(fb: Footballer, slot?: number) {
    if (submitted) return;
    setHint(null);
    let target = slot ?? selected ?? undefined;
    if (target !== undefined && view.slots[target].pos !== fb.pos) target = undefined;
    if (target === undefined) target = view.slots.findIndex((s, i) => s.pos === fb.pos && !picks[i]);
    if (target === -1 || target === undefined) {
      setHint(`Tous les postes « ${POS_LABEL[fb.pos].toLowerCase()} » sont pris : clique sur un joueur du terrain pour le remplacer.`);
      return;
    }
    if (fb.price > priceLimitFor(target)) {
      setHint(`Budget insuffisant pour ${fb.name} (${fb.price} M€).`);
      return;
    }
    sendAction({ type: 'pick', slot: target, footballerId: fb.id });
    setSelected(null);
  }

  const budgetPct = Math.min(100, (spent / view.challenge.budget) * 100);

  return (
    <div className="space-y-4">
      {/* En-tête du défi */}
      <div className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black">{view.challenge.name}</h2>
            <span className="rounded-lg bg-white/5 px-2 py-0.5 font-mono text-xs text-zinc-400">{view.formation}</span>
          </div>
          <p className="mt-0.5 text-sm text-zinc-400">{view.challenge.description}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {view.challenge.bonuses.map((b) => (
              <span key={b.label} className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-200">
                +{b.value} · {b.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-44">
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-zinc-400">Budget</span>
              <span className={`font-mono font-bold ${remaining < 0 ? 'text-rose-300' : 'text-white'}`}>
                {spent} / {view.challenge.budget} M€
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                animate={{ width: `${budgetPct}%` }}
                className={`h-full rounded-full ${budgetPct > 90 ? 'bg-rose-400' : budgetPct > 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
              />
            </div>
            <div className="mt-1 text-right text-xs text-zinc-500">Reste {remaining} M€</div>
          </div>
          <TimerRing endsAt={view.endsAt} durationMs={view.durationMs} size={56} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Terrain */}
        <div className="space-y-3">
          <Pitch
            slots={view.slots}
            picks={picks}
            byId={byId}
            selected={selected}
            onSlotClick={(i) => !submitted && setSelected(selected === i ? null : i)}
            onClear={(i) => !submitted && sendAction({ type: 'clear', slot: i })}
            onDropPlayer={(i, id) => {
              const fb = byId.get(id);
              if (fb) place(fb, i);
            }}
            disabled={submitted}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-zinc-400">
              <b className="text-white">{filled}</b>/{view.slots.length} joueurs ·{' '}
              {selected !== null ? `Poste ${view.slots[selected].label} sélectionné` : 'Clique un poste ou glisse un joueur'}
            </span>
            <Button
              variant={submitted ? 'secondary' : 'success'}
              disabled={!submitted && filled < view.slots.length}
              onClick={() => sendAction({ type: 'submit', value: !submitted })}
            >
              {submitted ? '✏️ Modifier mon équipe' : '✅ Valider mon 11'}
            </Button>
          </div>
          <AnimatePresence>
            {hint && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                {hint}
              </motion.p>
            )}
          </AnimatePresence>
          <BuildProgress view={view} players={players} you={you} />
        </div>

        {/* Liste des joueurs */}
        <div className="panel flex max-h-[78vh] flex-col overflow-hidden">
          <div className="space-y-2 border-b border-white/5 p-3">
            <input className="input py-2 text-sm" placeholder="Rechercher un joueur, un club…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="flex items-center gap-1.5">
              {(['ALL', 'GK', 'DEF', 'MID', 'ATT'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setSelected(null);
                  }}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                    (activePos ?? 'ALL') === f ? 'bg-white/15 text-white' : 'bg-white/[0.03] text-zinc-400 hover:bg-white/8'
                  }`}
                >
                  {f === 'ALL' ? 'Tous' : POS_SHORT[f]}
                </button>
              ))}
              <select value={sort} onChange={(e) => setSort(e.target.value as 'rating' | 'price')} className="rounded-lg bg-white/[0.05] px-2 py-1.5 text-xs outline-none">
                <option value="rating">Note ↓</option>
                <option value="price">Prix ↑</option>
              </select>
            </div>
          </div>
          <ul className="flex-1 space-y-1 overflow-y-auto p-2">
            {list.map((p) => {
              const used = picks.includes(p.id);
              const limit = selected !== null ? priceLimitFor(selected) : remaining;
              const tooExpensive = !used && p.price > limit;
              return (
                <li key={p.id}>
                  <button
                    draggable={!used && !submitted}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
                    disabled={used || submitted}
                    onClick={() => place(p)}
                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${
                      used ? 'opacity-40' : tooExpensive ? 'opacity-50 hover:bg-rose-500/10' : 'hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br font-mono text-sm font-black ${ratingClass(p.rating)}`}>
                      {p.rating}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {p.flag} {p.name}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">{p.club}</span>
                    </span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${POS_COLOR[p.pos]}`}>{POS_SHORT[p.pos]}</span>
                    <span className={`w-14 text-right font-mono text-sm font-bold ${tooExpensive ? 'text-rose-300' : 'text-zinc-200'}`}>
                      {used ? '✓' : `${p.price}M`}
                    </span>
                  </button>
                </li>
              );
            })}
            {!list.length && <li className="p-6 text-center text-sm text-zinc-500">Aucun joueur</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Terrain                                                             */
/* ------------------------------------------------------------------ */

function Pitch({
  slots,
  picks,
  byId,
  selected = null,
  onSlotClick,
  onClear,
  onDropPlayer,
  disabled = false,
  compact = false,
}: {
  slots: ElevenSlot[];
  picks: (string | null)[];
  byId: Map<string, Footballer>;
  selected?: number | null;
  onSlotClick?: (i: number) => void;
  onClear?: (i: number) => void;
  onDropPlayer?: (i: number, footballerId: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [over, setOver] = useState<number | null>(null);
  return (
    <div className={`pitch relative w-full overflow-hidden rounded-3xl border border-emerald-300/10 shadow-inner ${compact ? 'aspect-[4/5]' : 'aspect-[4/5] sm:aspect-[5/4]'}`}>
      {/* lignes du terrain */}
      <div className="pointer-events-none absolute inset-3 rounded-2xl border-2 border-white/15" />
      <div className="pointer-events-none absolute inset-x-3 top-1/2 h-0 border-t-2 border-white/15" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/15" style={{ aspectRatio: '1' }} />
      <div className="pointer-events-none absolute bottom-3 left-1/2 h-[14%] w-[40%] -translate-x-1/2 border-2 border-b-0 border-white/15" />
      <div className="pointer-events-none absolute left-1/2 top-3 h-[14%] w-[40%] -translate-x-1/2 border-2 border-t-0 border-white/15" />

      {slots.map((slot, i) => {
        const fb = picks[i] ? byId.get(picks[i]!) : undefined;
        const isSel = selected === i;
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            onDragOver={(e) => {
              if (disabled || !onDropPlayer) return;
              e.preventDefault();
              setOver(i);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData('text/plain');
              if (id) onDropPlayer?.(i, id);
            }}
          >
            <button
              type="button"
              disabled={!onSlotClick || disabled}
              onClick={() => onSlotClick?.(i)}
              className={`group relative flex flex-col items-center ${compact ? 'w-12' : 'w-16 sm:w-20'}`}
            >
              <AnimatePresence mode="popLayout">
                {fb ? (
                  <motion.span
                    key={fb.id}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className={`flex flex-col items-center justify-center rounded-xl bg-gradient-to-b shadow-lg ${ratingClass(fb.rating)} ${
                      compact ? 'h-9 w-9 text-xs' : 'h-12 w-12 text-base sm:h-14 sm:w-14'
                    } ${isSel || over === i ? 'ring-4 ring-fuchsia-400' : ''}`}
                  >
                    <span className="font-mono font-black leading-none">{fb.rating}</span>
                    {!compact && <span className="text-[10px] leading-none opacity-70">{fb.flag}</span>}
                  </motion.span>
                ) : (
                  <motion.span
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`flex items-center justify-center rounded-xl border-2 border-dashed font-bold ${
                      compact ? 'h-9 w-9 text-[10px]' : 'h-12 w-12 text-xs sm:h-14 sm:w-14'
                    } ${isSel || over === i ? 'border-fuchsia-300 bg-fuchsia-500/25 text-white' : 'border-white/30 bg-black/20 text-white/70 group-hover:border-white/60'}`}
                  >
                    {slot.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {(fb || compact) && (
                <span className={`mt-1 max-w-full truncate rounded-md bg-black/50 px-1.5 py-0.5 font-semibold leading-tight ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
                  {fb ? shortName(fb.name) : '—'}
                </span>
              )}
              {!compact && fb && !disabled && onClear && (
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear(i);
                  }}
                  className="absolute -right-0.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow group-hover:flex"
                >
                  ✕
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function BuildProgress({ view, players, you }: { view: View; players: PlayerPublic[]; you: string }) {
  return (
    <div className="panel flex flex-wrap gap-2 p-3">
      {players.map((p) => {
        const pr = view.progress[p.id];
        return (
          <span key={p.id} className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm ${p.id === you ? 'bg-white/[0.06]' : 'bg-white/[0.02]'}`}>
            <Avatar player={p} size="xs" />
            <span className="max-w-24 truncate">{p.nickname}</span>
            <span className="font-mono text-xs text-zinc-400">{pr?.filled ?? 0}/{view.slots.length}</span>
            {pr?.submitted && <span>✅</span>}
          </span>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Résultats                                                           */
/* ------------------------------------------------------------------ */

function ElevenReveal({ view, players, you }: { view: View; players: PlayerPublic[]; you: string }) {
  const byId = useMemo(() => new Map(view.pool.map((p) => [p.id, p])), [view.pool]);
  const playersById = new Map(players.map((p) => [p.id, p]));
  return (
    <div className="space-y-4">
      <div className="panel flex items-center justify-between p-5">
        <div>
          <h2 className="text-2xl font-black">Les compos sont tombées ⚽</h2>
          <p className="text-sm text-zinc-400">
            Note = moyenne des 11 (poste vide = 0) + bonus du défi « {view.challenge.name} ». Points = note × 10, +200 pour le meilleur 11.
          </p>
        </div>
        <TimerRing endsAt={view.endsAt} durationMs={view.durationMs} size={52} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {view.results?.map((r, i) => {
          const p = playersById.get(r.playerId);
          if (!p) return null;
          return (
            <motion.div
              key={r.playerId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className={`panel overflow-hidden ${r.best ? 'ring-2 ring-amber-300/70' : ''} ${r.playerId === you ? 'border-fuchsia-400/30' : ''}`}
            >
              <div className="flex items-center gap-3 p-4">
                <span className="font-mono text-lg font-black text-zinc-500">#{i + 1}</span>
                <Avatar player={p} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">
                    {p.nickname} {r.best && '🏆'}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Moyenne {r.average} · {r.spent} M€ {r.complete ? '' : '· ⚠️ incomplète'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-3xl font-black text-gradient">{r.note}</div>
                  <div className="font-mono text-xs font-bold text-emerald-300">+{r.points} pts</div>
                </div>
              </div>
              <div className="px-4">
                <Pitch slots={view.slots} picks={r.picks} byId={byId} compact />
              </div>
              <ul className="space-y-1 p-4 text-xs">
                {r.bonuses.map((b) => (
                  <li key={b.label} className={b.ok ? 'text-emerald-300' : 'text-zinc-600 line-through'}>
                    {b.ok ? '✔' : '✘'} {b.label} (+{b.value})
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
