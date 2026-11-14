import { ELEVEN_THEMES, FOOTBALLERS, SURPRISES, fitsSlot } from '@content/footballers';
import { QUIZ_QUESTIONS, type QuizQuestion } from '@content/quiz';
import type { ElevenOutcome, ElevenSlot, ElevenTeam, ElevenTeamResult, ElevenView, FootPos, Footballer, GameAction } from '@shared/types';

/** Les postes pour lesquels on a déjà proposé un joueur (pour varier d'une partie à l'autre) */
const recentlyOffered: string[] = [];
import { GameModule } from '../GameModule';
import { shuffle } from '../../utils/random';
import { fuzzyMatch, normalize } from '../../utils/fuzzy';

/**
 * « Compose ton 11 » en draft :
 *  1. pick    — pour chaque poste, 3 à 5 footballeurs sont proposés (prix dégressifs).
 *               Chacun choisit en secret, dans la limite de son budget.
 *  2. reveal  — les choix sont dévoilés.
 *  3. duel    — si plusieurs joueurs ont choisi le même footballeur : question foot,
 *               le plus rapide à bien répondre l'emporte (tirage au sort si personne ne trouve).
 *  4. resolve — attribution. Les perdants d'un duel reçoivent un joueur surprise gratuit :
 *               85 % un joueur du dimanche, 15 % une star qui n'était pas proposée.
 *  … poste suivant, puis notes finales.
 */

type Settings = { choices: number; budget: string; formation: string; time: string; theme: string };

const REVEAL_MS = 3500;
const DUEL_MS = 12000;
/** Phase de réponse libre au clavier avant l'affichage des 4 propositions */
const OPEN_MS = 20000;
const RESOLVE_MS = 5500;
const FINAL_MS = 30000;
const STAR_CHANCE = 0.15;
const STAR_RATING = 88;
/** Joueur « correct » : ni star ni raté */
const MID_CHANCE = 0.35;
const MID_MIN = 74;
const MID_MAX = 80;

const FORMATIONS: Record<string, [number, number, number]> = {
  '4-3-3': [4, 3, 3],
  '4-4-2': [4, 4, 2],
  '3-5-2': [3, 5, 2],
};

const LABELS: Record<FootPos, Record<number, string[]>> = {
  GK: { 1: ['GB'] },
  DEF: { 3: ['DC', 'DC', 'DC'], 4: ['DG', 'DC', 'DC', 'DD'] },
  MID: { 3: ['MC', 'MDC', 'MC'], 4: ['MG', 'MC', 'MC', 'MD'], 5: ['MG', 'MC', 'MDC', 'MC', 'MD'] },
  ATT: { 2: ['BU', 'BU'], 3: ['AG', 'BU', 'AD'] },
};

/** Postes dans l'ordre du draft : gardien → défense → milieu → attaque */
export function buildSlots(formation: string): ElevenSlot[] {
  const [d, m, a] = FORMATIONS[formation] ?? FORMATIONS['4-3-3'];
  const rows: [FootPos, number, number][] = [['GK', 1, 88], ['DEF', d, 68], ['MID', m, 42], ['ATT', a, 16]];
  const slots: ElevenSlot[] = [];
  for (const [pos, n, y] of rows) {
    for (let i = 0; i < n; i++) {
      const curve = n >= 4 && (i === 0 || i === n - 1) ? -4 : 0;
      slots.push({ pos, label: LABELS[pos][n]?.[i] ?? pos, x: ((i + 1) / (n + 1)) * 100, y: y + curve });
    }
  }
  return slots;
}


interface Duel {
  footballer: Footballer;
  players: string[];
  answers: Map<string, { choice: number; ms: number }>;
  /** Joueurs ayant trouvé au clavier pendant la phase libre (dans l'ordre) */
  openFound: string[];
  winner: string | null;
  byChance: boolean;
  /** Le gagnant a trouvé au clavier (avant les propositions) */
  byKeyboard: boolean;
}

export class ElevenGame extends GameModule<Settings> {
  private slots: ElevenSlot[] = [];
  private slotIndex = -1;
  private phase: ElevenView['phase'] = 'pick';
  private endsAt: number | null = null;
  private durationMs = 0;
  private phaseStartedAt = 0;
  private budget = 300;

  private teams = new Map<string, ElevenTeam>();
  private owned = new Set<string>();
  private offers: Footballer[] = [];
  private choices = new Map<string, string>();
  private autoPicked = new Set<string>();
  private broke = new Set<string>();
  private revealed: Record<string, string | null> | null = null;

  private duels: Duel[] = [];
  private duelQuestion: { question: string; choices: string[]; answer: number } | null = null;
  private duelStage: 'open' | 'choice' = 'open';
  private duelFeedback = new Map<string, { type: 'close' | 'wrong' | 'found'; text: string; id: number }>();
  private feedbackSeq = 0;
  private usedQuestions = new Set<string>();
  private outcomes: ElevenOutcome[] | null = null;
  private results: ElevenTeamResult[] | null = null;
  private flopSeq = 0;

  start() {
    this.budget = Number(this.settings.budget) || 300;
    this.slots = buildSlots(this.settings.formation);
    this.nextSlot();
  }

  /* ---------------- Utilitaires ---------------- */

  private themePool(): Footballer[] {
    const theme = ELEVEN_THEMES[this.settings.theme] ?? ELEVEN_THEMES.all;
    return FOOTBALLERS.filter(theme.filter);
  }

  private team(playerId: string): ElevenTeam {
    let t = this.teams.get(playerId);
    if (!t) {
      t = { picks: this.slots.map(() => null), spent: 0 };
      this.teams.set(playerId, t);
    }
    return t;
  }

  private remaining(playerId: string) {
    return this.budget - this.team(playerId).spent;
  }

  /** Joueurs qui participent au poste en cours */
  private participants(): string[] {
    return this.ctx.players().filter((p) => p.connected || this.teams.has(p.id)).map((p) => p.id);
  }

  private setPhase(phase: ElevenView['phase'], ms: number, next: () => void) {
    this.clearTimers();
    this.phase = phase;
    this.phaseStartedAt = this.now();
    this.durationMs = ms;
    this.endsAt = this.now() + ms;
    this.setTimer(ms, next);
    this.ctx.sync();
  }

  /**
   * Propositions pour le poste exact du créneau (ex : DD), variées en niveau et en prix :
   * on découpe les candidats par note et on en tire un par tranche, en évitant ceux vus récemment.
   */
  private makeOffers(slot: ElevenSlot): Footballer[] {
    const n = Math.max(3, Math.min(5, Number(this.settings.choices) || 4));
    // Thème choisi par l'hôte ; si le thème n'a pas assez de joueurs à ce poste, on complète avec tous les joueurs
    const inTheme = this.themePool().filter((p) => fitsSlot(slot.label, p) && !this.owned.has(p.id));
    const all = inTheme.length >= n ? inTheme : FOOTBALLERS.filter((p) => fitsSlot(slot.label, p) && !this.owned.has(p.id));
    const fresh = all.filter((p) => !recentlyOffered.includes(p.id));
    const candidates = (fresh.length >= n * 2 ? fresh : all).sort((a, b) => b.rating - a.rating);
    let picked: Footballer[];
    if (candidates.length <= n) picked = candidates;
    else {
      picked = [];
      for (let i = 0; i < n; i++) {
        const from = Math.floor((i * candidates.length) / n);
        const to = Math.floor(((i + 1) * candidates.length) / n);
        const bucket = candidates.slice(from, Math.max(to, from + 1));
        picked.push(bucket[Math.floor(Math.random() * bucket.length)]);
      }
    }
    recentlyOffered.push(...picked.map((p) => p.id));
    if (recentlyOffered.length > 150) recentlyOffered.splice(0, recentlyOffered.length - 150);
    return picked.sort((a, b) => b.price - a.price || b.rating - a.rating);
  }

  /** Joueur surprise pour le perdant d'un duel : une star (15 %) ou un joueur raté, au bon poste */
  private surprise(slot: ElevenSlot): { footballer: Footballer; kind: 'surprise-star' | 'surprise-mid' | 'surprise-flop' } {
    const offered = new Set(this.offers.map((o) => o.id));
    const free = (p: Footballer) => fitsSlot(slot.label, p) && !this.owned.has(p.id) && !offered.has(p.id);
    const roll = Math.random();
    if (roll < STAR_CHANCE) {
      const stars = this.themePool().filter((p) => free(p) && p.rating >= STAR_RATING);
      if (stars.length) return { footballer: stars[Math.floor(Math.random() * stars.length)], kind: 'surprise-star' };
    } else if (roll < STAR_CHANCE + MID_CHANCE) {
      const inRange = (p: Footballer) => free(p) && p.rating >= MID_MIN && p.rating <= MID_MAX;
      let mids = this.themePool().filter(inRange);
      if (!mids.length) mids = FOOTBALLERS.filter(inRange);
      if (mids.length) return { footballer: mids[Math.floor(Math.random() * mids.length)], kind: 'surprise-mid' };
    }
    return { footballer: this.surpriseFlop(slot), kind: 'surprise-flop' };
  }

  private pickDuelQuestion() {
    let pool = QUIZ_QUESTIONS.filter((q) => q.theme === 'foot' && !this.usedQuestions.has(q.question));
    if (!pool.length) {
      this.usedQuestions.clear();
      pool = QUIZ_QUESTIONS.filter((q) => q.theme === 'foot');
    }
    const q: QuizQuestion = pool[Math.floor(Math.random() * pool.length)];
    this.usedQuestions.add(q.question);
    const order = shuffle([0, 1, 2, 3]);
    return { question: q.question, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer) };
  }

  /* ---------------- Déroulé ---------------- */

  private nextSlot() {
    this.slotIndex++;
    if (this.slotIndex >= this.slots.length) return this.final();
    for (const id of this.participants()) this.team(id);
    this.offers = this.makeOffers(this.slots[this.slotIndex]);
    this.choices.clear();
    this.autoPicked.clear();
    this.broke.clear();
    this.revealed = null;
    this.duels = [];
    this.duelQuestion = null;
    this.outcomes = null;
    this.setPhase('pick', Number(this.settings.time) * 1000, () => this.closePicks());
  }

  private closePicks() {
    if (this.phase !== 'pick') return;
    // Pas de choix à temps : on prend le moins cher abordable, sinon remplaçant gratuit
    for (const id of this.participants()) {
      if (this.choices.has(id)) continue;
      const cheapest = this.offers.filter((o) => o.price <= this.remaining(id)).sort((a, b) => a.price - b.price)[0];
      if (cheapest) {
        this.choices.set(id, cheapest.id);
        this.autoPicked.add(id);
      } else this.broke.add(id);
    }
    this.revealed = Object.fromEntries(this.participants().map((id) => [id, this.choices.get(id) ?? null]));

    const groups = new Map<string, string[]>();
    for (const [pid, fid] of this.choices) groups.set(fid, [...(groups.get(fid) ?? []), pid]);
    const contested = [...groups].filter(([, ids]) => ids.length > 1);
    this.duels = contested.map(([fid, ids]) => ({
      footballer: this.offers.find((o) => o.id === fid)!,
      players: ids,
      answers: new Map(),
      openFound: [],
      winner: null,
      byChance: false,
      byKeyboard: false,
    }));
    this.setPhase('reveal', REVEAL_MS, () => (this.duels.length ? this.startDuels() : this.resolve()));
  }

  /** 1) 20 s de réponse libre au clavier ; 2) si personne n'a trouvé, 4 propositions */
  private startDuels() {
    this.duelQuestion = this.pickDuelQuestion();
    this.duelStage = 'open';
    this.duelFeedback.clear();
    this.setPhase('duel', OPEN_MS, () => this.toChoiceStage());
  }

  private toChoiceStage() {
    if (this.phase !== 'duel') return;
    if (this.duels.every((d) => d.openFound.length)) return this.resolveDuels();
    this.duelStage = 'choice';
    this.setPhase('duel', DUEL_MS, () => this.resolveDuels());
  }

  /** Réponses acceptées au clavier : la bonne réponse, et ses mots qui ne figurent dans aucune autre proposition */
  private acceptedAnswers(): string[] {
    const q = this.duelQuestion!;
    const answer = q.choices[q.answer];
    const others = new Set(q.choices.filter((_, i) => i !== q.answer).flatMap((c) => normalize(c).split(' ')));
    const words = normalize(answer).split(' ').filter((w) => w.length >= 4 && !others.has(w));
    return [answer, ...words];
  }

  private resolveDuels() {
    if (this.phase !== 'duel' || !this.duelQuestion) return;
    for (const d of this.duels) {
      if (d.openFound.length) {
        d.winner = d.openFound[0];
        d.byKeyboard = true;
        continue;
      }
      const right = [...d.answers].filter(([, a]) => a.choice === this.duelQuestion!.answer).sort((a, b) => a[1].ms - b[1].ms);
      if (right.length) d.winner = right[0][0];
      else {
        d.winner = d.players[Math.floor(Math.random() * d.players.length)];
        d.byChance = true;
      }
    }
    this.resolve();
  }

  private resolve() {
    const outcomes: ElevenOutcome[] = [];
    const give = (pid: string, footballer: Footballer, how: ElevenOutcome['how'], price: number) => {
      const t = this.team(pid);
      t.picks[this.slotIndex] = footballer;
      t.spent += price;
      if (!footballer.id.startsWith('flop-')) this.owned.add(footballer.id);
      outcomes.push({ playerId: pid, footballer, how, price });
    };
    const slot = this.slots[this.slotIndex];

    for (const pid of this.participants()) {
      const fid = this.choices.get(pid);
      if (!fid) {
        give(pid, this.surpriseFlop(slot), 'broke', 0); // budget épuisé : remplaçant gratuit
        continue;
      }
      const duel = this.duels.find((d) => d.footballer.id === fid);
      if (!duel || duel.winner === pid) {
        const fb = this.offers.find((o) => o.id === fid)!;
        give(pid, fb, duel ? 'duel' : this.autoPicked.has(pid) ? 'auto' : 'pick', fb.price);
      }
    }
    // Les perdants des duels : surprise (après les gagnants, pour ne pas leur piquer une star)
    for (const d of this.duels) {
      for (const pid of d.players) {
        if (pid === d.winner) continue;
        const s = this.surprise(slot);
        give(pid, s.footballer, s.kind, 0);
      }
    }
    this.outcomes = outcomes;
    this.setPhase('resolve', RESOLVE_MS, () => this.nextSlot());
  }

  private surpriseFlop(slot: ElevenSlot): Footballer {
    const used = new Set([...this.teams.values()].flatMap((t) => t.picks.filter(Boolean).map((p) => p!.name)));
    const fit = SURPRISES.filter((f) => fitsSlot(slot.label, f));
    const sameLine = SURPRISES.filter((f) => f.pos === slot.pos);
    const pool = (fit.length ? fit : sameLine.length ? sameLine : SURPRISES).filter((f) => !used.has(f.name));
    const list = pool.length ? pool : fit.length ? fit : SURPRISES;
    const f = list[Math.floor(Math.random() * list.length)];
    return { ...f, id: `${f.id}-${++this.flopSeq}` };
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
    this.offers = [];
    this.setPhase('final', FINAL_MS, () => this.ctx.finish());
  }

  /* ---------------- Actions ---------------- */

  onAction(playerId: string, action: GameAction) {
    if (this.phase === 'pick' && action.type === 'pick') {
      const fb = this.offers.find((o) => o.id === action.footballerId);
      if (!fb || fb.price > this.remaining(playerId)) return;
      this.team(playerId);
      this.choices.set(playerId, fb.id);
      const everyone = this.participants().filter((id) => this.ctx.players().find((p) => p.id === id)?.connected);
      if (everyone.length && everyone.every((id) => this.choices.has(id))) {
        this.clearTimers();
        this.setTimer(700, () => this.closePicks());
      }
      this.ctx.sync();
    } else if (this.phase === 'duel' && this.duelStage === 'open' && action.type === 'guess' && this.duelQuestion) {
      const duel = this.duels.find((d) => d.players.includes(playerId));
      if (!duel || duel.openFound.length) return; // un seul gagnant par duel
      const m = fuzzyMatch(String(action.text ?? '').slice(0, 80), this.acceptedAnswers());
      if (m === 'exact') {
        duel.openFound.push(playerId);
        this.duelFeedback.set(playerId, { type: 'found', text: 'Bonne réponse ! ⚡', id: ++this.feedbackSeq });
        if (this.duels.every((d) => d.openFound.length)) {
          this.clearTimers();
          this.setTimer(900, () => this.resolveDuels());
        }
      } else {
        this.duelFeedback.set(playerId, m === 'close'
          ? { type: 'close', text: 'Presque ! Vérifie l’orthographe 👀', id: ++this.feedbackSeq }
          : { type: 'wrong', text: 'Non, essaie encore', id: ++this.feedbackSeq });
      }
      this.ctx.sync();
    } else if (this.phase === 'duel' && this.duelStage === 'choice' && action.type === 'answer' && this.duelQuestion) {
      const duel = this.duels.find((d) => d.players.includes(playerId));
      if (!duel || duel.answers.has(playerId)) return;
      if (!Number.isInteger(action.choice) || action.choice < 0 || action.choice > 3) return;
      duel.answers.set(playerId, { choice: action.choice, ms: this.now() - this.phaseStartedAt });
      const connected = new Set(this.ctx.players().filter((p) => p.connected).map((p) => p.id));
      const done = this.duels.every((d) => d.players.filter((id) => connected.has(id)).every((id) => d.answers.has(id)));
      if (done) {
        this.clearTimers();
        this.setTimer(700, () => this.resolveDuels());
      }
      this.ctx.sync();
    }
  }

  skip() {
    if (this.phase === 'pick') this.closePicks();
    else if (this.phase === 'reveal') this.duels.length ? this.startDuels() : this.resolve();
    else if (this.phase === 'duel') this.duelStage === 'open' ? this.toChoiceStage() : this.resolveDuels();
    else if (this.phase === 'resolve') this.nextSlot();
    else this.ctx.finish();
  }

  view(playerId: string): ElevenView {
    const myDuel = this.duels.find((d) => d.players.includes(playerId));
    const showAnswers = this.phase === 'resolve';
    return {
      kind: 'eleven',
      gameId: 'eleven',
      phase: this.phase,
      endsAt: this.endsAt,
      durationMs: this.durationMs,
      formation: this.settings.formation,
      slots: this.slots,
      slotIndex: Math.min(this.slotIndex, this.slots.length - 1),
      budget: this.budget,
      offers: this.offers,
      teams: Object.fromEntries(this.teams),
      picked: [...this.choices.keys()],
      me: {
        choice: this.choices.get(playerId) ?? null,
        duelChoice: myDuel?.answers.get(playerId)?.choice ?? null,
        duelFeedback: this.duelFeedback.get(playerId) ?? null,
      },
      duelStage: this.duelStage,
      choices: this.revealed,
      duelQuestion: this.duelQuestion
        ? {
            question: this.duelQuestion.question,
            // Pendant la phase libre, les propositions restent cachées
            choices: this.phase === 'duel' && this.duelStage === 'open' ? [] : this.duelQuestion.choices,
            correctIndex: showAnswers ? this.duelQuestion.answer : null,
          }
        : null,
      duels: this.duels.map((d) => ({
        footballer: d.footballer,
        players: d.players,
        answered: [...d.answers.keys()],
        found: d.openFound,
        answers: showAnswers ? Object.fromEntries(d.players.map((id) => [id, d.answers.get(id)?.choice ?? null])) : null,
        winner: showAnswers ? d.winner : null,
        byChance: showAnswers && d.byChance,
        byKeyboard: showAnswers && d.byKeyboard,
      })),
      outcomes: this.outcomes,
      results: this.results,
    };
  }
}
