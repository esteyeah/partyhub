import { ELEVEN_THEMES, FOOTBALLERS, SURPRISES, fitsSlot } from '@content/footballers';
import type { AuctionSale, AuctionView, ElevenSlot, ElevenTeam, ElevenTeamResult, Footballer, GameAction } from '@shared/types';
import { shuffle } from '../../utils/random';
import { buildSlots } from '../eleven/ElevenGame';
import { GameModule } from '../GameModule';

type Settings = { mode: string; budget: string; formation: string; theme: string; time: string; blind?: boolean; lastPaid?: boolean };

const SOLD_MS = 4000;
const FINAL_MS = 30000;
/** Mode à tour de rôle : temps pour enchérir ou passer */
const TURN_MS = 12000;
const MIN_RAISE = 1;

/**
 * Mercato aux enchères : poste par poste, autant de footballeurs que de joueurs humains.
 * Chaque footballeur est vendu au plus offrant.
 *  - sealed : offres secrètes et simultanées, la plus haute l'emporte (égalité : la première envoyée).
 *  - open   : enchères à tour de rôle, chacun surenchérit ou passe ; le dernier en lice l'emporte.
 * Un joueur qui a déjà son footballeur pour ce poste ne participe plus aux ventes du poste.
 * Le dernier footballeur du poste revient d'office (et gratuitement) au dernier joueur sans footballeur.
 */
export class AuctionGame extends GameModule<Settings> {
  private slots: ElevenSlot[] = [];
  private slotIndex = -1;
  private budget = 300;
  private teams = new Map<string, ElevenTeam>();
  private lot: Footballer[] = [];
  private current: Footballer | null = null;
  private phase: AuctionView['phase'] = 'bid';
  private endsAt: number | null = null;
  private durationMs = 0;
  private owned = new Set<string>();
  private lastSale: AuctionSale | null = null;
  private results: ElevenTeamResult[] | null = null;
  // Enchères secrètes
  private bids = new Map<string, { amount: number; at: number }>();
  // Enchères à tour de rôle
  private price = 0;
  private leader: string | null = null;
  private out = new Set<string>();
  private order: string[] = [];
  private turn: string | null = null;
  private starter = 0;

  private get mode(): 'sealed' | 'open' {
    return this.settings.mode === 'open' ? 'open' : 'sealed';
  }

  start() {
    this.budget = Number(this.settings.budget) || 300;
    this.slots = buildSlots(this.settings.formation);
    for (const p of this.ctx.players()) this.team(p.id);
    this.nextSlot();
  }

  private team(id: string): ElevenTeam {
    let t = this.teams.get(id);
    if (!t) {
      t = { picks: this.slots.map(() => null), spent: 0 };
      this.teams.set(id, t);
    }
    return t;
  }

  private remaining(id: string) {
    return this.budget - this.team(id).spent;
  }

  private participants(): string[] {
    return this.ctx.players().filter((p) => p.connected || this.teams.has(p.id)).map((p) => p.id);
  }

  /** Joueurs sans footballeur au poste en cours */
  private bidders(): string[] {
    return this.participants().filter((id) => !this.team(id).picks[this.slotIndex]);
  }

  private setPhase(phase: AuctionView['phase'], ms: number, next: () => void) {
    this.clearTimers();
    this.phase = phase;
    this.durationMs = ms;
    this.endsAt = this.now() + ms;
    this.setTimer(ms, next);
    this.ctx.sync();
  }

  /** Autant de footballeurs que de joueurs, prix étalés du plus cher au moins cher */
  private makeLot(slot: ElevenSlot, n: number): Footballer[] {
    const theme = ELEVEN_THEMES[this.settings.theme] ?? ELEVEN_THEMES.all;
    let pool = FOOTBALLERS.filter((p) => theme.filter(p) && fitsSlot(slot.label, p) && !this.owned.has(p.id));
    if (pool.length < n) pool = FOOTBALLERS.filter((p) => fitsSlot(slot.label, p) && !this.owned.has(p.id));
    const byPrice = shuffle(pool).sort((a, b) => b.price - a.price);
    if (byPrice.length <= n) return byPrice;
    const top = byPrice[Math.floor(Math.random() * Math.max(1, Math.ceil(byPrice.length * 0.15)))];
    if (this.settings.blind) {
      // Mode à l'aveugle : après la tête d'affiche, n'importe qui… y compris de vrais ratés
      const flops = SURPRISES.filter((f) => fitsSlot(slot.label, f) && !this.owned.has(f.id));
      const rest = shuffle([...byPrice.filter((p) => p !== top).slice(0, 30), ...flops, ...flops, ...flops]);
      const lot = [top];
      for (const p of rest) {
        if (lot.length >= n) break;
        if (!lot.some((x) => x.name === p.name)) lot.push(p);
      }
      return lot;
    }
    const min = Math.max(1, byPrice[byPrice.length - 1].price);
    const lot = [top];
    for (let i = 1; i < n; i++) {
      const target = Math.log(top.price) + (Math.log(min) - Math.log(top.price)) * (i / Math.max(1, n - 1));
      const near = byPrice
        .filter((p) => !lot.includes(p))
        .sort((a, b) => Math.abs(Math.log(a.price) - target) - Math.abs(Math.log(b.price) - target))
        .slice(0, 4);
      lot.push(near[Math.floor(Math.random() * near.length)]);
    }
    return lot;
  }

  private nextSlot() {
    this.slotIndex++;
    if (this.slotIndex >= this.slots.length) return this.final();
    const n = Math.max(1, this.participants().length);
    this.lot = this.makeLot(this.slots[this.slotIndex], n);
    this.lastSale = null;
    this.nextLot();
  }

  private nextLot() {
    const bidders = this.bidders();
    if (!bidders.length || !this.lot.length) return this.nextSlot();
    this.current = this.lot.shift()!;
    // Un seul joueur sans footballeur : il le reçoit (gratuitement, ou au prix affiché selon l'option)
    if (bidders.length === 1) {
      const price = this.settings.lastPaid ? Math.min(this.current.price, this.remaining(bidders[0])) : 0;
      return this.sell(bidders[0], price, null);
    }
    this.bids.clear();
    if (this.mode === 'sealed') {
      this.setPhase('bid', Number(this.settings.time) * 1000, () => this.closeSealed());
    } else {
      this.price = 0;
      this.leader = null;
      this.out.clear();
      // Ordre de passage tournant d'une vente à l'autre
      const all = this.participants();
      const rotated = [...all.slice(this.starter % all.length), ...all.slice(0, this.starter % all.length)];
      this.starter++;
      this.order = rotated.filter((id) => bidders.includes(id));
      this.turn = this.order[0];
      this.setPhase('bid', TURN_MS, () => this.pass(this.turn!));
    }
  }

  private closeSealed() {
    if (this.phase !== 'bid' || !this.current) return;
    const bidders = this.bidders();
    const offers = bidders.map((id) => ({ id, ...(this.bids.get(id) ?? { amount: 0, at: Infinity }) }));
    offers.sort((a, b) => b.amount - a.amount || a.at - b.at);
    const best = offers[0];
    // Personne n'a rien proposé : tirage au sort, gratuit
    const winner = best.amount > 0 ? best.id : bidders[Math.floor(Math.random() * bidders.length)];
    this.sell(winner, best.amount > 0 ? best.amount : 0, Object.fromEntries(offers.map((o) => [o.id, o.amount])));
  }

  private nextTurn() {
    const inGame = this.order.filter((id) => !this.out.has(id));
    // Plus qu'un enchérisseur en lice et une offre en cours : vendu
    if (this.leader && inGame.length <= 1) return this.sell(this.leader, this.price, null);
    if (!inGame.length) {
      // Tout le monde a passé sans enchérir : tirage au sort, gratuit
      const b = this.bidders();
      return this.sell(b[Math.floor(Math.random() * b.length)], 0, null);
    }
    const idx = this.turn ? this.order.indexOf(this.turn) : -1;
    for (let k = 1; k <= this.order.length; k++) {
      const id = this.order[(idx + k) % this.order.length];
      if (this.out.has(id) || id === this.leader) continue;
      this.turn = id;
      return this.setPhase('bid', TURN_MS, () => this.pass(id));
    }
    if (this.leader) this.sell(this.leader, this.price, null);
  }

  private pass(id: string) {
    if (this.phase !== 'bid' || this.mode !== 'open' || this.turn !== id) return;
    this.out.add(id);
    this.nextTurn();
  }

  private sell(winner: string, price: number, bids: Record<string, number> | null) {
    if (!this.current) return;
    const t = this.team(winner);
    t.picks[this.slotIndex] = this.current;
    t.spent += price;
    this.owned.add(this.current.id);
    this.lastSale = { footballer: this.current, winner, price, bids };
    this.turn = null;
    this.setPhase('sold', SOLD_MS, () => {
      this.current = null;
      this.nextLot();
    });
  }

  private final() {
    const results: ElevenTeamResult[] = [...this.teams].map(([playerId, t]) => {
      const total = t.picks.reduce((s, p) => s + (p?.rating ?? 0), 0);
      const note = Math.round((total / this.slots.length) * 10) / 10;
      return { playerId, picks: t.picks, spent: t.spent, note, points: Math.round(note * 30), best: false };
    });
    results.sort((a, b) => b.note - a.note);
    const top = results[0]?.note;
    for (const r of results) {
      if (results.length > 1 && r.note === top) {
        r.best = true;
        r.points += 500;
      }
      this.ctx.addScore(r.playerId, r.points);
    }
    this.results = results;
    this.current = null;
    this.setPhase('final', FINAL_MS, () => this.ctx.finish());
  }

  onAction(playerId: string, action: GameAction) {
    if (this.phase !== 'bid' || !this.current || !this.bidders().includes(playerId)) return;
    if (action.type === 'bid') {
      const amount = Math.floor(Number(action.amount));
      if (!Number.isFinite(amount) || amount < 0 || amount > this.remaining(playerId)) return;
      if (this.mode === 'sealed') {
        this.bids.set(playerId, { amount, at: this.now() });
        const b = this.bidders();
        if (b.every((id) => this.bids.has(id))) {
          this.clearTimers();
          this.setTimer(600, () => this.closeSealed());
        }
        this.ctx.sync();
      } else {
        if (this.turn !== playerId || amount < this.price + MIN_RAISE) return;
        this.price = amount;
        this.leader = playerId;
        this.nextTurn();
      }
    } else if (action.type === 'pass' && this.mode === 'open') {
      this.pass(playerId);
    }
  }

  skip() {
    if (this.phase === 'bid') this.mode === 'sealed' ? this.closeSealed() : this.turn && this.pass(this.turn);
    else if (this.phase === 'final') this.ctx.finish();
  }

  view(playerId: string): AuctionView {
    const teams = Object.fromEntries(this.participants().map((id) => [id, this.team(id)]));
    return {
      kind: 'auction',
      gameId: 'auction',
      mode: this.mode,
      phase: this.phase,
      endsAt: this.endsAt,
      durationMs: this.durationMs,
      formation: this.settings.formation,
      slots: this.slots,
      slotIndex: this.slotIndex,
      budget: this.budget,
      teams,
      current: this.current,
      upcoming: this.settings.blind ? [] : this.lot,
      blind: !!this.settings.blind,
      bidders: this.current && this.phase === 'bid' ? this.bidders() : [],
      submitted: this.mode === 'sealed' ? [...this.bids.keys()] : [],
      open:
        this.mode === 'open'
          ? { price: this.price, leader: this.leader, turn: this.turn, out: [...this.out], minRaise: MIN_RAISE }
          : null,
      me: { bid: this.bids.get(playerId)?.amount ?? null, maxBid: this.remaining(playerId) },
      lastSale: this.lastSale,
      results: this.results,
    };
  }
}
