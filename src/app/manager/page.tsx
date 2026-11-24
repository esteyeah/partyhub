'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  LEAGUES,
  clubsOf,
  type LeagueId,
  FORMATIONS,
  answerDilemma,
  answerSale,
  answerScout,
  market,
  scout,
  trySell,
  autoLineup,
  chooseSlot,
  expiring,
  fits,
  lineupStrength,
  newGame,
  nextSeason,
  renew,
  renewWage,
  seasonSummary,
  simulateFirstHalf,
  simulateSecondHalf,
  slotsOf,
  sortedTable,
  toWinter,
  wageTotal,
  type MPlayer,
  type Save,
} from '@/manager/engine';

const KEY = 'partyhub-manager-save';
const POS_NAMES: Record<string, string> = {
  GB: 'Gardien', DG: 'Latéral gauche', DC: 'Défenseur central', DD: 'Latéral droit', MDC: 'Milieu défensif', MC: 'Milieu central',
  MOC: 'Milieu offensif', MG: 'Milieu gauche', MD: 'Milieu droit', AG: 'Ailier gauche', AD: 'Ailier droit', BU: 'Buteur',
};
const season = (y: number) => `${y}-${String(y + 1).slice(2)}`;

function load(): Save | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Save) : null;
  } catch {
    return null;
  }
}

export default function ManagerPage() {
  const [save, setSave] = useState<Save | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [league, setLeague] = useState<LeagueId>('L1');
  const [tab, setTab] = useState<'jeu' | 'effectif' | 'classement'>('jeu');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setHasSave(!!load()), []);

  /** Applique une modification à la partie et la sauvegarde */
  const update = (fn: (s: Save) => string | void | null) => {
    if (!save) return;
    const s: Save = JSON.parse(JSON.stringify(save));
    const err = fn(s);
    setError(typeof err === 'string' ? err : null);
    if (typeof err === 'string') return;
    setSave(s);
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* stockage indisponible : la partie continue sans sauvegarde */
    }
  };

  if (!save) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Header />
        <div className="panel mb-4 p-5">
          <h1 className="text-2xl font-black">⚽ Manager</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Choisis ton club, gère tes mercatos (ventes et achats sous forme de dilemmes), ta masse salariale et tes prolongations, compose ton 11 et
            enchaîne les saisons : championnat, coupe nationale et coupes d’Europe. En Ligue 1 ou en Premier League.
          </p>
          {hasSave && (
            <button onClick={() => setSave(load())} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 py-3 font-black text-black">
              ▶ Continuer ma partie
            </button>
          )}
        </div>
        <div className="mb-3 flex gap-2">
          {(Object.keys(LEAGUES) as LeagueId[]).map((l) => (
            <button key={l} onClick={() => setLeague(l)} className={`rounded-xl px-4 py-2 font-bold ${league === l ? 'bg-emerald-500/25 ring-1 ring-emerald-400/50' : 'bg-white/[0.05] text-zinc-400'}`}>
              {l === 'L1' ? '🇫🇷' : '🏴󠁧󠁢󠁥󠁮󠁧󠁿'} {LEAGUES[l].name}
            </button>
          ))}
        </div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">{hasSave ? 'Ou nouvelle partie avec…' : 'Choisis ton club'}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {clubsOf(league).map((c) => (
            <button
              key={c.name}
              onClick={() => {
                if (hasSave && !confirm('Écraser la partie en cours ?')) return;
                const s = newGame(c.name, league);
                setSave(s);
                localStorage.setItem(KEY, JSON.stringify(s));
              }}
              className="panel p-3 text-left hover:bg-white/[0.06]"
            >
              <div className="font-bold">{c.name}</div>
              <div className="text-xs text-zinc-500">
                {'★'.repeat(Math.max(1, Math.round((c.level - 67) / 3)))} · {c.budget} M€
              </div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  const wages = wageTotal(save);
  return (
    <main className="mx-auto max-w-4xl px-4 py-5">
      <Header />
      <div className="panel mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 p-4 text-sm">
        <div className="text-lg font-black">{save.club}</div>
        <div className="text-zinc-400">{LEAGUES[save.league ?? 'L1'].name}</div>
        <div className="text-zinc-400">Saison {season(save.season)}</div>
        <div>
          💶 Transferts : <b className="font-mono">{save.transferBudget} M€</b>
        </div>
        <div className={wages > save.wageBudget ? 'text-rose-300' : ''}>
          👛 Salaires : <b className="font-mono">{wages}</b> / {save.wageBudget} M€/an
        </div>
      </div>
      <div className="mb-3 flex gap-2">
        {(['jeu', 'effectif', 'classement'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${tab === t ? 'bg-white/15' : 'text-zinc-400'}`}>
            {t === 'jeu' ? '🎮 Partie' : t === 'effectif' ? '👥 Effectif' : '📊 Classement'}
          </button>
        ))}
      </div>
      {error && <p className="mb-3 rounded-xl bg-rose-500/15 px-4 py-2 text-sm text-rose-200">{error}</p>}

      {tab === 'effectif' && <Squad save={save} />}
      {tab === 'classement' && <Table save={save} />}
      {tab === 'jeu' && <Game save={save} update={update} />}

      <div className="mt-4 panel p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">📰 Actualités</h3>
        <ul className="space-y-1 text-sm text-zinc-300">
          {save.news.slice(0, 8).map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}

function Header() {
  return (
    <div className="mb-4 flex items-center justify-between">
      <Link href="/" className="text-sm text-zinc-400 hover:text-white">
        ← PartyHub
      </Link>
      <span className="text-sm font-bold text-emerald-300">Manager</span>
    </div>
  );
}

type Update = (fn: (s: Save) => string | void | null) => void;

function Game({ save, update }: { save: Save; update: Update }) {
  const p = save.phase;
  if (p === 'summer' || p === 'winter')
    return (
      <div className="space-y-3">
        <Mercato save={save} update={update} />
        <MarketTools save={save} update={update} />
      </div>
    );
  if (p === 'lineup1' || p === 'lineup2') return <Lineup save={save} update={update} />;
  if (p === 'results1' || p === 'results2') return <Results save={save} update={update} />;
  if (p === 'renew') return <Renew save={save} update={update} />;
  return <Summary save={save} update={update} />;
}

/* ---------------- Mercato ---------------- */

function PlayerLine({ p, extra }: { p: MPlayer; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 rounded-md bg-white/10 text-center font-mono text-sm font-black">{p.rating}</span>
      <span className="text-lg">{p.flag}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold">{p.name}</div>
        <div className="text-xs text-zinc-500">
          {p.roles.join('/')} · {p.age} ans · valeur {p.value} M€ · {p.wage} M€/an · contrat {p.contractEnd}
        </div>
      </div>
      {extra}
    </div>
  );
}

function Mercato({ save, update }: { save: Save; update: Update }) {
  const idx = save.dilemmas.findIndex((d) => !d.done);
  const d = save.dilemmas[idx];
  const total = save.dilemmas.length;
  if (!d) {
    return (
      <div className="panel p-5 text-center">
        <p className="mb-3 font-bold">Mercato {save.phase === 'summer' ? 'd’été' : 'd’hiver'} terminé ✅</p>
        <button onClick={() => update((s) => { s.phase = s.phase === 'summer' ? 'lineup1' : 'lineup2'; autoLineup(s); })} className="rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 font-bold">
          Préparer la compo →
        </button>
      </div>
    );
  }
  return (
    <div className="panel space-y-3 p-5">
      <div className="flex justify-between text-sm text-zinc-400">
        <span>
          {save.phase === 'summer' ? '☀️ Mercato d’été' : '❄️ Mercato d’hiver'} · dilemme {idx + 1}/{total}
        </span>
        <span>{d.kind === 'sell' ? 'Vente' : 'Achat'}</span>
      </div>
      {d.kind === 'pickSlot' && (
        <>
          <h2 className="text-xl font-black">À quel poste veux-tu recruter ?</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.keys(POS_NAMES).map((slot) => (
              <button key={slot} onClick={() => update((s) => chooseSlot(s, idx, slot))} className="rounded-xl bg-white/[0.06] px-3 py-2 text-left text-sm font-semibold hover:bg-white/10">
                {slot} · {POS_NAMES[slot]}
              </button>
            ))}
          </div>
        </>
      )}
      {d.kind === 'sell' && (
        <>
          <h2 className="text-xl font-black">Des clubs veulent tes joueurs : qui vends-tu ?</h2>
          {d.options.map((o, i) => {
            const p = save.squad.find((x) => x.id === o.playerId);
            if (!p) return null;
            return (
              <button key={o.playerId} onClick={() => update((s) => answerDilemma(s, idx, i))} className="w-full rounded-xl bg-white/[0.04] p-3 text-left hover:bg-white/[0.08]">
                <PlayerLine p={p} extra={<span className="text-right text-sm font-bold text-emerald-300">+{o.fee} M€<br /><span className="text-xs text-zinc-500">{o.club}</span></span>} />
              </button>
            );
          })}
          <button onClick={() => update((s) => answerDilemma(s, idx, null))} className="w-full rounded-xl bg-rose-500/15 py-2 font-bold text-rose-200">
            Je garde tout le monde
          </button>
        </>
      )}
      {d.kind === 'buy' && (
        <>
          <h2 className="text-xl font-black">Recrutement : {POS_NAMES[d.slot] ?? d.slot}</h2>
          {d.options.map((o, i) => (
            <button key={o.player.id} onClick={() => update((s) => answerDilemma(s, idx, i))} className="w-full rounded-xl bg-white/[0.04] p-3 text-left hover:bg-white/[0.08]">
              <PlayerLine
                p={o.player}
                extra={
                  <span className="text-right text-sm font-bold">
                    {o.free ? <span className="text-amber-300">Libre</span> : <span className="text-rose-300">−{o.fee} M€</span>}
                    <br />
                    <span className="text-xs text-zinc-500">{o.club}</span>
                  </span>
                }
              />
            </button>
          ))}
          <button onClick={() => update((s) => answerDilemma(s, idx, null))} className="w-full rounded-xl bg-white/[0.06] py-2 font-bold text-zinc-300">
            Je ne recrute personne
          </button>
        </>
      )}
    </div>
  );
}

/* ---------------- Sondages et ventes libres ---------------- */

function MarketTools({ save, update }: { save: Save; update: Update }) {
  const [q, setQ] = useState('');
  const [sellId, setSellId] = useState('');
  const results = useMemo(() => {
    if (q.trim().length < 2) return [];
    const n = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return market(save)
      .filter((m) => m.player.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(n))
      .slice(0, 8);
  }, [q, save]);
  const b = save.pendingBuy;
  const sale = save.pendingSale;
  const saleP = sale ? save.squad.find((p) => p.id === sale.playerId) : null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="panel space-y-2 p-4">
        <h3 className="font-black">🔎 Sonder un joueur <span className="text-xs font-normal text-zinc-500">({save.scouts ?? 0} restant{(save.scouts ?? 0) > 1 ? 's' : ''})</span></h3>
        {b ? (
          <div className="space-y-2 rounded-xl bg-white/[0.04] p-3">
            <PlayerLine p={b.player} />
            <p className="text-sm">
              {b.club} {b.free ? <b className="text-amber-300">le laisse partir libre</b> : <>demande <b className="text-rose-300">{b.fee} M€</b></>} · salaire {b.player.wage} M€/an
            </p>
            <div className="flex gap-2">
              <button onClick={() => update((s) => answerScout(s, true))} className="flex-1 rounded-xl bg-emerald-500/20 py-1.5 text-sm font-bold text-emerald-200">Accepter</button>
              <button onClick={() => update((s) => answerScout(s, false))} className="flex-1 rounded-xl bg-rose-500/15 py-1.5 text-sm font-bold text-rose-200">Refuser</button>
            </div>
          </div>
        ) : (
          <>
            <input className="input text-sm" placeholder="Nom du joueur (ex : Mbappé, Saka…)" value={q} onChange={(e) => setQ(e.target.value)} disabled={!save.scouts} />
            <ul className="space-y-1">
              {results.map((m) => (
                <li key={m.player.id}>
                  <button disabled={!save.scouts} onClick={() => { update((s) => scout(s, m.player.id)); setQ(''); }} className="w-full rounded-lg bg-white/[0.03] px-2 py-1.5 text-left text-sm hover:bg-white/[0.08] disabled:opacity-40">
                    <b className="font-mono">{m.player.rating}</b> {m.player.name} · <span className="text-zinc-500">{m.player.roles[0]} · {m.club} · ~{m.player.value} M€</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="panel space-y-2 p-4">
        <h3 className="font-black">📤 Mettre un joueur en vente <span className="text-xs font-normal text-zinc-500">({save.saleTries ?? 0} restante{(save.saleTries ?? 0) > 1 ? 's' : ''})</span></h3>
        {sale && saleP ? (
          <div className="space-y-2 rounded-xl bg-white/[0.04] p-3">
            <PlayerLine p={saleP} />
            {sale.offers.map((o, i) => (
              <button key={i} onClick={() => update((s) => answerSale(s, i))} className="flex w-full items-center justify-between rounded-lg bg-white/[0.05] px-3 py-1.5 text-sm hover:bg-white/10">
                <span>{o.club} <span className={`ml-1 rounded px-1.5 text-[10px] font-bold ${o.tone === 'belle' ? 'bg-emerald-500/30' : o.tone === 'correcte' ? 'bg-sky-500/25' : 'bg-rose-500/25'}`}>offre {o.tone}</span></span>
                <b className="text-emerald-300">+{o.fee} M€</b>
              </button>
            ))}
            <button onClick={() => update((s) => answerSale(s, null))} className="w-full rounded-lg bg-rose-500/15 py-1.5 text-sm font-bold text-rose-200">Refuser toutes les offres</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <select className="flex-1 rounded-xl border border-white/10 bg-ink-800 px-2 py-1.5 text-sm" value={sellId} onChange={(e) => setSellId(e.target.value)} disabled={!save.saleTries}>
              <option value="">Choisis un joueur…</option>
              {[...save.squad].sort((a, b) => b.rating - a.rating).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.rating} · {p.name} ({p.roles[0]}) · valeur {p.value} M€
                </option>
              ))}
            </select>
            <button disabled={!sellId || !save.saleTries} onClick={() => { update((s) => trySell(s, sellId)); setSellId(''); }} className="rounded-xl bg-white/10 px-3 text-sm font-bold disabled:opacity-40">
              Proposer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Composition ---------------- */

function Lineup({ save, update }: { save: Save; update: Update }) {
  const slots = slotsOf(save);
  const used = new Set(save.xi.filter(Boolean) as string[]);
  const sorted = [...save.squad].sort((a, b) => b.rating - a.rating);
  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center gap-2 p-4">
        <span className="text-sm text-zinc-400">Formation :</span>
        {Object.keys(FORMATIONS).map((f) => (
          <button
            key={f}
            onClick={() =>
              update((s) => {
                s.formation = f;
                autoLineup(s);
              })
            }
            className={`rounded-lg px-3 py-1 text-sm font-bold ${save.formation === f ? 'bg-emerald-500/30' : 'bg-white/[0.05]'}`}
          >
            {f}
          </button>
        ))}
        <button onClick={() => update((s) => autoLineup(s))} className="ml-auto rounded-lg bg-white/10 px-3 py-1 text-sm font-bold">
          ✨ Meilleure compo
        </button>
      </div>
      <div className="panel space-y-2 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Titulaires · force {lineupStrength(save).toFixed(1)}</h3>
        {slots.map((slot, i) => {
          const cur = save.squad.find((p) => p.id === save.xi[i]);
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-12 font-mono text-xs font-bold text-emerald-300">{slot}</span>
              <select
                className="flex-1 rounded-xl border border-white/10 bg-ink-800 px-2 py-1.5 text-sm"
                value={save.xi[i] ?? ''}
                onChange={(e) =>
                  update((s) => {
                    const id = e.target.value || null;
                    s.xi = s.xi.map((x, k) => (k !== i && x === id ? null : x));
                    s.xi[i] = id;
                    s.subs = s.subs.filter((x) => x !== id);
                  })
                }
              >
                <option value="">—</option>
                {sorted.map((p) => (
                  <option key={p.id} value={p.id} disabled={used.has(p.id) && p.id !== save.xi[i]}>
                    {p.rating} · {p.name} ({p.roles.join('/')}){fits(slot, p) ? '' : ' ⚠️ hors poste'}
                  </option>
                ))}
              </select>
              {cur && !fits(slot, cur) && <span className="text-xs text-amber-300">−6</span>}
            </div>
          );
        })}
      </div>
      <div className="panel p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Remplaçants ({save.subs.length}/7)</h3>
        <div className="flex flex-wrap gap-2">
          {sorted
            .filter((p) => !used.has(p.id))
            .map((p) => {
              const on = save.subs.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => update((s) => void (s.subs = on ? s.subs.filter((x) => x !== p.id) : s.subs.length < 7 ? [...s.subs, p.id] : s.subs))}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${on ? 'bg-emerald-500/25 ring-1 ring-emerald-400/50' : 'bg-white/[0.05] text-zinc-400'}`}
                >
                  {p.rating} {p.name} · {p.roles[0]}
                </button>
              );
            })}
        </div>
      </div>
      <button
        onClick={() => update((s) => (s.xi.filter(Boolean).length < 11 ? 'Il te manque des titulaires' : s.phase === 'lineup1' ? simulateFirstHalf(s) : simulateSecondHalf(s)))}
        className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 py-3 text-lg font-black text-black"
      >
        ▶ Simuler {save.phase === 'lineup1' ? `la phase aller (J1 → J${save.fixtures.length / 2})` : `la phase retour (J${save.fixtures.length / 2 + 1} → J${save.fixtures.length})`}
      </button>
    </div>
  );
}

/* ---------------- Résultats ---------------- */

function Results({ save, update }: { save: Save; update: Update }) {
  const rank = sortedTable(save).findIndex((r) => r.club === save.club) + 1;
  return (
    <div className="space-y-3">
      <div className="panel p-4">
        <div className="text-lg font-black">
          {rank}
          <sup>e</sup> de {LEAGUES[save.league ?? 'L1'].name} après {save.matchday} journées
        </div>
        <div className="text-sm text-zinc-400">
          {save.euro ? `${save.euro.name} : ${save.euro.stage}` : 'Pas de coupe d’Europe'} · {LEAGUES[save.league ?? 'L1'].cup} : {save.cup}
        </div>
      </div>
      <div className="panel max-h-96 overflow-y-auto p-4">
        <ul className="space-y-1 text-sm">
          {save.log.map((m, i) => {
            const me = m.home === save.club;
            const [mine, theirs] = me ? [m.hg, m.ag] : [m.ag, m.hg];
            const res = mine > theirs ? 'text-emerald-300' : mine < theirs ? 'text-rose-300' : 'text-zinc-300';
            return (
              <li key={i} className="flex gap-2">
                <span className="w-44 shrink-0 truncate text-xs text-zinc-500">{m.label}</span>
                <span className="flex-1 truncate">
                  {m.home} – {m.away}
                </span>
                <span className={`font-mono font-bold ${res}`}>
                  {m.hg}-{m.ag}
                  {m.pens ? ` (${m.pens})` : ''}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <button
        onClick={() =>
          update((s) => {
            if (s.phase === 'results1') toWinter(s);
            else if (expiring(s).length) s.phase = 'renew';
            else seasonSummary(s);
          })
        }
        className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 font-bold"
      >
        {save.phase === 'results1' ? '❄️ Mercato d’hiver →' : 'Fin de saison →'}
      </button>
    </div>
  );
}

function Renew({ save, update }: { save: Save; update: Update }) {
  const list = expiring(save);
  return (
    <div className="panel space-y-3 p-5">
      <h2 className="text-xl font-black">Fins de contrat : prolonger ou laisser partir ?</h2>
      <p className="text-sm text-zinc-400">Attention à la masse salariale : une prolongation augmente le salaire.</p>
      {list.map((p) => (
        <div key={p.id} className="rounded-xl bg-white/[0.04] p-3">
          <PlayerLine p={p} />
          <div className="mt-2 flex gap-2">
            <button onClick={() => update((s) => renew(s, p.id, true))} className="flex-1 rounded-xl bg-emerald-500/20 py-1.5 text-sm font-bold text-emerald-200">
              Prolonger ({renewWage(p)} M€/an)
            </button>
            <button onClick={() => update((s) => renew(s, p.id, false))} className="flex-1 rounded-xl bg-rose-500/15 py-1.5 text-sm font-bold text-rose-200">
              Laisser partir
            </button>
          </div>
        </div>
      ))}
      {!list.length && (
        <button onClick={() => update((s) => void seasonSummary(s))} className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 font-bold">
          Bilan de la saison →
        </button>
      )}
    </div>
  );
}

function Summary({ save, update }: { save: Save; update: Update }) {
  const last = save.history[save.history.length - 1];
  return (
    <div className="panel space-y-3 p-5 text-center">
      <h2 className="text-2xl font-black">Bilan {last ? season(last.season) : ''}</h2>
      {last && (
        <div className="space-y-1">
          <div className="text-4xl font-black text-gradient">
            {last.rank}
            <sup>e</sup>
          </div>
          <div className="text-sm text-zinc-300">{LEAGUES[save.league ?? 'L1'].cup} : {last.cup}</div>
          <div className="text-sm text-zinc-300">{last.euro}</div>
        </div>
      )}
      {save.history.length > 1 && (
        <div className="text-left text-sm text-zinc-400">
          {save.history.map((h) => (
            <div key={h.season}>
              {season(h.season)} : {h.rank}
              <sup>e</sup> · {LEAGUES[save.league ?? 'L1'].cup} {h.cup} · {h.euro}
            </div>
          ))}
        </div>
      )}
      <button onClick={() => update((s) => nextSeason(s))} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 py-3 font-black text-black">
        ☀️ Saison suivante →
      </button>
    </div>
  );
}

/* ---------------- Onglets ---------------- */

function Squad({ save }: { save: Save }) {
  const order = ['GK', 'DEF', 'MID', 'ATT'];
  const list = [...save.squad].sort((a, b) => order.indexOf(a.pos) - order.indexOf(b.pos) || b.rating - a.rating);
  return (
    <div className="panel space-y-2 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{save.squad.length} joueurs</h3>
      {list.map((p) => (
        <PlayerLine key={p.id} p={p} />
      ))}
    </div>
  );
}

function Table({ save }: { save: Save }) {
  return (
    <div className="panel overflow-x-auto p-4">
      <table className="w-full text-sm">
        <thead className="text-xs text-zinc-500">
          <tr>
            <th className="text-left">#</th>
            <th className="text-left">Club</th>
            <th>J</th>
            <th>G</th>
            <th>N</th>
            <th>P</th>
            <th>Diff</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {sortedTable(save).map((r, i) => (
            <tr key={r.club} className={`${r.club === save.club ? 'bg-emerald-500/15 font-bold' : ''} ${i < 3 ? 'text-sky-200' : i >= save.table.length - 3 ? 'text-rose-300' : ''}`}>
              <td>{i + 1}</td>
              <td>{r.club}</td>
              <td className="text-center">{r.p}</td>
              <td className="text-center">{r.w}</td>
              <td className="text-center">{r.d}</td>
              <td className="text-center">{r.l}</td>
              <td className="text-center">{r.gf - r.ga}</td>
              <td className="text-center font-mono font-black">{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-zinc-500">Top 3 : Ligue des champions · 4-5 : Ligue Europa · 6 : Conférence · 3 derniers : relégables</p>
    </div>
  );
}
