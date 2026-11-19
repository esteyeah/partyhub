'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { AuctionView as View, ElevenView, PlayerPublic } from '@shared/types';
import { Avatar } from '@/components/ui/Avatar';
import { TimerRing } from '@/components/ui/Timer';
import { sendAction } from '@/lib/net';
import { Final, FootCard, Pitch } from '../eleven/ElevenView';
import type { GameViewProps } from '../types';

const POS_NAMES: Record<string, string> = {
  GB: 'Gardien', DG: 'Latéral gauche', DD: 'Latéral droit', DC: 'Défenseur central', MDC: 'Milieu défensif', MC: 'Milieu central',
  MOC: 'Milieu offensif', MG: 'Milieu gauche', MD: 'Milieu droit', AG: 'Ailier gauche', AD: 'Ailier droit', BU: 'Buteur',
};

export function AuctionView({ view, room, you }: GameViewProps<View>) {
  const players = new Map(room.players.map((p) => [p.id, p]));
  if (view.phase === 'final') return <Final view={view as unknown as ElevenView} players={players} you={you} />;
  const slot = view.slots[view.slotIndex];
  const mine = view.teams[you];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <div className="panel flex items-center gap-4 p-4">
          <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-emerald-500/15 font-black text-emerald-300">
            {slot?.label}
            <span className="text-[10px] text-zinc-400">
              {view.slotIndex + 1}/{view.slots.length}
            </span>
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{view.mode === 'sealed' ? '🤫 Enchères secrètes' : '🔨 Enchères à tour de rôle'}</div>
            <div className="text-xl font-black">{slot ? POS_NAMES[slot.label] ?? slot.label : ''}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500">Ton budget</div>
            <div className="font-mono text-2xl font-black">{view.me.maxBid} M€</div>
          </div>
          <TimerRing endsAt={view.endsAt} durationMs={view.durationMs} size={52} />
        </div>

        {view.phase === 'sold' && view.lastSale ? (
          <Sold view={view} players={players} you={you} />
        ) : view.current ? (
          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <motion.div key={view.current.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <FootCard f={view.current} />
              <p className="mt-1 text-center text-xs text-zinc-500">Valeur estimée : {view.current.price} M€</p>
            </motion.div>
            {view.mode === 'sealed' ? <SealedBid view={view} players={players} you={you} /> : <OpenBid view={view} players={players} you={you} />}
          </div>
        ) : null}

        {view.blind && view.current && view.phase === 'bid' && (
          <p className="panel p-3 text-center text-sm text-zinc-400">🙈 À l’aveugle : les footballeurs suivants sont cachés… et ils peuvent être bien pires !</p>
        )}
        {view.upcoming.length > 0 && (
          <div className="panel p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Ensuite à ce poste</div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {view.upcoming.map((f) => (
                <FootCard key={f.id} f={f} small />
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className="panel p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Mon équipe</h3>
          {mine && <Pitch slots={view.slots} picks={mine.picks} current={view.slotIndex} />}
        </div>
        <Teams view={view} players={room.players} you={you} />
      </aside>
    </div>
  );
}

function SealedBid({ view, players, you }: { view: View; players: Map<string, PlayerPublic>; you: string }) {
  const [amount, setAmount] = useState('');
  useEffect(() => setAmount(''), [view.current?.id]);
  const canBid = view.bidders.includes(you);
  const n = Number(amount);
  const valid = amount !== '' && Number.isInteger(n) && n >= 0 && n <= view.me.maxBid;
  return (
    <div className="panel space-y-3 p-4">
      {canBid ? (
        <>
          <p className="text-sm text-zinc-300">Fais ton offre en secret : la plus haute l’emporte et paie son offre.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) sendAction({ type: 'bid', amount: n });
            }}
            className="flex gap-2"
          >
            <input
              className="input text-center font-mono text-2xl"
              inputMode="numeric"
              placeholder="M€"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              autoFocus
            />
            <button disabled={!valid} className="rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 px-5 font-bold text-black disabled:opacity-40">
              {view.me.bid !== null ? 'Modifier' : 'Offrir'}
            </button>
          </form>
          {view.me.bid !== null && <p className="text-center text-sm font-semibold text-emerald-300">Offre envoyée : {view.me.bid} M€ (tu peux la modifier)</p>}
          <p className="text-xs text-zinc-500">Max {view.me.maxBid} M€ · 0 = je passe</p>
        </>
      ) : (
        <p className="text-sm text-zinc-400">Tu as déjà ton joueur à ce poste : les autres se battent pour celui-ci.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {view.bidders.map((id) => {
          const p = players.get(id);
          return p ? (
            <span key={id} className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2 py-1 text-sm">
              <Avatar player={p} size="xs" /> {view.submitted.includes(id) ? '✅' : '…'}
            </span>
          ) : null;
        })}
      </div>
    </div>
  );
}

function OpenBid({ view, players, you }: { view: View; players: Map<string, PlayerPublic>; you: string }) {
  const o = view.open!;
  const min = o.price + o.minRaise;
  const [amount, setAmount] = useState(String(min));
  useEffect(() => setAmount(String(min)), [min, o.turn]);
  const myTurn = o.turn === you;
  const n = Number(amount);
  const valid = Number.isInteger(n) && n >= min && n <= view.me.maxBid;
  const leader = o.leader ? players.get(o.leader) : null;
  const turn = o.turn ? players.get(o.turn) : null;
  return (
    <div className="panel space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-zinc-500">Enchère actuelle</div>
          <div className="font-mono text-3xl font-black text-emerald-300">{o.price} M€</div>
        </div>
        <div className="text-right text-sm">
          {leader ? (
            <span className="flex items-center gap-1.5">
              <Avatar player={leader} size="xs" /> mène
            </span>
          ) : (
            <span className="text-zinc-500">Aucune offre</span>
          )}
        </div>
      </div>
      {myTurn ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) sendAction({ type: 'bid', amount: n });
          }}
          className="space-y-2"
        >
          <p className="text-sm font-bold text-amber-200">À toi ! Surenchéris ou passe.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAmount(String(Math.max(min, n - 5)))} className="rounded-xl bg-white/10 px-3 font-bold">−5</button>
            <input className="input text-center font-mono text-2xl" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
            <button type="button" onClick={() => setAmount(String(Math.min(view.me.maxBid, (Number.isFinite(n) ? n : min) + 5)))} className="rounded-xl bg-white/10 px-3 font-bold">+5</button>
          </div>
          <div className="flex gap-2">
            <button disabled={!valid} className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 py-2 font-bold text-black disabled:opacity-40">
              Enchérir {valid ? `${n} M€` : ''}
            </button>
            <button type="button" onClick={() => sendAction({ type: 'pass' })} className="flex-1 rounded-2xl bg-rose-500/20 py-2 font-bold text-rose-200">
              Passer
            </button>
          </div>
          <p className="text-xs text-zinc-500">Min {min} M€ · max {view.me.maxBid} M€ · passer = abandonner ce joueur</p>
        </form>
      ) : (
        <p className="text-sm text-zinc-400">{turn ? `${turn.nickname} réfléchit…` : '…'}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {view.bidders.map((id) => {
          const p = players.get(id);
          if (!p) return null;
          const out = o.out.includes(id);
          return (
            <span key={id} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm ${o.turn === id ? 'bg-amber-500/20 ring-1 ring-amber-400/50' : 'bg-white/[0.04]'} ${out ? 'opacity-40 line-through' : ''}`}>
              <Avatar player={p} size="xs" /> {p.nickname}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Sold({ view, players, you }: { view: View; players: Map<string, PlayerPublic>; you: string }) {
  const s = view.lastSale!;
  const w = players.get(s.winner);
  return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="panel grid gap-4 p-4 sm:grid-cols-[200px_1fr]">
      <FootCard f={s.footballer} highlight={s.winner === you ? 'star' : undefined} />
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">🔨 Adjugé !</div>
        <div className="flex items-center gap-2 text-xl font-black">
          {w && <Avatar player={w} size="sm" />} {w?.nickname} · {s.price > 0 ? `${s.price} M€` : 'gratuit'}
        </div>
        {s.bids && (
          <ul className="space-y-1 text-sm">
            {Object.entries(s.bids)
              .sort((a, b) => b[1] - a[1])
              .map(([id, amount]) => (
                <li key={id} className="flex justify-between rounded-lg bg-white/[0.04] px-3 py-1">
                  <span>{players.get(id)?.nickname}</span>
                  <span className="font-mono">{amount} M€</span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}

function Teams({ view, players, you }: { view: View; players: PlayerPublic[]; you: string }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="panel p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Équipes · clique pour voir</h3>
      <ul className="space-y-1.5">
        {players.map((p) => {
          const t = view.teams[p.id];
          if (!t) return null;
          return (
            <li key={p.id}>
              <button type="button" onClick={() => setOpen(open === p.id ? null : p.id)} className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-white/[0.06] ${p.id === you ? 'bg-white/[0.05]' : ''}`}>
                <Avatar player={p} size="xs" />
                <span className="flex-1 truncate">{p.nickname}</span>
                <span className="font-mono text-xs text-emerald-300">{view.budget - t.spent} M€</span>
              </button>
              {open === p.id && (
                <div className="mt-2">
                  <Pitch slots={view.slots} picks={t.picks} compact />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
