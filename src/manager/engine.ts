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
import { FOOTBALLERS, ageFactor, fitsSlot, priceFor } from '@content/footballers';
import { TM_SQUADS as TM_FR_EN } from '@content/tmSquads';
import { TM_SQUADS_ES } from '@content/tmSquadsEs';
import { TM_SQUADS_DE } from '@content/tmSquadsDe';
const TM_SQUADS: Record<string, string[]> = { ...TM_FR_EN, ...TM_SQUADS_ES, ...TM_SQUADS_DE };
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
  /** Statistiques de la saison en cours (matchs joués, buts, passes, somme des notes) */
  st?: { apps: number; goals: number; assists: number; rsum: number };
  /** Bilan de la saison précédente */
  last?: { apps: number; goals: number; assists: number; avg: number };
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
  /** Championnat (anciennes sauvegardes : Ligue 1) */
  league?: LeagueId;
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
  /** Classement de la phase de ligue européenne (36 équipes) */
  euroTable?: { club: string; pts: number; gd: number }[];
  /** Matchs de coupe d'Europe et de coupe nationale de la saison */
  euroLog?: MatchLine[];
  cupLog?: MatchLine[];
  /** Message des dirigeants en fin de saison */
  board?: string;
  /** Mercato : sondages d'achat et tentatives de vente restants */
  scouts?: number;
  saleTries?: number;
  pendingBuy?: { player: MPlayer; club: string; fee: number; free: boolean } | null;
  pendingSale?: { playerId: string; offers: { club: string; fee: number; tone: 'basse' | 'correcte' | 'belle' }[] } | null;
}

/* ------------------------------------------------------------------ */
/* Clubs                                                               */
/* ------------------------------------------------------------------ */

export type LeagueId = 'L1' | 'PL' | 'LL' | 'BL';

export const LEAGUES: Record<LeagueId, { name: string; dataLeague: string; cup: string; amateurs: string[] }> = {
  L1: { name: 'Ligue 1', dataLeague: 'Ligue 1', cup: 'Coupe de France', amateurs: ['FC Rouen', 'Le Puy Foot', 'US Concarneau', 'Bastia', 'Guingamp', 'Amiens', 'Red Star', 'Grenoble', 'Caen', 'Dunkerque'] },
  LL: { name: 'La Liga', dataLeague: 'La Liga', cup: 'Copa del Rey', amateurs: ['Burgos', 'Sporting Gijón', 'Real Saragosse', 'Almería', 'Cádiz', 'Huesca', 'Albacete', 'Eibar', 'Leganés', 'Córdoba'] },
  BL: { name: 'Bundesliga', dataLeague: 'Bundesliga', cup: 'Coupe d’Allemagne', amateurs: ['Hertha Berlin', 'Fortuna Düsseldorf', 'Hanovre 96', 'Kaiserslautern', 'Nuremberg', 'Karlsruhe', 'Darmstadt', 'Hansa Rostock', 'Dynamo Dresde', 'Arminia Bielefeld'] },
  PL: { name: 'Premier League', dataLeague: 'Premier League', cup: 'FA Cup', amateurs: ['Wrexham', 'Stockport County', 'Plymouth Argyle', 'Barnsley', 'Wigan', 'Bolton', 'Portsmouth', 'Sheffield Wednesday', 'Derby County', 'Blackburn'] },
};

export const PL_CLUBS: { name: string; level: number; budget: number }[] = [
  { name: 'Arsenal', level: 83, budget: 150 },
  { name: 'Liverpool', level: 83, budget: 150 },
  { name: 'Manchester City', level: 83, budget: 180 },
  { name: 'Chelsea', level: 81, budget: 150 },
  { name: 'Manchester United', level: 80, budget: 130 },
  { name: 'Tottenham', level: 80, budget: 120 },
  { name: 'Aston Villa', level: 79, budget: 90 },
  { name: 'Newcastle', level: 79, budget: 100 },
  { name: 'Crystal Palace', level: 77, budget: 60 },
  { name: 'Brighton', level: 77, budget: 70 },
  { name: 'Bournemouth', level: 76, budget: 50 },
  { name: 'Nottingham Forest', level: 76, budget: 60 },
  { name: 'Brentford', level: 75, budget: 45 },
  { name: 'Fulham', level: 75, budget: 45 },
  { name: 'Everton', level: 75, budget: 50 },
  { name: 'Sunderland', level: 74, budget: 40 },
  { name: 'Leeds', level: 73, budget: 40 },
  { name: 'Coventry City', level: 72, budget: 30 },
  { name: 'Ipswich Town', level: 72, budget: 30 },
  { name: 'Hull City', level: 71, budget: 25 },
];

export const LL_CLUBS: { name: string; level: number; budget: number }[] = [
  { name: 'Real Madrid', level: 84, budget: 180 },
  { name: 'FC Barcelone', level: 83, budget: 120 },
  { name: 'Atlético Madrid', level: 80, budget: 100 },
  { name: 'Villarreal', level: 77, budget: 50 },
  { name: 'Real Betis', level: 76, budget: 40 },
  { name: 'Athletic Bilbao', level: 76, budget: 40 },
  { name: 'Real Sociedad', level: 76, budget: 40 },
  { name: 'Celta Vigo', level: 74, budget: 25 },
  { name: 'Séville', level: 74, budget: 25 },
  { name: 'Valence', level: 74, budget: 25 },
  { name: 'Getafe', level: 72, budget: 12 },
  { name: 'Osasuna', level: 72, budget: 15 },
  { name: 'Rayo Vallecano', level: 72, budget: 12 },
  { name: 'Espanyol', level: 72, budget: 15 },
  { name: 'Alavés', level: 71, budget: 12 },
  { name: 'Elche', level: 71, budget: 12 },
  { name: 'Levante', level: 70, budget: 10 },
  { name: 'Deportivo La Corogne', level: 70, budget: 12 },
  { name: 'Racing Santander', level: 69, budget: 8 },
  { name: 'Málaga', level: 69, budget: 8 },
];

export const BL_CLUBS: { name: string; level: number; budget: number }[] = [
  { name: 'Bayern Munich', level: 84, budget: 150 },
  { name: 'Dortmund', level: 80, budget: 80 },
  { name: 'Leverkusen', level: 79, budget: 70 },
  { name: 'RB Leipzig', level: 79, budget: 70 },
  { name: 'Stuttgart', level: 77, budget: 45 },
  { name: 'Eintracht Francfort', level: 77, budget: 45 },
  { name: 'Hoffenheim', level: 75, budget: 30 },
  { name: 'Fribourg', level: 75, budget: 30 },
  { name: 'Mönchengladbach', level: 74, budget: 25 },
  { name: 'Werder Brême', level: 74, budget: 20 },
  { name: 'Mayence', level: 73, budget: 20 },
  { name: 'Augsbourg', level: 73, budget: 18 },
  { name: 'Union Berlin', level: 73, budget: 18 },
  { name: 'Cologne', level: 72, budget: 15 },
  { name: 'Hambourg', level: 72, budget: 15 },
  { name: 'Schalke 04', level: 71, budget: 15 },
  { name: 'Elversberg', level: 69, budget: 8 },
  { name: 'Paderborn', level: 69, budget: 8 },
];

export const clubsOf = (league: LeagueId = 'L1') => (league === 'PL' ? PL_CLUBS : league === 'LL' ? LL_CLUBS : league === 'BL' ? BL_CLUBS : CLUBS);

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
  { name: 'Auxerre', level: 70, budget: 10 },
  { name: 'Lorient', level: 70, budget: 10 },
  { name: 'Le Havre', level: 70, budget: 10 },
  { name: 'Angers', level: 70, budget: 8 },
  { name: 'Troyes', level: 70, budget: 12 },
  { name: 'Le Mans', level: 69, budget: 8 },
];

export const FORMATIONS: Record<string, string[]> = {
  '4-1-4-1': ['GB', 'DG', 'DC', 'DC', 'DD', 'MDC', 'MG', 'MC', 'MC', 'MD', 'BU'],
  '4-4-2 losange': ['GB', 'DG', 'DC', 'DC', 'DD', 'MDC', 'MC', 'MC', 'MOC', 'BU', 'BU'],
  '4-3-1-2': ['GB', 'DG', 'DC', 'DC', 'DD', 'MC', 'MDC', 'MC', 'MOC', 'BU', 'BU'],
  '3-4-3': ['GB', 'DC', 'DC', 'DC', 'MG', 'MC', 'MC', 'MD', 'AG', 'BU', 'AD'],
  '5-3-2': ['GB', 'DG', 'DC', 'DC', 'DC', 'DD', 'MC', 'MDC', 'MC', 'BU', 'BU'],
  '5-4-1': ['GB', 'DG', 'DC', 'DC', 'DC', 'DD', 'MG', 'MC', 'MC', 'MD', 'BU'],
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

const slugify = (n: string) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

const norm = (n: string) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const BY_NAME = new Map(FOOTBALLERS.filter((f) => !f.retired).map((f) => [norm(f.name), f]));

/** Effectif réel (Transfermarkt) : la note vient de la base si le joueur y est, sinon de sa valeur marchande et de son âge */
function tmPlayers(club: string, season: number): MPlayer[] | null {
  const rows = TM_SQUADS[club];
  if (!rows) return null;
  return rows.map((line) => {
    const [name, flag, role, value, year, contract] = line.split(';');
    const age = season - Number(year);
    const v = Math.max(0.2, Number(value));
    const known = BY_NAME.get(norm(name));
    const rating = known
      ? known.rating
      : Math.max(55, Math.min(88, Math.round(70 + Math.log(v / (3 * ageFactor(age))) / 0.185)));
    const roles = known ? [role, ...known.roles.filter((r) => r !== role)] : [role];
    return {
      id: known?.id ?? `tm-${slugify(name)}`,
      name,
      pos: POS_OF[role],
      roles,
      rating,
      age,
      flag,
      value: Math.round(v * 10) / 10,
      wage: wageFor(v, rating),
      contractEnd: Math.max(season + 1, Number(contract) || season + 2),
    };
  });
}

/** Effectif de départ d'un club : ses vrais joueurs (base + compléments). Un joueur généré seulement s'il manque un gardien. */
function buildRoster(club: string, level: number, season: number, dataLeague = 'Ligue 1'): MPlayer[] {
  const tm = tmPlayers(club, season);
  const roster = tm ?? FOOTBALLERS.filter((f) => f.league === dataLeague && f.club === club && !f.retired).map((f) => fromFootballer(f, season));
  for (let i = roster.filter((p) => p.roles.includes('GB')).length; i < 2; i++) roster.push(generated(club, 'GB', level, season));
  return roster;
}

/** Coupes d'Europe 2026-27 des clubs français (qualifications réelles) */
const FIRST_SEASON_EURO: Record<string, string> = {
  PSG: 'Ligue des champions',
  Lens: 'Ligue des champions',
  Lille: 'Ligue des champions',
  Marseille: 'Ligue Europa',
  Lyon: 'Ligue Europa',
  Rennes: 'Ligue Europa',
  Monaco: 'Ligue Conférence',
  // Premier League
  Arsenal: 'Ligue des champions',
  Liverpool: 'Ligue des champions',
  'Manchester City': 'Ligue des champions',
  'Aston Villa': 'Ligue des champions',
  'Manchester United': 'Ligue des champions',
  Bournemouth: 'Ligue Europa',
  Sunderland: 'Ligue Europa',
  'Crystal Palace': 'Ligue Europa',
  Brighton: 'Ligue Conférence',
  // La Liga (classement 2025-26)
  'FC Barcelone': 'Ligue des champions',
  'Real Madrid': 'Ligue des champions',
  Villarreal: 'Ligue des champions',
  'Atlético Madrid': 'Ligue des champions',
  'Real Betis': 'Ligue des champions',
  'Real Sociedad': 'Ligue Europa',
  'Celta Vigo': 'Ligue Europa',
  Getafe: 'Ligue Conférence',
  // Bundesliga (classement 2025-26)
  'Bayern Munich': 'Ligue des champions',
  Dortmund: 'Ligue des champions',
  'RB Leipzig': 'Ligue des champions',
  Stuttgart: 'Ligue des champions',
  Hoffenheim: 'Ligue Europa',
  Leverkusen: 'Ligue Europa',
  Fribourg: 'Ligue Conférence',
};

/* ------------------------------------------------------------------ */
/* Nouvelle partie                                                     */
/* ------------------------------------------------------------------ */

export function newGame(club: string, league: LeagueId = 'L1'): Save {
  const CLUBS = clubsOf(league);
  const season = 2026;
  const others: Record<string, MPlayer[]> = {};
  for (const c of CLUBS) others[c.name] = buildRoster(c.name, c.level, season, LEAGUES[league].dataLeague);
  const squad = others[club];
  delete others[club];
  const info = CLUBS.find((c) => c.name === club)!;
  const wages = squad.reduce((s, p) => s + p.wage, 0);
  const save: Save = {
    version: 1,
    league,
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
    euro: FIRST_SEASON_EURO[club] ? { name: FIRST_SEASON_EURO[club], points: 0, played: 0, stage: 'league' } : null,
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
  const clubs = clubsOf(s.league).map((c) => c.name);
  s.table = clubs.map((club) => ({ club, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  s.fixtures = schedule(clubs);
  s.matchday = 0;
  s.log = [];
  s.cup = 'Pas encore entrée';
  s.euroLog = [];
  s.cupLog = [];
  s.euroTable = [];
  for (const p of s.squad) p.st = { apps: 0, goals: 0, assists: 0, rsum: 0 };
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
    club: pick([...clubsOf(s.league).map((c) => c.name).filter((c) => c !== s.club), 'Brighton', 'Bournemouth', 'Fulham', 'Villarreal', 'Séville', 'Bologne', 'Fenerbahçe', 'Porto', 'Al-Ahli', 'Leverkusen']),
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
  s.scouts = 3;
  s.saleTries = 3;
  s.pendingBuy = null;
  s.pendingSale = null;
  for (let i = 0; i < 4; i++) s.dilemmas.push(makeSell(s));
  const n = needs(s);
  for (let i = 0; i < 3; i++) s.dilemmas.push(makeBuy(s, n[i % n.length]));
  s.dilemmas.push({ kind: 'pickSlot' });
  return s.dilemmas;
}

function winterDilemmas(s: Save): Dilemma[] {
  s.dilemmas = [];
  s.scouts = 2;
  s.saleTries = 2;
  s.pendingBuy = null;
  s.pendingSale = null;
  for (let i = 0; i < 2; i++) s.dilemmas.push(makeSell(s));
  s.dilemmas.push(makeBuy(s, needs(s)[0]));
  s.dilemmas.push({ kind: 'pickSlot' });
  return s.dilemmas;
}

function removeFromOthers(s: Save, id: string) {
  for (const c of Object.keys(s.others)) s.others[c] = s.others[c].filter((p) => p.id !== id);
}

/* ---------------- Sondages et ventes libres ---------------- */

/** Tous les joueurs qu'on peut sonder : autres clubs du championnat + reste de la base */
export function market(s: Save): { player: MPlayer; club: string }[] {
  const out: { player: MPlayer; club: string }[] = [];
  const seen = new Set(s.squad.map((p) => p.id));
  for (const [club, roster] of Object.entries(s.others)) for (const p of roster) if (!seen.has(p.id)) (seen.add(p.id), out.push({ player: p, club }));
  for (const f of FOOTBALLERS) if (!f.retired && !seen.has(f.id)) (seen.add(f.id), out.push({ player: fromFootballer(f, s.season), club: f.club }));
  return out;
}

/** Sonder un joueur : son club annonce un prix (plus bas en fin de contrat, gratuit s'il est libre) */
export function scout(s: Save, playerId: string): string | void {
  if (!s.scouts) return 'Plus de sondage disponible pour ce mercato';
  const m = market(s).find((x) => x.player.id === playerId);
  if (!m) return 'Joueur introuvable';
  s.scouts--;
  const free = m.club === 'Sans club' || m.club === 'Libre';
  const endSoon = m.player.contractEnd <= s.season + 1;
  const ask = free ? 0 : Math.max(1, Math.round(m.player.value * (endSoon ? 0.5 + rnd() * 0.3 : 1.05 + rnd() * 0.45)));
  const player = { ...m.player, contractEnd: s.season + 2 + Math.floor(rnd() * 3), wage: free ? round1(m.player.wage * 1.5) : m.player.wage };
  s.pendingBuy = { player, club: m.club, fee: ask, free };
}

export function answerScout(s: Save, accept: boolean): string | void {
  const b = s.pendingBuy;
  if (!b) return;
  if (accept) {
    if (b.fee > s.transferBudget) return 'Budget transferts insuffisant';
    if (wageTotal(s) + b.player.wage > s.wageBudget) return 'Masse salariale dépassée';
    s.transferBudget -= b.fee;
    s.squad.push(b.player);
    removeFromOthers(s, b.player.id);
    s.news.unshift(`✍️ ${b.player.name} arrive de ${b.club}${b.free ? ' (libre)' : ` pour ${b.fee} M€`}.`);
  } else s.news.unshift(`🙅 Tu refuses les ${b.fee} M€ demandés pour ${b.player.name}.`);
  s.pendingBuy = null;
}

/** Mettre un joueur sur le marché : offres variées (souvent basses, parfois correctes, rarement belles) */
export function trySell(s: Save, playerId: string): string | void {
  if (!s.saleTries) return 'Plus de tentative de vente pour ce mercato';
  const p = s.squad.find((x) => x.id === playerId);
  if (!p) return 'Joueur introuvable';
  s.saleTries--;
  const buyers = shuffle([...Object.keys(s.others), 'Brighton', 'Villarreal', 'Séville', 'Bologne', 'Fenerbahçe', 'Porto', 'Al-Ahli', 'Leverkusen', 'Benfica', 'Galatasaray']).slice(0, 3);
  const n = 1 + Math.floor(rnd() * 3);
  const offers = buyers.slice(0, n).map((club) => {
    const r = rnd();
    const tone: 'basse' | 'correcte' | 'belle' = r < 0.5 ? 'basse' : r < 0.85 ? 'correcte' : 'belle';
    const f = tone === 'basse' ? 0.45 + rnd() * 0.3 : tone === 'correcte' ? 0.85 + rnd() * 0.25 : 1.15 + rnd() * 0.35;
    return { club, fee: Math.max(1, Math.round(p.value * f)), tone };
  });
  s.pendingSale = { playerId, offers: offers.sort((a, b) => b.fee - a.fee) };
}

export function answerSale(s: Save, idx: number | null) {
  const sale = s.pendingSale;
  if (!sale) return;
  const p = s.squad.find((x) => x.id === sale.playerId);
  if (p && idx !== null) {
    const o = sale.offers[idx];
    s.squad = s.squad.filter((x) => x.id !== p.id);
    s.transferBudget += o.fee;
    s.xi = s.xi.map((id) => (id === p.id ? null : id));
    s.subs = s.subs.filter((id) => id !== p.id);
    s.news.unshift(`💸 ${p.name} vendu à ${o.club} pour ${o.fee} M€.`);
  } else if (p) s.news.unshift(`🙅 Tu refuses les offres pour ${p.name}.`);
  s.pendingSale = null;
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
      removeFromOthers(s, o.player.id);
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

/** Coordonnées des postes (largeur, profondeur) pour mesurer la distance entre deux postes */
const SPOT: Record<string, [number, number]> = {
  GB: [0, 0], DG: [-1, 1], DC: [0, 1], DD: [1, 1], MDC: [0, 2], MC: [0, 2.5], MOC: [0, 3], MG: [-1, 2.7], MD: [1, 2.7], AG: [-1, 3.6], AD: [1, 3.6], BU: [0, 4],
};
/** Malus de note quand un joueur joue hors de son poste : léger s'il est proche (MC en MDC), énorme pour un gardien */
export function posPenalty(slot: string, p: MPlayer): number {
  if (fits(slot, p)) return 0;
  const gk = slot === 'GB';
  if (gk !== p.roles.includes('GB') && (gk || p.roles[0] === 'GB')) return 20;
  let best = 99;
  for (const r of p.roles) {
    const a = SPOT[r];
    const b = SPOT[slot];
    if (!a || !b) continue;
    best = Math.min(best, Math.round((Math.abs(a[0] - b[0]) * 1.3 + Math.abs(a[1] - b[1])) * 3));
  }
  return Math.max(1, Math.min(15, best));
}

export function autoLineup(s: Save) {
  const used = new Set<string>();
  s.xi = slotsOf(s).map((slot) => {
    const best = s.squad.filter((p) => !used.has(p.id)).sort((a, b) => b.rating - posPenalty(slot, b) - (a.rating - posPenalty(slot, a)))[0];
    if (best) used.add(best.id);
    return best?.id ?? null;
  });
  s.subs = s.squad.filter((p) => !used.has(p.id)).sort((a, b) => b.rating - a.rating).slice(0, 7).map((p) => p.id);
}

/** Force du 11 : moyenne des notes, moins le malus de poste de chaque joueur */
export function lineupStrength(s: Save): number {
  const slots = slotsOf(s);
  let total = 0;
  slots.forEach((slot, i) => {
    const p = s.squad.find((x) => x.id === s.xi[i]);
    total += p ? p.rating - posPenalty(slot, p) : 55;
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

/** Adversaires européens : jamais un club du même championnat */
function euroPool(s: Save): string[] {
  const own = new Set(clubsOf(s.league).map((c) => c.name));
  return [...EURO_POOL, 'PSG', 'Marseille', 'Monaco', 'Lille', 'Lens', 'Lyon', 'Villarreal', 'Real Betis', 'Real Sociedad', 'Athletic Bilbao'].filter((c) => !own.has(c));
}

const EURO_EXTRA = ['Feyenoord', 'Celtic', 'Rangers', 'Olympiakos', 'Fenerbahçe', 'Besiktas', 'Shakhtar Donetsk', 'Slavia Prague', 'Bodø/Glimt', 'Salzbourg', 'Young Boys', 'Dinamo Zagreb', 'Étoile rouge', 'Copenhague', 'AZ Alkmaar', 'Braga', 'Union Saint-Gilloise', 'Sparta Prague', 'Ferencváros', 'Midtjylland', 'Viking', 'AEK Athènes', 'LASK', 'Stuttgart', 'RB Leipzig', 'Como', 'AS Roma', 'Lazio', 'Fiorentina', 'Sporting Braga', 'Anderlecht', 'Gand'];

function euroStrength(club: string): number {
  const ps = FOOTBALLERS.filter((f) => f.club === club && !f.retired).sort((a, b) => b.rating - a.rating).slice(0, 11);
  return ps.length >= 6 ? ps.reduce((x, p) => x + p.rating, 0) / ps.length - 1 : 76;
}

function knockout(s: Save, comp: 'EU' | 'CDF', label: string, opp: string, oppStrength: number, twoLegs: boolean): boolean {
  const me = lineupStrength(s);
  const push = (m: MatchLine) => {
    s.log.push(m);
    (comp === 'EU' ? (s.euroLog ??= []) : (s.cupLog ??= [])).push(m);
  };
  if (!twoLegs) {
    const [a, b] = playMatch(me, oppStrength, label.endsWith('Finale') && !label.includes('Demi'));
    let pens: string | undefined;
    let win = a > b;
    if (a === b) {
      win = rnd() < 0.5 + (me - oppStrength) * 0.02;
      pens = win ? 'qualifié aux tirs au but' : 'éliminé aux tirs au but';
    }
    push({ comp, label: `${label} · ${win ? '✅ qualifié' : '❌ éliminé'}`, home: s.club, away: opp, hg: a, ag: b, pens });
    matchStats(s, a, b);
    return win;
  }
  const [a1, b1] = playMatch(me, oppStrength);
  const [b2, a2] = playMatch(oppStrength, me);
  matchStats(s, a1, b1);
  matchStats(s, a2, b2);
  let win = a1 + a2 > b1 + b2;
  let pens: string | undefined;
  if (a1 + a2 === b1 + b2) {
    win = rnd() < 0.5 + (me - oppStrength) * 0.02;
    pens = win ? 'qualifié aux tirs au but' : 'éliminé aux tirs au but';
  }
  push({ comp, label: `${label} (aller)`, home: s.club, away: opp, hg: a1, ag: b1 });
  push({ comp, label: `${label} (retour) · cumul ${a1 + a2}-${b1 + b2} ${win ? '✅ qualifié' : '❌ éliminé'}`, home: opp, away: s.club, hg: b2, ag: a2, pens });
  return win;
}

const GOAL_W: Record<string, number> = { GB: 0, DG: 0.15, DD: 0.15, DC: 0.2, MDC: 0.3, MC: 0.6, MOC: 1.2, MG: 0.9, MD: 0.9, AG: 1.6, AD: 1.6, BU: 2.6 };
const ASSIST_W: Record<string, number> = { GB: 0.05, DG: 0.6, DD: 0.6, DC: 0.2, MDC: 0.5, MC: 1, MOC: 1.6, MG: 1.2, MD: 1.2, AG: 1.4, AD: 1.4, BU: 0.9 };
function weighted<T>(items: T[], w: (x: T) => number): T | null {
  const total = items.reduce((x, i) => x + w(i), 0);
  if (total <= 0) return null;
  let r = rnd() * total;
  for (const i of items) if ((r -= w(i)) <= 0) return i;
  return items[items.length - 1];
}
/** Statistiques individuelles d'un match de notre équipe */
function matchStats(s: Save, mine: number, theirs: number) {
  const slots = slotsOf(s);
  const starters = s.xi.map((id, i) => ({ p: s.squad.find((x) => x.id === id), slot: slots[i] })).filter((x) => x.p) as { p: MPlayer; slot: string }[];
  const bench = shuffle(s.subs.map((id) => s.squad.find((x) => x.id === id)).filter(Boolean) as MPlayer[]).slice(0, 3);
  const goals = new Map<string, number>();
  const assists = new Map<string, number>();
  for (let g = 0; g < mine; g++) {
    const sc = weighted(starters, (x) => GOAL_W[x.slot] * (x.p.rating / 80));
    if (!sc) continue;
    goals.set(sc.p.id, (goals.get(sc.p.id) ?? 0) + 1);
    if (rnd() < 0.75) {
      const as = weighted(starters.filter((x) => x !== sc), (x) => ASSIST_W[x.slot]);
      if (as) assists.set(as.p.id, (assists.get(as.p.id) ?? 0) + 1);
    }
  }
  const base = 6.3 + (mine - theirs) * 0.25;
  for (const { p, slot } of starters) {
    const defensive = slot === 'GB' || slot.startsWith('D');
    let note = base + (rnd() - 0.5) * 1.2 + (p.rating - 75) * 0.03 + (goals.get(p.id) ?? 0) * 0.9 + (assists.get(p.id) ?? 0) * 0.5 - posPenalty(slot, p) * 0.05;
    if (defensive) note += theirs === 0 ? 0.6 : -0.2 * theirs;
    const st = (p.st ??= { apps: 0, goals: 0, assists: 0, rsum: 0 });
    st.apps++;
    st.goals += goals.get(p.id) ?? 0;
    st.assists += assists.get(p.id) ?? 0;
    st.rsum += Math.max(3.5, Math.min(10, note));
  }
  for (const p of bench) {
    const st = (p.st ??= { apps: 0, goals: 0, assists: 0, rsum: 0 });
    st.apps++;
    st.rsum += Math.max(4.5, Math.min(8.5, 6.2 + (mine - theirs) * 0.15 + (rnd() - 0.5)));
  }
}
const ours = (s: Save, home: string, hg: number, ag: number) => (home === s.club ? [hg, ag] : [ag, hg]);

/** Simule les journées [from, to[ du championnat */
function simLeague(s: Save, from: number, to: number) {
  for (let r = from; r < to && r < s.fixtures.length; r++) {
    for (const [h, a] of s.fixtures[r]) {
      const [hg, ag] = playMatch(clubStrength(s, h), clubStrength(s, a));
      record(s.table, h, a, hg, ag);
      if (h === s.club || a === s.club) {
        s.log.push({ comp: 'L1', label: `J${r + 1}`, home: h, away: a, hg, ag });
        const [m, t] = ours(s, h, hg, ag);
        matchStats(s, m, t);
      }
    }
    s.matchday = r + 1;
  }
}

export function simulateFirstHalf(s: Save) {
  s.log = [];
  simLeague(s, 0, s.fixtures.length / 2);
  if (s.euro && s.euro.stage === 'league') {
    // Phase de ligue à 36 : 8 matchs chacun, classement complet
    const field = [...shuffle(euroPool(s)), ...EURO_EXTRA.filter((c) => !clubsOf(s.league).some((x) => x.name === c))].filter((c, i, arr) => arr.indexOf(c) === i && c !== s.club).slice(0, 35);
    const rows = new Map<string, { club: string; pts: number; gd: number }>([[s.club, { club: s.club, pts: 0, gd: 0 }]]);
    for (const c of field) rows.set(c, { club: c, pts: 0, gd: 0 });
    const strength = (c: string) => (c === s.club ? lineupStrength(s) : euroStrength(c));
    let gd = 0;
    for (const opp of shuffle(field).slice(0, 8)) {
      const home = rnd() < 0.5;
      const [x, y] = home ? playMatch(strength(s.club), strength(opp)) : playMatch(strength(opp), strength(s.club));
      const [mine, theirs] = home ? [x, y] : [y, x];
      s.euro.points += mine > theirs ? 3 : mine === theirs ? 1 : 0;
      gd += mine - theirs;
      s.euro.played++;
      const m: MatchLine = { comp: 'EU', label: `${s.euro.name} · phase de ligue (J${s.euro.played})`, home: home ? s.club : opp, away: home ? opp : s.club, hg: x, ag: y };
      s.log.push(m);
      (s.euroLog ??= []).push(m);
      matchStats(s, mine, theirs);
    }
    rows.get(s.club)!.pts = s.euro.points;
    rows.get(s.club)!.gd = gd;
    for (const c of field) {
      const r = rows.get(c)!;
      for (let k = 0; k < 8; k++) {
        const [x, y] = playMatch(strength(c), euroStrength(pick(field)), rnd() < 0.5);
        r.pts += x > y ? 3 : x === y ? 1 : 0;
        r.gd += x - y;
      }
    }
    s.euroTable = [...rows.values()].sort((p, q) => q.pts - p.pts || q.gd - p.gd);
    const rank = s.euroTable.findIndex((r) => r.club === s.club) + 1;
    s.euro.stage = rank <= 8 ? 'r16' : rank <= 24 ? 'playoff' : 'out';
    s.news.unshift(
      s.euro.stage === 'r16'
        ? `🌟 ${s.euro.name} : ${s.euro.points} pts (${s.euroTable!.findIndex((r) => r.club === s.club) + 1}e), qualifié directement pour les 8es !`
        : s.euro.stage === 'playoff'
          ? `${s.euro.name} : ${s.euro.points} pts, barrages en février.`
          : `❌ ${s.euro.name} : ${s.euro.points} pts, éliminé en phase de ligue.`,
    );
  }
  s.phase = 'results1';
}

export function simulateSecondHalf(s: Save) {
  s.log = [];
  // Coupe nationale (à partir des 32es)
  const L = LEAGUES[s.league ?? 'L1'];
  const cupRounds: [string, number][] = [['32es de finale', 62], ['16es de finale', 66], ['8es de finale', 70], ['Quarts de finale', 73], ['Demi-finale', 75], ['Finale', 77]];
  s.cup = 'Éliminé en 32es';
  for (const [label, base] of cupRounds) {
    const opp = base < 70 ? pick(L.amateurs) : pick(clubsOf(s.league).map((c) => c.name).filter((c) => c !== s.club));
    const os = base < 70 ? base + rnd() * 4 : clubStrength(s, opp);
    if (!knockout(s, 'CDF', `${L.cup} · ${label}`, opp, os, false)) {
      s.cup = `Éliminé en ${label.toLowerCase()}`;
      break;
    }
    s.cup = label === 'Finale' ? '🏆 Vainqueur !' : `Qualifié après les ${label.toLowerCase()}`;
  }
  simLeague(s, s.fixtures.length / 2, s.fixtures.length);
  // Coupe d'Europe : phases finales
  if (s.euro && s.euro.stage !== 'out') {
    const steps: [string, string][] = [['playoff', 'Barrages'], ['r16', '8es de finale'], ['qf', 'Quarts de finale'], ['sf', 'Demi-finale'], ['final', 'Finale']];
    const startAt = steps.findIndex(([k]) => k === s.euro!.stage);
    const opps = shuffle(euroPool(s));
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

export const avgRating = (p: MPlayer) => (p.st && p.st.apps ? p.st.rsum / p.st.apps : null);

/** Salaire de prolongation : dépend de l'âge et des performances (un trentenaire moyen accepte souvent une baisse) */
export function renewWage(p: MPlayer): number {
  const avg = avgRating(p) ?? 6.6;
  let f = p.age <= 23 ? 1.15 : p.age <= 29 ? 1.05 : p.age <= 32 ? 0.9 : 0.75;
  f += avg >= 7.3 ? 0.2 : avg >= 6.9 ? 0.08 : avg < 6.3 ? -0.12 : 0;
  if ((p.st?.apps ?? 0) < 8) f -= 0.1;
  const market = wageFor(p.value, p.rating);
  return round1(Math.max(0.3, Math.min(p.wage * f, market * 1.3)));
}

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
  const prize = Math.max(4, (s.league === 'PL' ? 90 : s.league === 'LL' || s.league === 'BL' ? 60 : 42) - rank * (s.league === 'L1' ? 2 : s.league === 'LL' || s.league === 'BL' ? 3 : 4)) + (s.cup.includes('Vainqueur') ? 6 : 0) + (s.euro?.stage.includes('Vainqueur') ? 40 : 0);
  s.transferBudget += prize;
  s.news.unshift(`💰 Primes de fin de saison : +${prize} M€.`);
  // Les dirigeants jugent la saison : résultat attendu selon le niveau du club
  const order = [...clubsOf(s.league)].sort((a, b) => b.level - a.level).map((c) => c.name);
  const expected = order.indexOf(s.club) + 1;
  const diff = expected - rank;
  const euroBonus = s.euro?.stage.includes('Vainqueur') ? 0.1 : s.euro && !['out', 'league'].includes(s.euro.stage) && !s.euro.stage.includes('phase') ? 0.04 : 0;
  const wageF = Math.max(-0.08, Math.min(0.12, diff * 0.015)) + euroBonus + (s.cup.includes('Vainqueur') ? 0.03 : 0);
  const transferAdj = Math.round(diff * (s.league === 'PL' ? 4 : s.league === 'LL' || s.league === 'BL' ? 3 : 2));
  s.wageBudget = round1(s.wageBudget * (1 + wageF));
  s.transferBudget = Math.max(0, s.transferBudget + transferAdj);
  s.board =
    diff >= 3
      ? `🎉 Les dirigeants sont ravis (${rank}e, objectif ${expected}e) : +${transferAdj} M€ de transferts et masse salariale +${Math.round(wageF * 100)} %.`
      : diff <= -3
        ? `😠 Les dirigeants sont déçus (${rank}e, objectif ${expected}e) : ${transferAdj} M€ de transferts et masse salariale ${Math.round(wageF * 100)} %.`
        : `🙂 Saison conforme aux attentes (${rank}e, objectif ${expected}e). Masse salariale ${wageF >= 0 ? '+' : ''}${Math.round(wageF * 100)} %, transferts ${transferAdj >= 0 ? '+' : ''}${transferAdj} M€.`;
  s.news.unshift(s.board);
  s.phase = 'summary';
  return { rank, prize };
}

function age(p: MPlayer) {
  p.age++;
  const avg = p.st && p.st.apps >= 8 ? p.st.rsum / p.st.apps : null;
  const perf = avg === null ? 0 : avg >= 7.3 ? 2 : avg >= 6.9 ? 1 : avg < 6.2 ? -1 : 0;
  if (p.st) p.last = { apps: p.st.apps, goals: p.st.goals, assists: p.st.assists, avg: avg ?? 0 };
  const d = perf + p.age <= 21 ? 2 + rnd() * 3 : p.age <= 24 ? rnd() * 3 : p.age <= 29 ? rnd() * 2 - 1 : p.age <= 32 ? -1 - rnd() * 2 : -2 - rnd() * 3;
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
  const level = clubsOf(s.league).find((c) => c.name === s.club)?.level ?? 72;
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
