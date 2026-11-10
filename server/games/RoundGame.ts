import type {
  FeedItem,
  GameAction,
  GameId,
  GameSettings,
  ProgressStatus,
  RoundGameView,
  RoundInput,
  RoundPhase,
  RoundResult,
} from '../../shared/types';
import { GameModule, speedPoints } from './GameModule';

/** Description d'une manche, construite par chaque jeu à partir de son contenu. */
export interface RoundSpec<P, X> {
  prompt: P;
  input: RoundInput;
  durationMs: number;
  /** Libellé de la bonne réponse affiché au reveal */
  answer: string;
  /** Pour les QCM */
  correctIndex?: number;
  extra?: X;
  /** Durée du reveal (ex : plus longue pour rejouer la fin d'une vidéo) */
  revealMs?: number;
}

interface PlayerRoundState {
  choice: number | null;
  choiceMs: number;
  /** clé trouvée -> points gagnés */
  found: Map<string, number>;
  points: number;
  correct: boolean;
  label?: string;
  feedback: RoundGameView['me']['feedback'];
}

export interface ChoiceScore {
  points: number;
  correct: boolean;
}

/**
 * Moteur commun aux jeux "à manches" : intro → question (chrono) → reveal → manche suivante.
 * Gère : QCM ou réponse libre multi-clés, fin anticipée quand tout le monde a répondu,
 * statistiques de votes, fil d'actualité ("Léa a trouvé l'artiste !"), passage forcé par l'hôte.
 *
 * Un jeu concret n'a qu'à implémenter `prepare()` et `buildRound()`,
 * et éventuellement surcharger le calcul des points.
 */
export abstract class RoundGame<Item, P, X = unknown, S extends GameSettings = GameSettings> extends GameModule<S> {
  abstract readonly gameId: GameId;

  protected introMs = 3000;
  protected revealMs = 6000;

  protected items: Item[] = [];
  private index = -1;
  private phase: RoundPhase = 'loading';
  private endsAt: number | null = null;
  private startedAt = 0;
  private spec: RoundSpec<P, X> | null = null;
  private states = new Map<string, PlayerRoundState>();
  private results: RoundResult[] = [];
  private stats: number[] | null = null;
  private feed: FeedItem[] = [];
  private feedId = 0;
  private message?: string;

  /** Charge et tire au sort le contenu de la partie. */
  protected abstract prepare(): Promise<Item[]> | Item[];
  protected abstract buildRound(item: Item, index: number): RoundSpec<P, X>;

  /** Points d'une réponse QCM (par défaut : bonne réponse + rapidité). */
  protected scoreChoice(_item: Item, spec: RoundSpec<P, X>, choice: number, ms: number): ChoiceScore {
    const correct = choice === spec.correctIndex;
    return { correct, points: correct ? speedPoints(ms, spec.durationMs) : 0 };
  }

  /** Réponse libre : renvoie les clés trouvées par cette proposition (ou 'close'). */
  protected matchText(_item: Item, _guess: string, _remaining: string[]): { found: string[]; close: boolean } {
    return { found: [], close: false };
  }

  /** Points pour une clé trouvée en réponse libre. `order` = 0 si premier à la trouver. */
  protected textPoints(_key: string, ms: number, order: number, spec: RoundSpec<P, X>): number {
    const bonus = order === 0 ? 150 : order === 1 ? 75 : order === 2 ? 25 : 0;
    return speedPoints(ms, spec.durationMs, 500) + bonus;
  }

  /* ------------------------------------------------------------ */

  async start() {
    this.ctx.sync();
    try {
      this.items = await this.prepare();
    } catch (err) {
      console.error(`[${this.gameId}] prepare failed`, err);
      this.items = [];
    }
    if (this.destroyed) return;
    if (!this.items.length) {
      this.message = 'Aucun contenu disponible pour ce jeu — il est passé.';
      this.ctx.sync();
      this.setTimer(3500, () => this.ctx.finish());
      return;
    }
    this.nextRound();
  }

  private nextRound() {
    this.clearTimers();
    this.index++;
    if (this.index >= this.items.length) {
      this.ctx.finish();
      return;
    }
    this.spec = this.buildRound(this.items[this.index], this.index);
    this.states.clear();
    this.results = [];
    this.stats = null;
    this.feed = [];
    this.phase = 'intro';
    this.endsAt = this.now() + this.introMs;
    this.setTimer(this.introMs, () => this.startQuestion());
    this.ctx.sync();
  }

  private startQuestion() {
    if (!this.spec) return;
    this.clearTimers();
    this.phase = 'question';
    this.startedAt = this.now();
    this.endsAt = this.startedAt + this.spec.durationMs;
    this.setTimer(this.spec.durationMs, () => this.reveal());
    this.ctx.sync();
  }

  private state(playerId: string): PlayerRoundState {
    let s = this.states.get(playerId);
    if (!s) {
      s = { choice: null, choiceMs: 0, found: new Map(), points: 0, correct: false, feedback: null };
      this.states.set(playerId, s);
    }
    return s;
  }

  private keys(): string[] {
    return this.spec?.input.kind === 'text' ? this.spec.input.keys.map((k) => k.key) : [];
  }

  private isDone(playerId: string): boolean {
    const s = this.states.get(playerId);
    if (!s || !this.spec) return false;
    if (this.spec.input.kind === 'choice') return s.choice !== null;
    return this.keys().every((k) => s.found.has(k));
  }

  onAction(playerId: string, action: GameAction) {
    if (this.phase !== 'question' || !this.spec) return;
    const item = this.items[this.index];
    const ms = this.now() - this.startedAt;
    const s = this.state(playerId);

    if (action.type === 'answer' && this.spec.input.kind === 'choice') {
      if (s.choice !== null) return; // réponse verrouillée
      const n = this.spec.input.choices.length;
      if (!Number.isInteger(action.choice) || action.choice < 0 || action.choice >= n) return;
      s.choice = action.choice;
      s.choiceMs = ms;
      s.label = this.spec.input.choices[action.choice];
      const score = this.scoreChoice(item, this.spec, action.choice, ms);
      s.points = score.points;
      s.correct = score.correct;
    } else if (action.type === 'guess' && this.spec.input.kind === 'text') {
      const text = String(action.text ?? '').slice(0, 120);
      const remaining = this.keys().filter((k) => !s.found.has(k));
      if (!text.trim() || !remaining.length) return;
      const res = this.matchText(item, text, remaining);
      const newly = res.found.filter((k) => remaining.includes(k));
      if (newly.length) {
        const labels: string[] = [];
        for (const key of newly) {
          const order = [...this.states.values()].filter((o) => o.found.has(key)).length;
          const pts = this.textPoints(key, ms, order, this.spec);
          s.found.set(key, pts);
          s.points += pts;
          labels.push(this.spec.input.keys.find((k) => k.key === key)?.label.toLowerCase() ?? key);
        }
        s.correct = true;
        const all = this.isDone(playerId);
        s.feedback = { type: 'found', text: all ? 'Bravo, tout trouvé ! 🎉' : `Bien joué : ${labels.join(' + ')} ✅`, id: ++this.feedId };
        const who = this.ctx.nickname(playerId);
        this.pushFeed(all && this.keys().length > 1 && s.found.size === newly.length
          ? `${who} a tout trouvé d’un coup ! 🔥`
          : all ? `${who} a tout trouvé ! ⚡` : `${who} a trouvé : ${labels.join(' + ')} ⚡`);
      } else {
        s.feedback = res.close
          ? { type: 'close', text: 'Presque ! Vérifie l’orthographe 👀', id: ++this.feedId }
          : { type: 'wrong', text: 'Non, essaie encore', id: ++this.feedId };
      }
    } else {
      return;
    }

    const active = this.ctx.players().filter((p) => p.connected);
    if (active.length && active.every((p) => this.isDone(p.id))) {
      this.clearTimers();
      this.setTimer(600, () => this.reveal());
    }
    this.ctx.sync();
  }

  private pushFeed(text: string) {
    this.feed = [...this.feed, { id: ++this.feedId, text }].slice(-6);
  }

  private reveal() {
    if (!this.spec || this.phase !== 'question') return;
    this.clearTimers();
    this.phase = 'reveal';

    if (this.spec.input.kind === 'choice') {
      this.stats = this.spec.input.choices.map(() => 0);
      for (const s of this.states.values()) if (s.choice !== null) this.stats[s.choice]++;
    }

    const players = this.ctx.players();
    this.results = players
      .filter((p) => p.connected || this.states.has(p.id))
      .map((p) => {
        const s = this.states.get(p.id);
        if (s?.points) this.ctx.addScore(p.id, s.points);
        const label = this.spec!.input.kind === 'text' && s
          ? [...s.found.keys()].map((k) => (this.spec!.input as { keys: { key: string; label: string }[] }).keys.find((x) => x.key === k)?.label).join(' + ') || undefined
          : s?.label;
        return { playerId: p.id, points: s?.points ?? 0, correct: s?.correct ?? false, label, ms: s?.choiceMs };
      })
      .sort((a, b) => b.points - a.points);

    const duration = this.spec.revealMs ?? this.revealMs;
    this.endsAt = this.now() + duration;
    this.setTimer(duration, () => this.nextRound());
    this.ctx.sync();
  }

  skip() {
    if (this.phase === 'intro') this.startQuestion();
    else if (this.phase === 'question') this.reveal();
    else if (this.phase === 'reveal') this.nextRound();
  }

  view(playerId: string): RoundGameView<P, X> {
    const spec = this.spec;
    const progress: Record<string, ProgressStatus> = {};
    for (const p of this.ctx.players()) {
      const s = this.states.get(p.id);
      if (!s) progress[p.id] = 'waiting';
      else if (this.isDone(p.id)) progress[p.id] = spec?.input.kind === 'text' ? 'done' : 'answered';
      else progress[p.id] = s.found.size ? 'partial' : 'waiting';
    }
    const me = this.states.get(playerId);
    const showQuestion = this.phase === 'question' || this.phase === 'reveal';

    return {
      kind: 'round',
      gameId: this.gameId,
      phase: this.phase,
      round: Math.max(1, this.index + 1),
      totalRounds: this.items.length,
      endsAt: this.endsAt,
      durationMs: this.phase === 'intro' ? this.introMs : this.phase === 'reveal' ? spec?.revealMs ?? this.revealMs : spec?.durationMs ?? 0,
      prompt: showQuestion ? spec?.prompt ?? null : null,
      input: showQuestion ? spec?.input ?? null : null,
      progress,
      feed: this.feed,
      me: {
        locked: this.isDone(playerId),
        choice: me?.choice ?? null,
        found: me ? [...me.found.keys()] : [],
        feedback: me?.feedback ?? null,
      },
      reveal:
        this.phase === 'reveal' && spec
          ? {
              correctIndex: spec.correctIndex ?? null,
              answer: spec.answer,
              stats: this.stats,
              results: this.results,
              extra: spec.extra ?? null,
            }
          : null,
      message: this.message,
    };
  }
}
