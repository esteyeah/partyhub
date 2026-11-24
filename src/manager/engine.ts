/**
 * « Manager » : un jeu solo façon Football Manager, inspiré de la Ligue 1.
 * Tout tourne dans le navigateur, la partie est sauvegardée dans le localStorage.
 *
 * Déroulé d'une saison :
 *   mercato d'été (4 dilemmes de vente, 4 d'achat dont le dernier au poste choisi) →
 *   compo → 1re partie de saison (journées 1-17 + phase de ligue européenne) →
 *   mercato d'hiver (2 ventes, 2 achats) → compo → 2e partie (journées 18-34, phases finales, Coupe de France) →
 *   prolongations des fins de contrat → bilan → saison suivante.
 */
import { FOOTBALLERS, UCL_CLUBS, fitsSlot, priceFor } from '@content/footballers';
import type { FootPos, Footballer } from '@shared/types';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface MPlayer {
  id: string;
  name: string;
  pos: FootPos;
  roles: string[];
  rating: number;
  age: number;
  flag: string;
  /** Valeur marchande (M€) */
  value: number;
  /** Salaire (M€ par an) */
  wage: number;
  /** Fin de contrat : 30 juin de cette année */
  contractEnd: number;
}

export type Dilemma =
  | { kind: 'sell'; options: { playerId: string; fee: number; club: string }[]; done?: boolean; choice?: number | null }
  | { kind: 'buy'; slot: string; options: { player: MPlayer; fee: number; club: string; free: boolean }[]; done?: boolean; choice?: number | null }
  /** Achat dont le poste est choisi par le joueur */
  | { kind: 'pickSlot'; done?: boolean; choice?: number | null };

export interface MatchLine {
  comp: 'L1' | 'EU' | 'CDF';
  label: string;
  home: string;
  away: string;
  hg: number;
  ag: number;
  /** Tirs au but (coupes) */
  pens?: string;
}

export interface Row {
  club: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
}

export interface EuroState {
  name: string;
  /** Phase de ligue : points sur 8 matchs */
  points: number;
  played: number;
  /** league · playoff · r16 · qf · sf · final · winner · out */
  stage: string;
}

export type Phase = 'summer' | 'lineup1' | 'results1' | 'winter' | 'lineup2' | 'results2' | 'renew' | 'summary';

export interface Save {
  version: 1;
  club: string;
  season: number;
  phase: Phase;
  transferBudget: number;
  wageBudget: number;
  squad: MPlayer[];
  formation: string;
  /** ids des 11 titulaires, dans l'ordre des postes de la formation */
  xi: (string | null)[];
  subs: string[];
  dilemmas: Dilemma[];
  table: Row[];
  fixtures: [string, string][][];
  matchday: number;
  log: MatchLine[];
  euro: EuroState | null;
  cup: string;
  news: string[];
  history: { season: number; rank: number; cup: string; euro: string }[];
  /** Effectifs des autres clubs (pour les achats et la force des adversaires) */
  others: Record<string, MPlayer[]>;
}

/* ------------------------------------------------------------------ */
/* Clubs                                                               */
/* ------------------------------------------------------------------ */

export const CLUBS: { name: string; level: number; budget: number }[] = [
  { name: 'PSG', level: 81, budget: 150 },
  { name: 'Marseille', level: 77, budget: 60 },
  { name: 'Monaco', level: 77, budget: 60 },
  { name: 'Lille', level: 76, budget: 45 },
  { name: 'Lyon', level: 76, budget: 40 },
  { name: 'Lens', level: 75, budget: 35 },
  { name: 'Nice', level: 74, budget: 30 },
  { name: 'Rennes', level: 74, budget: 35 },
  { name: 'Strasbourg', level: 74, budget: 35 },
  { name: 'Paris FC', level: 72, budget: 30 },
  { name: 'Brest', level: 72, budget: 15 },
  { name: 'Toulouse', level: 72, budget: 15 },
  { name: 'Nantes', level: 71, budget: 12 },
  { name: 'Auxerre', level: 70, budget: 10 },
  { name: 'Lorient', level: 70, budget: 10 },
  { name: 'Le Havre', level: 70, budget: 10 },
  { name: 'Angers', level: 70, budget: 8 },
  { name: 'Metz', level: 69, budget: 8 },
];

export const FORMATIONS: Record<string, string[]> = {
  '4-3-3': ['GB', 'DG', 'DC', 'DC', 'DD', 'MC', 'MDC', 'MC', 'AG', 'BU', 'AD'],
  '4-2-3-1': ['GB', 'DG', 'DC', 'DC', 'DD', 'MDC', 'MDC', 'MG', 'MOC', 'MD', 'BU'],
  '4-4-2': ['GB', 'DG', 'DC', 'DC', 'DD', 'MG', 'MC', 'MC', 'MD', 'BU', 'BU'],
  '3-5-2': ['GB', 'DC', 'DC', 'DC', 'MG', 'MC', 'MDC', 'MC', 'MD', 'BU', 'BU'],
};

const POS_OF: Record<string, FootPos> = {
  GB: 'GK', DG: 'DEF', DC: 'DEF', DD: 'DEF', MDC: 'MID', MC: 'MID', MOC: 'MID', MG: 'MID', MD: 'MID', AG: 'ATT', AD: 'ATT', BU: 'ATT',
};

/* ------------------------------------------------------------------ */
/* Outils                                                              */
/* ------------------------------------------------------------------ */

let seed = Date.now() % 2147483647;
export function rnd(): number {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)];
function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
const round1 = (x: number) => Math.round(x * 10) / 10;

export const wageFor = (value: number, rating: number) => round1(Math.max(0.3, 0.4 + value * 0.1 + Math.max(0, rating - 75) * 0.15));
export const fits = (slot: string, p: MPlayer) => fitsSlot(slot, p as unknown as Footballer);

const FIRST = ['Lucas', 'Hugo', 'Théo', 'Nathan', 'Enzo', 'Mathis', 'Yanis', 'Rayan', 'Adam', 'Noah', 'Ilyes', 'Kylian', 'Mehdi', 'Sacha', 'Bilal', 'Maxime', 'Axel', 'Ibrahim', 'Moussa', 'Samuel', 'Jules', 'Evan', 'Malik', 'Aboubakar', 'Tom', 'Romain'];
const LAST = ['Martin', 'Bernard', 'Diallo', 'Traoré', 'Petit', 'Moreau', 'Laurent', 'Camara', 'Fofana', 'Girard', 'Bonnet', 'Mendy', 'Lefebvre', 'Sylla', 'Roux', 'Faure', 'Mercier', 'Koné', 'Garnier', 'Chevalier', 'Bamba', 'Perrin', 'Morel', 'Ndiaye', 'Gauthier', 'Coulibaly'];

let genSeq = 0;
function generated(club: string, role: string, level: number, season: number): MPlayer {
  const rating = Math.max(60, Math.min(84, Math.round(level - 4 + rnd() * 7 - 2)));
  const age = 19 + Math.floor(rnd() * 13);
  const value = priceFor(rating, age);
  return {
    id: `gen-${club}-${++genSeq}-${Math.floor(rnd() * 1e6)}`,
    name: `${pick(FIRST)} ${pick(LAST)}`,
    pos: POS_OF[role],
    roles: [role],
    rating,
    age,
    flag: '🇫🇷',
    value,
    wage: wageFor(value, rating),
    contractEnd: season + 1 + Math.floor(rnd() * 4),
  };
}

function fromFootballer(f: Footballer, season: number): MPlayer {
  const age = f.age ?? 26;
  const value = f.price;
  return {
    id: f.id,
    name: f.name,
    pos: f.pos,
    roles: f.roles,
    rating: f.rating,
    age,
    flag: f.flag,
    value,
    wage: wageFor(value, f.rating),
    contractEnd: season + 1 + Math.floor(rnd() * 4),
  };
}

/** Effectif de départ d'un club : ses vrais joueurs, complétés jusqu'à 2 joueurs par poste */
function buildRoster(club: string, level: number, season: number): MPlayer[] {
  const real = FOOTBALLERS.filter((f) => f.league === 'Ligue 1' && f.club === club && !f.retired).map((f) => fromFootballer(f, season));
  const roster = [...real];
  const need: Record<string, number> = { GB: 2, DG: 2, DC: 4, DD: 2, MDC: 2, MC: 3, MOC: 1, AG: 2, AD: 2, BU: 2 };
  for (const [role, n] of Object.entries(need)) {
    const have = roster.filter((p) => p.roles.includes(role)).length;
    for (let i = have; i < n; i++) roster.push(generated(club, role, level, season));
  }
  return roster;
}

/* ------------------------------------------------------------------ */
/* Nouvelle partie                                                     */
/* ------------------------------------------------------------------ */

export function newGame(club: string): Save {
  const season = 2026;
  const others: Record<string, MPlayer[]> = {};
  for (const c of CLUBS) others[c.name] = buildRoster(c.name, c.level, season);
  const squad = others[club];
  delete others[club];
  const info = CLUBS.find((c) => c.name === club)!;
  const wages = squad.reduce((s, p) => s + p.wage, 0);
  const save: Save = {
    version: 1,
    club,
    season,
    phase: 'summer',
    transferBudget: info.budget,
    wageBudget: round1(wages * 1.15),
    squad,
    formation: '4-3-3',
    xi: [],
    subs: [],
    dilemmas: [],
    table: [],
    fixtures: [],
    matchday: 0,
    log: [],
    euro: UCL_CLUBS.includes(club) ? { name: 'Ligue des champions', points: 0, played: 0, stage: 'league' } : info.level >= 74 ? { name: 'Ligue Europa', points: 0, played: 0, stage: 'league' } : null,
    cup: 'Pas encore entrée',
    news: [`Tu prends les rênes de ${club} pour la saison ${season}-${String(season + 1).slice(2)} !`],
    history: [],
    others,
  };
  startSeason(save);
  save.dilemmas = summerDilemmas(save);
  autoLineup(save);
  return save;
}

function startSeason(s: Save) {
  const clubs = CLUBS.map((c) => c.name);
  s.table = clubs.map((club) => ({ club, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  s.fixtures = schedule(clubs);
  s.matchday = 0;
  s.log = [];
  s.cup = 'Pas encore entrée';
}

/** Calendrier aller-retour (méthode du cercle) */
function schedule(teams: string[]): [string, string][][] {
  const t = shuffle(teams);
  const n = t.length;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const games: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = t[i];
      const b = t[n - 1 - i];
      games.push(r % 2 ? [a, b] : [b, a]);
    }
    rounds.push(games);
    t.splice(1, 0, t.pop()!);
  }
  return [...rounds, ...rounds.map((g) => g.map(([a, b]) => [b, a] as [string, string]))];
}

/* ------------------------------------------------------------------ */
/* Mercato                                                             */
/* ------------------------------------------------------------------ */

export function slotsOf(s: Save): string[] {
  return FORMATIONS[s.formation] ?? FORMATIONS['4-3-3'];
}

/** Postes les plus faibles de l'effectif (meilleur joueur le plus faible, puis profondeur) */
export function needs(s: Save): string[] {
  const roles = [...new Set(slotsOf(s))];
  const score = (role: string) => {
    const ps = s.squad.filter((p) => fits(role, p)).sort((a, b) => b.rating - a.rating);
    const count = slotsOf(s).filter((r) => r === role).length;
    const starters = ps.slice(0, count);
    const avg = starters.length ? starters.reduce((x, p) => x + p.rating, 0) / starters.length : 50;
    return avg - (ps.length < count * 2 ? 3 : 0);
  };
  return roles.sort((a, b) => score(a) - score(b));
}

function teamLevel(s: Save): number {
  const best = [...s.squad].sort((a, b) => b.rating - a.rating).slice(0, 11);
  return best.reduce((x, p) => x + p.rating, 0) / Math.max(1, best.length);
}

export function makeSell(s: Save): Dilemma {
  const candidates = shuffle(s.squad.filter((p) => !s.dilemmas.some((d) => d.kind === 'sell' && d.options.some((o) => o.playerId === p.id))));
  const opts = candidates.slice(0, 3).map((p) => ({
    playerId: p.id,
    fee: Math.max(1, Math.round(p.value * (0.85 + rnd() * 0.45))),
    club: pick([...CLUBS.map((c) => c.name).filter((c) => c !== s.club), 'Brighton', 'Bournemouth', 'Fulham', 'Villarreal', 'Séville', 'Bologne', 'Fenerbahçe', 'Porto', 'Al-Ahli', 'Leverkusen']),
  }));
  return { kind: 'sell', options: opts };
}

export function makeBuy(s: Save, slot: string): Dilemma {
  const level = teamLevel(s);
  const owned = new Set(s.squad.map((p) => p.id));
  const offered = new Set(s.dilemmas.flatMap((d) => (d.kind === 'buy' ? d.options.map((o) => o.player.id) : [])));
  const pool: { player: MPlayer; club: string }[] = [];
  for (const f of FOOTBALLERS) {
    if (f.retired || owned.has(f.id) || offered.has(f.id) || !fitsSlot(slot, f)) continue;
    if (f.rating < level - 6 || f.rating > level + 7) continue;
    pool.push({ player: fromFootballer(f, s.season), club: f.club });
  }
  const chosen = shuffle(pool)
    .sort(() => rnd() - 0.5)
    .slice(0, 3)
    .sort((a, b) => b.player.value - a.player.value);
  while (chosen.length < 3) chosen.push({ player: generated('Libre', slot, level, s.season), club: 'Sans club' });
  // Un des trois est en fin de contrat : gratuit, mais salaire plus élevé
  const freeIdx = rnd() < 0.7 ? Math.floor(rnd() * 3) : -1;
  return {
    kind: 'buy',
    slot,
    options: chosen.map((c, i) => {
      const free = i === freeIdx;
      const player = { ...c.player, contractEnd: s.season + 2 + Math.floor(rnd() * 3), wage: free ? round1(c.player.wage * 1.6) : c.player.wage };
      return { player, club: c.club, free, fee: free ? 0 : Math.max(1, Math.round(c.player.value * (1 + rnd() * 0.25))) };
    }),
  };
}

function summerDilemmas(s: Save): Dilemma[] {
  s.dilemmas = [];
  for (let i = 0; i < 4; i++) s.dilemmas.push(makeSell(s));
  const n = needs(s);
  for (let i = 0; i < 3; i++) s.dilemmas.push(makeBuy(s, n[i % n.length]));
  s.dilemmas.push({ kind: 'pickSlot' });
  return s.dilemmas;
}

function winterDilemmas(s: Save): Dilemma[] {
  s.dilemmas = [];
  for (let i = 0; i < 2; i++) s.dilemmas.push(makeSell(s));
  s.dilemmas.push(makeBuy(s, needs(s)[0]));
  s.dilemmas.push({ kind: 'pickSlot' });
  return s.dilemmas;
}

export const wageTotal = (s: Save) => round1(s.squad.reduce((x, p) => x + p.wage, 0));

/** Réponse à un dilemme : index de l'option, ou null pour refuser / passer */
export function answerDilemma(s: Save, idx: number, choice: number | null): string | null {
  const d = s.dilemmas[idx];
  if (!d || d.done) return null;
  if (d.kind === 'sell') {
    if (choice !== null) {
      const o = d.options[choice];
      const p = s.squad.find((x) => x.id === o.playerId);
      if (!p) return 'Joueur introuvable';
      s.squad = s.squad.filter((x) => x.id !== p.id);
      s.transferBudget += o.fee;
      s.news.unshift(`💸 ${p.name} vendu à ${o.club} pour ${o.fee} M€.`);
    }
  } else if (d.kind === 'buy') {
    if (choice !== null) {
      const o = d.options[choice];
      if (o.fee > s.transferBudget) return 'Budget transferts insuffisant';
      if (wageTotal(s) + o.player.wage > s.wageBudget) return 'Masse salariale dépassée : vends ou laisse partir un joueur d’abord';
      s.transferBudget -= o.fee;
      s.squad.push(o.player);
      s.news.unshift(`✍️ ${o.player.name} signe${o.free ? ' libre' : ` pour ${o.fee} M€`} (${o.player.wage} M€/an).`);
    }
  }
  d.done = true;
  d.choice = choice;
  s.xi = s.xi.map((id) => (id && s.squad.some((p) => p.id === id) ? id : null));
  s.subs = s.subs.filter((id) => s.squad.some((p) => p.id === id));
  return null;
}

/** Le joueur choisit le poste de son dernier achat */
export function chooseSlot(s: Save, idx: number, slot: string) {
  s.dilemmas[idx] = makeBuy(s, slot);
}

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

export function autoLineup(s: Save) {
  const used = new Set<string>();
  s.xi = slotsOf(s).map((slot) => {
    const best = s.squad.filter((p) => !used.has(p.id) && fits(slot, p)).sort((a, b) => b.rating - a.rating)[0]
      ?? s.squad.filter((p) => !used.has(p.id)).sort((a, b) => b.rating - a.rating)[0];
    if (best) used.add(best.id);
    return best?.id ?? null;
  });
  s.subs = s.squad.filter((p) => !used.has(p.id)).sort((a, b) => b.rating - a.rating).slice(0, 7).map((p) => p.id);
}

/** Force du 11 : moyenne des notes, -6 pour un joueur hors de son poste, -10 par poste vide */
export function lineupStrength(s: Save): number {
  const slots = slotsOf(s);
  let total = 0;
  slots.forEach((slot, i) => {
    const p = s.squad.find((x) => x.id === s.xi[i]);
    total += p ? p.rating - (fits(slot, p) ? 0 : 6) : 55;
  });
  // Un banc de 7 joueurs apporte un petit bonus
  const bench = s.subs.map((id) => s.squad.find((p) => p.id === id)).filter(Boolean) as MPlayer[];
  const benchBonus = bench.length ? (bench.reduce((x, p) => x + p.rating, 0) / bench.length - 70) * 0.05 : -1;
  return total / slots.length + benchBonus;
}

function clubStrength(s: Save, club: string): number {
  if (club === s.club) return lineupStrength(s);
  const roster = s.others[club];
  if (!roster) return 74 + rnd() * 6;
  const best = [...roster].sort((a, b) => b.rating - a.rating).slice(0, 11);
  return best.reduce((x, p) => x + p.rating, 0) / best.length;
}

function poisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rnd();
  } while (p > L && k < 10);
  return k - 1;
}

export function playMatch(home: number, away: number, neutral = false): [number, number] {
  const diff = home - away + (neutral ? 0 : 1.5);
  const d = Math.max(-12, Math.min(12, diff));
  return [poisson(1.35 * Math.exp(d * 0.06)), poisson(1.15 * Math.exp(-d * 0.06))];
}

/* ------------------------------------------------------------------ */
/* Simulation                                                          */
/* ------------------------------------------------------------------ */

function record(t: Row[], home: string, away: string, hg: number, ag: number) {
  const h = t.find((r) => r.club === home)!;
  const a = t.find((r) => r.club === away)!;
  h.p++;
  a.p++;
  h.gf += hg;
  h.ga += ag;
  a.gf += ag;
  a.ga += hg;
  if (hg > ag) {
    h.w++;
    a.l++;
    h.pts += 3;
  } else if (hg < ag) {
    a.w++;
    h.l++;
    a.pts += 3;
  } else {
    h.d++;
    a.d++;
    h.pts++;
    a.pts++;
  }
}

export function sortedTable(s: Save): Row[] {
  return [...s.table].sort((a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf);
}

const EURO_POOL = ['Real Madrid', 'FC Barcelone', 'Bayern Munich', 'Manchester City', 'Arsenal', 'Liverpool', 'Inter', 'Juventus', 'Atlético Madrid', 'Dortmund', 'Leverkusen', 'Naples', 'AC Milan', 'Benfica', 'Porto', 'Sporting', 'PSV', 'Club Bruges', 'Tottenham', 'Chelsea', 'Aston Villa', 'Galatasaray', 'Ajax', 'Celtic'];

function euroStrength(club: string): number {
  const ps = FOOTBALLERS.filter((f) => f.club === club && !f.retired).sort((a, b) => b.rating - a.rating).slice(0, 11);
  return ps.length >= 6 ? ps.reduce((x, p) => x + p.rating, 0) / ps.length - 1 : 76;
}

function knockout(s: Save, comp: 'EU' | 'CDF', label: string, opp: string, oppStrength: number, twoLegs: boolean): boolean {
  const me = lineupStrength(s);
  if (!twoLegs) {
    const [a, b] = playMatch(me, oppStrength, label === 'Finale');
    let pens: string | undefined;
    let win = a > b;
    if (a === b) {
      win = rnd() < 0.5 + (me - oppStrength) * 0.02;
      pens = win ? '5-4 tab' : '4-5 tab';
    }
    s.log.push({ comp, label, home: s.club, away: opp, hg: a, ag: b, pens });
    return win;
  }
  const [a1, b1] = playMatch(me, oppStrength);
  const [b2, a2] = playMatch(oppStrength, me);
  s.log.push({ comp, label: `${label} (aller)`, home: s.club, away: opp, hg: a1, ag: b1 });
  let pens: string | undefined;
  let win = a1 + a2 > b1 + b2;
  if (a1 + a2 === b1 + b2) {
    win = rnd() < 0.5;
    pens = win ? '5-3 tab' : '3-5 tab';
  }
  s.log.push({ comp, label: `${label} (retour)`, home: opp, away: s.club, hg: b2, ag: a2, pens });
  return win;
}

/** Simule les journées [from, to[ du championnat */
function simLeague(s: Save, from: number, to: number) {
  for (let r = from; r < to && r < s.fixtures.length; r++) {
    for (const [h, a] of s.fixtures[r]) {
      const [hg, ag] = playMatch(clubStrength(s, h), clubStrength(s, a));
      record(s.table, h, a, hg, ag);
      if (h === s.club || a === s.club) s.log.push({ comp: 'L1', label: `J${r + 1}`, home: h, away: a, hg, ag });
    }
    s.matchday = r + 1;
  }
}

export function simulateFirstHalf(s: Save) {
  s.log = [];
  simLeague(s, 0, 17);
  if (s.euro && s.euro.stage === 'league') {
    for (const opp of shuffle(EURO_POOL).slice(0, 8)) {
      const home = rnd() < 0.5;
      const me = lineupStrength(s);
      const os = euroStrength(opp);
      const [x, y] = home ? playMatch(me, os) : playMatch(os, me);
      const [mine, theirs] = home ? [x, y] : [y, x];
      s.euro.points += mine > theirs ? 3 : mine === theirs ? 1 : 0;
      s.euro.played++;
      s.log.push({ comp: 'EU', label: `${s.euro.name} · phase de ligue`, home: home ? s.club : opp, away: home ? opp : s.club, hg: x, ag: y });
    }
    s.euro.stage = s.euro.points >= 16 ? 'r16' : s.euro.points >= 10 ? 'playoff' : 'out';
    s.news.unshift(
      s.euro.stage === 'r16'
        ? `🌟 ${s.euro.name} : ${s.euro.points} pts, qualifié directement pour les 8es !`
        : s.euro.stage === 'playoff'
          ? `${s.euro.name} : ${s.euro.points} pts, barrages en février.`
          : `❌ ${s.euro.name} : ${s.euro.points} pts, éliminé en phase de ligue.`,
    );
  }
  s.phase = 'results1';
}

export function simulateSecondHalf(s: Save) {
  s.log = [];
  // Coupe de France (à partir des 32es)
  const cupRounds: [string, number][] = [['32es de finale', 62], ['16es de finale', 66], ['8es de finale', 70], ['Quarts de finale', 73], ['Demi-finale', 75], ['Finale', 77]];
  s.cup = 'Éliminé en 32es';
  for (const [label, base] of cupRounds) {
    const opp = base < 70 ? pick(['FC Rouen', 'Le Puy Foot', 'US Concarneau', 'Bastia', 'Guingamp', 'Amiens', 'Red Star', 'Grenoble', 'Caen', 'Dunkerque']) : pick(CLUBS.map((c) => c.name).filter((c) => c !== s.club));
    const os = base < 70 ? base + rnd() * 4 : clubStrength(s, opp);
    if (!knockout(s, 'CDF', `Coupe de France · ${label}`, opp, os, false)) {
      s.cup = `Éliminé en ${label.toLowerCase()}`;
      break;
    }
    s.cup = label === 'Finale' ? '🏆 Vainqueur !' : `Qualifié après les ${label.toLowerCase()}`;
  }
  simLeague(s, 17, 34);
  // Coupe d'Europe : phases finales
  if (s.euro && s.euro.stage !== 'out') {
    const steps: [string, string][] = [['playoff', 'Barrages'], ['r16', '8es de finale'], ['qf', 'Quarts de finale'], ['sf', 'Demi-finale'], ['final', 'Finale']];
    const startAt = steps.findIndex(([k]) => k === s.euro!.stage);
    const opps = shuffle(EURO_POOL);
    for (let i = Math.max(0, startAt); i < steps.length; i++) {
      const [key, label] = steps[i];
      const opp = opps[i];
      const ok = knockout(s, 'EU', `${s.euro.name} · ${label}`, opp, euroStrength(opp) + i * 0.6, key !== 'final');
      if (!ok) {
        s.euro.stage = `Éliminé (${label.toLowerCase()})`;
        break;
      }
      s.euro.stage = key === 'final' ? '🏆 Vainqueur !' : steps[i + 1][0];
    }
  }
  s.phase = 'results2';
}

/* ------------------------------------------------------------------ */
/* Fin de saison                                                       */
/* ------------------------------------------------------------------ */

export function expiring(s: Save): MPlayer[] {
  return s.squad.filter((p) => p.contractEnd <= s.season + 1);
}

export const renewWage = (p: MPlayer) => round1(p.wage * (p.age >= 31 ? 1.05 : p.rating >= 80 ? 1.35 : 1.2));

export function renew(s: Save, id: string, keep: boolean): string | void {
  const p = s.squad.find((x) => x.id === id);
  if (!p) return;
  if (keep) {
    if (wageTotal(s) - p.wage + renewWage(p) > s.wageBudget) return 'Masse salariale dépassée : laisse partir quelqu’un d’autre d’abord';
    p.wage = renewWage(p);
    p.contractEnd = s.season + 1 + (p.age >= 31 ? 1 : 3);
    s.news.unshift(`🖊️ ${p.name} prolonge (${p.wage} M€/an jusqu’en ${p.contractEnd}).`);
  } else {
    s.squad = s.squad.filter((x) => x.id !== id);
    s.news.unshift(`👋 ${p.name} quitte le club libre.`);
  }
}

export function seasonSummary(s: Save) {
  const rank = sortedTable(s).findIndex((r) => r.club === s.club) + 1;
  const euro = s.euro ? `${s.euro.name} : ${s.euro.stage}` : '—';
  s.history.push({ season: s.season, rank, cup: s.cup, euro });
  // Primes de fin de saison
  const prize = Math.max(4, 42 - rank * 2) + (s.cup.includes('Vainqueur') ? 6 : 0) + (s.euro?.stage.includes('Vainqueur') ? 40 : 0);
  s.transferBudget += prize;
  s.news.unshift(`💰 Primes de fin de saison : +${prize} M€.`);
  s.phase = 'summary';
  return { rank, prize };
}

function age(p: MPlayer) {
  p.age++;
  const d = p.age <= 21 ? 2 + rnd() * 3 : p.age <= 24 ? rnd() * 3 : p.age <= 29 ? rnd() * 2 - 1 : p.age <= 32 ? -1 - rnd() * 2 : -2 - rnd() * 3;
  p.rating = Math.max(55, Math.min(93, Math.round(p.rating + d)));
  p.value = priceFor(p.rating, p.age);
}

export function nextSeason(s: Save) {
  const rank = s.history[s.history.length - 1]?.rank ?? 10;
  s.season++;
  s.squad.forEach(age);
  Object.values(s.others).forEach((r) => r.forEach(age));
  s.euro = rank <= 3 ? { name: 'Ligue des champions', points: 0, played: 0, stage: 'league' } : rank <= 5 ? { name: 'Ligue Europa', points: 0, played: 0, stage: 'league' } : rank === 6 ? { name: 'Ligue Conférence', points: 0, played: 0, stage: 'league' } : null;
  startSeason(s);
  s.news = [`Nouvelle saison ${s.season}-${String(s.season + 1).slice(2)} !`];
  // Centre de formation : des jeunes montent pour compléter l'effectif (2 par poste minimum)
  const level = CLUBS.find((c) => c.name === s.club)?.level ?? 72;
  const need: Record<string, number> = { GB: 2, DG: 1, DC: 3, DD: 1, MDC: 1, MC: 2, AG: 1, AD: 1, BU: 2 };
  for (const [role, n] of Object.entries(need)) {
    for (let i = s.squad.filter((p) => p.roles.includes(role)).length; i < n; i++) {
      const y = generated(s.club, role, level - 3, s.season);
      y.age = 18 + Math.floor(rnd() * 2);
      y.value = priceFor(y.rating, y.age);
      y.wage = 0.3;
      s.squad.push(y);
      s.news.push(`🌱 ${y.name} (${role}, ${y.age} ans) monte du centre de formation.`);
    }
  }
  s.dilemmas = summerDilemmas(s);
  s.xi = s.xi.map((id) => (id && s.squad.some((p) => p.id === id) ? id : null));
  if (s.xi.some((x) => !x)) autoLineup(s);
  s.phase = 'summer';
}

export function toWinter(s: Save) {
  s.dilemmas = winterDilemmas(s);
  s.phase = 'winter';
}
