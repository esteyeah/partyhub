'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { ElevenOutcome, ElevenSlot, ElevenView as View, FootPos, Footballer, PlayerPublic } from '@shared/types';
import { Avatar } from '@/components/ui/Avatar';
import { TimerRing } from '@/components/ui/Timer';
import { CHOICE_STYLES } from '@/lib/colors';
import { sendAction } from '@/lib/net';
import type { GameViewProps } from '../types';

const POS_NAME: Record<FootPos, string> = { GK: 'Gardien', DEF: 'Défenseur', MID: 'Milieu', ATT: 'Attaquant' };

const shortName = (name: string) => {
  const parts = name.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : name;
};

function cardTone(f: Footballer) {
  if (f.id.startsWith('flop-')) return 'from-stone-500 to-stone-700 text-white';
  if (f.rating >= 89) return 'from-amber-200 via-yellow-400 to-amber-600 text-black';
  if (f.rating >= 86) return 'from-zinc-100 to-zinc-400 text-black';
  if (f.rating >= 83) return 'from-orange-300 to-amber-700 text-black';
  return 'from-zinc-500 to-zinc-700 text-white';
}

/* ------------------------------------------------------------------ */

export function ElevenView({ view, room, you }: GameViewProps<View>) {
  const byId = new Map(room.players.map((p) => [p.id, p]));
  if (view.phase === 'final') return <Final view={view} players={byId} you={you} />;

  const slot = view.slots[view.slotIndex];
  const myTeam = view.teams[you];
  const remaining = view.budget - (myTeam?.spent ?? 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        {/* En-tête du poste */}
        <div className="panel flex items-center gap-4 p-4 sm:p-5">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-emerald-500/15 font-black text-emerald-200">
            <span className="text-lg leading-none">{slot.label}</span>
            <span className="text-[10px] font-semibold opacity-70">
              {view.slotIndex + 1}/{view.slots.length}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {view.phase === 'pick' ? 'Choisis ton joueur' : view.phase === 'reveal' ? 'Révélation' : view.phase === 'duel' ? 'Duel !' : 'Résultat'}
            </div>
            <div className="text-xl font-black">{POS_NAME[slot.pos]}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500">Ton budget</div>
            <div className={`font-mono text-xl font-black ${remaining < 20 ? 'text-rose-300' : 'text-white'}`}>{remaining} M€</div>
          </div>
          <TimerRing endsAt={view.endsAt} durationMs={view.durationMs} size={52} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={`${view.slotIndex}-${view.phase}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {view.phase === 'pick' && <PickPhase view={view} remaining={remaining} players={room.players} you={you} />}
            {view.phase === 'reveal' && <RevealPhase view={view} players={byId} />}
            {view.phase === 'duel' && <DuelPhase view={view} players={byId} you={you} />}
            {view.phase === 'resolve' && <ResolvePhase view={view} players={byId} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <aside className="space-y-4">
        <div className="panel p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold">Mon équipe</span>
            <span className="font-mono text-zinc-400">
              {myTeam?.spent ?? 0}/{view.budget} M€
            </span>
          </div>
          <Pitch slots={view.slots} picks={myTeam?.picks ?? view.slots.map(() => null)} current={view.slotIndex} compact />
        </div>
        <TeamsSummary view={view} players={room.players} you={you} />
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Phases                                                              */
/* ------------------------------------------------------------------ */

function PickPhase({ view, remaining, players, you }: { view: View; remaining: number; players: PlayerPublic[]; you: string }) {
  const picked = new Set(view.picked);
  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${view.offers.length >= 5 ? 'grid-cols-2 sm:grid-cols-5' : view.offers.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
        {view.offers.map((f, i) => {
          const tooExpensive = f.price > remaining;
          const selected = view.me.choice === f.id;
          return (
            <motion.div key={f.id} initial={{ opacity: 0, y: 20, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: i * 0.07 }}>
              <FootCard f={f} selected={selected} disabled={tooExpensive} onClick={() => sendAction({ type: 'pick', footballerId: f.id })} />
            </motion.div>
          );
        })}
      </div>
      {!view.offers.some((f) => f.price <= remaining) && (
        <p className="rounded-xl bg-rose-500/10 px-4 py-2 text-center text-sm text-rose-200">Budget insuffisant : tu recevras un remplaçant gratuit…</p>
      )}
      <div className="panel flex flex-wrap items-center gap-2 p-3 text-sm">
        <span className="mr-1 text-zinc-500">{view.me.choice ? 'Choix enregistré, tu peux encore changer.' : 'En attente de ton choix…'}</span>
        {players.map((p) => (
          <span key={p.id} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 ${p.id === you ? 'bg-white/[0.06]' : 'bg-white/[0.02]'}`}>
            <Avatar player={p} size="xs" />
            {picked.has(p.id) ? '✅' : <span className="text-zinc-600">…</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function RevealPhase({ view, players }: { view: View; players: Map<string, PlayerPublic> }) {
  const contested = new Set(view.duels.map((d) => d.footballer.id));
  return (
    <div className="space-y-3">
      {view.duels.length > 0 && (
        <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="rounded-2xl bg-rose-500/15 px-4 py-3 text-center text-lg font-black text-rose-200">
          ⚔️ {view.duels.length > 1 ? `${view.duels.length} duels` : 'Duel'} en approche !
        </motion.p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Object.entries(view.choices ?? {}).map(([pid, fid], i) => {
          const p = players.get(pid);
          const f = view.offers.find((o) => o.id === fid);
          if (!p) return null;
          return (
            <motion.div key={pid} initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ delay: i * 0.15 }} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Avatar player={p} size="xs" /> <span className="truncate">{p.nickname}</span>
                {f && contested.has(f.id) && <span className="ml-auto">⚔️</span>}
              </div>
              {f ? <FootCard f={f} small highlight={contested.has(f.id) ? 'duel' : undefined} /> : <EmptyCard text="Budget épuisé" />}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function DuelPhase({ view, players, you }: { view: View; players: Map<string, PlayerPublic>; you: string }) {
  const q = view.duelQuestion;
  const mine = view.duels.find((d) => d.players.includes(you));
  if (!q) return null;
  return (
    <div className="space-y-4">
      {view.duels.map((d) => (
        <div key={d.footballer.id} className="panel flex items-center gap-4 p-4">
          <div className="w-24 shrink-0">
            <FootCard f={d.footballer} small />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-rose-300">⚔️ Duel pour {d.footballer.name}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {d.players.map((id, i) => {
                const p = players.get(id);
                return p ? (
                  <span key={id} className="flex items-center gap-1.5">
                    {i > 0 && <span className="font-black text-zinc-600">vs</span>}
                    <Avatar player={p} size="sm" />
                    <span className="text-sm font-semibold">{p.nickname}</span>
                    {d.answered.includes(id) && <span title="A répondu">🗳️</span>}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        </div>
      ))}
      <div className="panel p-5 text-center">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Question foot · le plus rapide à trouver gagne</div>
        <h3 className="mt-2 text-xl font-extrabold sm:text-2xl">{q.question}</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {q.choices.map((c, i) => {
          const s = CHOICE_STYLES[i];
          const chosen = view.me.duelChoice === i;
          const canAnswer = !!mine && view.me.duelChoice === null;
          return (
            <button
              key={i}
              disabled={!canAnswer}
              onClick={() => sendAction({ type: 'answer', choice: i })}
              className={`flex min-h-16 items-center gap-3 rounded-2xl px-5 py-3 text-left text-lg font-bold text-white shadow-lg transition ${s.bg} ${
                canAnswer ? `${s.hover} hover:-translate-y-0.5` : ''
              } ${chosen ? 'ring-4 ring-white' : ''} ${!mine ? 'opacity-60' : view.me.duelChoice !== null && !chosen ? 'opacity-35' : ''}`}
            >
              <span className="text-xl opacity-80">{s.shape}</span>
              {c}
            </button>
          );
        })}
      </div>
      {!mine && <p className="text-center text-sm text-zinc-500">Tu n’es pas concerné : regarde le duel 🍿</p>}
    </div>
  );
}

const HOW_LABEL: Record<ElevenOutcome['how'], { text: string; tone: string }> = {
  pick: { text: '✅ Recruté', tone: 'text-emerald-300' },
  auto: { text: '⏱️ Choix automatique', tone: 'text-zinc-400' },
  duel: { text: '🏆 Remporte le duel', tone: 'text-amber-300' },
  'surprise-star': { text: '🎁 Surprise : une PÉPITE !', tone: 'text-fuchsia-300' },
  'surprise-flop': { text: '🎁 Surprise… aïe 🥴', tone: 'text-rose-300' },
  broke: { text: '💸 Remplaçant gratuit', tone: 'text-rose-300' },
};

function ResolvePhase({ view, players }: { view: View; players: Map<string, PlayerPublic> }) {
  const q = view.duelQuestion;
  return (
    <div className="space-y-3">
      {q && view.duels.length > 0 && (
        <div className="panel p-4 text-sm">
          <div className="text-zinc-400">{q.question}</div>
          <div className="mt-1 font-bold text-emerald-300">✔ {q.correctIndex !== null ? q.choices[q.correctIndex] : ''}</div>
          {view.duels.map((d) => (
            <div key={d.footballer.id} className="mt-2 flex flex-wrap gap-2 text-xs">
              {d.players.map((id) => {
                const a = d.answers?.[id];
                const ok = a !== null && a !== undefined && a === q.correctIndex;
                return (
                  <span key={id} className={`rounded-lg px-2 py-1 ${ok ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/5 text-zinc-400'}`}>
                    {players.get(id)?.nickname} : {a === null || a === undefined ? 'pas de réponse' : q.choices[a]}
                  </span>
                );
              })}
              {d.byChance && <span className="rounded-lg bg-amber-500/15 px-2 py-1 text-amber-200">Personne n’a trouvé : tirage au sort 🎲</span>}
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {view.outcomes?.map((o, i) => {
          const p = players.get(o.playerId);
          if (!p) return null;
          const label = HOW_LABEL[o.how];
          const surprise = o.how.startsWith('surprise');
          return (
            <motion.div
              key={o.playerId}
              initial={surprise ? { scale: 0.3, rotate: -15, opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ scale: 1, rotate: 0, opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12, type: 'spring' }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Avatar player={p} size="xs" /> <span className="truncate">{p.nickname}</span>
              </div>
              <FootCard f={o.footballer} small highlight={o.how === 'surprise-star' ? 'star' : o.how === 'surprise-flop' || o.how === 'broke' ? 'flop' : undefined} />
              <div className={`text-xs font-bold ${label.tone}`}>
                {label.text} {o.price > 0 && <span className="font-mono text-zinc-400">· −{o.price} M€</span>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Final({ view, players, you }: { view: View; players: Map<string, PlayerPublic>; you: string }) {
  return (
    <div className="space-y-4">
      <div className="panel flex items-center justify-between gap-4 p-5">
        <div>
          <h2 className="text-2xl font-black">Les compos sont terminées ⚽</h2>
          <p className="text-sm text-zinc-400">Note = moyenne des 11 joueurs. Points = note × 30, +500 pour le meilleur 11.</p>
        </div>
        <TimerRing endsAt={view.endsAt} durationMs={view.durationMs} size={52} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {view.results?.map((r, i) => {
          const p = players.get(r.playerId);
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
                  <div className="text-xs text-zinc-500">{r.spent} M€ dépensés</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-3xl font-black text-gradient">{r.note}</div>
                  <div className="font-mono text-xs font-bold text-emerald-300">+{r.points} pts</div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <Pitch slots={view.slots} picks={r.picks} compact />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composants                                                          */
/* ------------------------------------------------------------------ */

function FootCard({
  f,
  selected,
  disabled,
  onClick,
  small,
  highlight,
}: {
  f: Footballer;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  small?: boolean;
  highlight?: 'duel' | 'star' | 'flop';
}) {
  const ring = selected ? 'ring-4 ring-fuchsia-400 scale-[1.03]' : highlight === 'duel' ? 'ring-4 ring-rose-400' : highlight === 'star' ? 'ring-4 ring-fuchsia-400' : '';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick || disabled}
      className={`relative flex w-full flex-col items-center overflow-hidden rounded-2xl bg-gradient-to-b p-3 text-center shadow-xl transition ${cardTone(f)} ${ring} ${
        onClick && !disabled ? 'hover:-translate-y-1 hover:shadow-2xl' : ''
      } ${disabled ? 'opacity-40 grayscale' : ''}`}
    >
      <div className="flex w-full items-start justify-between">
        <div className="text-left leading-none">
          <div className={`font-mono font-black ${small ? 'text-2xl' : 'text-3xl'}`}>{f.rating}</div>
          <div className="text-[10px] font-bold opacity-70">{f.roles?.[0] ?? f.pos}</div>
        </div>
        <span className={small ? 'text-lg' : 'text-2xl'}>{f.flag}</span>
      </div>
      <div className={`mt-2 w-full truncate font-black ${small ? 'text-sm' : 'text-base'}`}>{small ? shortName(f.name) : f.name}</div>
      <div className="w-full truncate text-[11px] opacity-70">
        {f.club}
        {f.retired ? ' · retraité' : f.age ? ` · ${f.age} ans` : ''}
      </div>
      <div className={`mt-2 rounded-lg bg-black/25 px-2 py-0.5 font-mono font-bold ${small ? 'text-xs' : 'text-sm'}`}>{f.price > 0 ? `${f.price} M€` : 'Gratuit'}</div>
      {selected && <span className="absolute right-2 top-2 rounded-full bg-fuchsia-500 px-1.5 text-xs text-white">✓</span>}
    </button>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <div className="flex h-36 items-center justify-center rounded-2xl border-2 border-dashed border-white/15 p-3 text-center text-sm text-zinc-500">{text}</div>;
}

function Pitch({ slots, picks, current, compact }: { slots: ElevenSlot[]; picks: (Footballer | null)[]; current?: number; compact?: boolean }) {
  return (
    <div className="pitch relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-emerald-300/10">
      <div className="pointer-events-none absolute inset-2 rounded-xl border border-white/15" />
      <div className="pointer-events-none absolute inset-x-2 top-1/2 border-t border-white/15" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[16%] w-[16%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
      {slots.map((s, i) => {
        const f = picks[i];
        const isCurrent = current === i;
        return (
          <div key={i} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
            {f ? (
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b font-mono text-xs font-black shadow ${cardTone(f)}`}>{f.rating}</span>
            ) : (
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 border-dashed text-[9px] font-bold ${
                  isCurrent ? 'animate-pulse border-fuchsia-300 bg-fuchsia-500/30 text-white' : 'border-white/30 text-white/60'
                }`}
              >
                {s.label}
              </span>
            )}
            <span className={`mt-0.5 max-w-16 truncate rounded bg-black/50 px-1 font-semibold leading-tight ${compact ? 'text-[8px]' : 'text-[10px]'}`}>
              {f ? shortName(f.name) : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TeamsSummary({ view, players, you }: { view: View; players: PlayerPublic[]; you: string }) {
  const rows = players
    .map((p) => {
      const t = view.teams[p.id];
      const filled = t?.picks.filter(Boolean) as Footballer[] | undefined;
      const avg = filled?.length ? filled.reduce((s, f) => s + f.rating, 0) / filled.length : 0;
      return { p, avg, count: filled?.length ?? 0, spent: t?.spent ?? 0 };
    })
    .sort((a, b) => b.avg - a.avg);
  return (
    <div className="panel p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Équipes adverses</h3>
      <ul className="space-y-1.5">
        {rows.map(({ p, avg, count, spent }) => (
          <li key={p.id} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm ${p.id === you ? 'bg-white/[0.05]' : ''}`}>
            <Avatar player={p} size="xs" />
            <span className="flex-1 truncate">{p.nickname}</span>
            <span className="font-mono text-xs text-zinc-500">
              {count}/{view.slots.length} · {view.budget - spent} M€
            </span>
            <span className="w-10 text-right font-mono font-bold">{avg ? avg.toFixed(1) : '–'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
