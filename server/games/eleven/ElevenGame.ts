import { ELEVEN_CHALLENGES, FOOTBALLERS, type ElevenChallenge, type FootballerFull } from '../../../content/footballers';
import type { ElevenSlot, ElevenTeamResult, ElevenView, FootPos, GameAction } from '../../../shared/types';
import { GameModule } from '../GameModule';

type Settings = { challenge: string; formation: string; time: string };

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

export function buildSlots(formation: string): ElevenSlot[] {
  const [d, m, a] = FORMATIONS[formation] ?? FORMATIONS['4-3-3'];
  const rows: [FootPos, number, number][] = [['ATT', a, 16], ['MID', m, 42], ['DEF', d, 68], ['GK', 1, 88]];
  const slots: ElevenSlot[] = [];
  // Ordre GK → DEF → MID → ATT pour l'index des slots
  for (const [pos, n, y] of [...rows].reverse()) {
    for (let i = 0; i < n; i++) {
      const x = ((i + 1) / (n + 1)) * 100;
      // Légère courbe : les latéraux/ailiers sont un peu plus hauts
      const curve = n >= 4 && (i === 0 || i === n - 1) ? -4 : 0;
      slots.push({ pos, label: LABELS[pos][n]?.[i] ?? pos, x, y: y + curve });
    }
  }
  return slots;
}

interface Team {
  picks: (string | null)[];
  submitted: boolean;
}

export class ElevenGame extends GameModule<Settings> {
  private challenge!: ElevenChallenge;
  private slots: ElevenSlot[] = [];
  private pool: FootballerFull[] = [];
  private byId = new Map<string, FootballerFull>();
  private teams = new Map<string, Team>();
  private phase: 'build' | 'reveal' = 'build';
  private endsAt: number | null = null;
  private durationMs = 0;
  private results: ElevenTeamResult[] | null = null;

  start() {
    this.challenge = ELEVEN_CHALLENGES[this.settings.challenge] ?? ELEVEN_CHALLENGES.budget;
    this.slots = buildSlots(this.settings.formation);
    this.pool = FOOTBALLERS.filter((p) => !this.challenge.pool || this.challenge.pool(p)).sort((a, b) => b.rating - a.rating);
    this.byId = new Map(this.pool.map((p) => [p.id, p]));
    this.durationMs = Number(this.settings.time) * 1000;
    this.endsAt = this.now() + this.durationMs;
    this.setTimer(this.durationMs, () => this.reveal());
    this.ctx.sync();
  }

  private team(playerId: string): Team {
    let t = this.teams.get(playerId);
    if (!t) {
      t = { picks: this.slots.map(() => null), submitted: false };
      this.teams.set(playerId, t);
    }
    return t;
  }

  private spent(picks: (string | null)[]): number {
    return picks.reduce((sum, id) => sum + (id ? this.byId.get(id)?.price ?? 0 : 0), 0);
  }

  onAction(playerId: string, action: GameAction) {
    if (this.phase !== 'build') return;
    const team = this.team(playerId);

    if (action.type === 'pick') {
      const slot = this.slots[action.slot];
      const fb = this.byId.get(action.footballerId);
      if (!slot || !fb || team.submitted) return;
      if (fb.pos !== slot.pos) return;
      if (team.picks.some((id, i) => id === fb.id && i !== action.slot)) return;
      const next = [...team.picks];
      next[action.slot] = fb.id;
      if (this.spent(next) > this.challenge.budget) return;
      team.picks = next;
    } else if (action.type === 'clear') {
      if (team.submitted || !this.slots[action.slot]) return;
      team.picks[action.slot] = null;
    } else if (action.type === 'submit') {
      team.submitted = !!action.value;
      const active = this.ctx.players().filter((p) => p.connected);
      if (active.length && active.every((p) => this.teams.get(p.id)?.submitted)) {
        this.clearTimers();
        this.setTimer(800, () => this.reveal());
      }
    } else {
      return;
    }
    this.ctx.sync();
  }

  private evaluate(playerId: string, team: Team): ElevenTeamResult {
    const players = team.picks.map((id) => (id ? this.byId.get(id) ?? null : null));
    const chosen = players.filter((p): p is FootballerFull => !!p);
    const complete = chosen.length === this.slots.length;
    // Un poste vide compte pour 0 : il faut absolument compléter son équipe !
    const average = chosen.reduce((s, p) => s + p.rating, 0) / this.slots.length;
    const bonuses = this.challenge.bonuses.map((b) => ({ label: b.label, value: b.value, ok: complete && b.test(chosen) }));
    const note = Math.round((average + bonuses.reduce((s, b) => s + (b.ok ? b.value : 0), 0)) * 10) / 10;
    return {
      playerId,
      picks: team.picks,
      spent: this.spent(team.picks),
      average: Math.round(average * 10) / 10,
      note,
      bonuses,
      points: Math.round(note * 10),
      complete,
      best: false,
    };
  }

  private reveal() {
    if (this.phase !== 'build') return;
    this.clearTimers();
    this.phase = 'reveal';
    const results = this.ctx
      .players()
      .filter((p) => p.connected || this.teams.has(p.id))
      .map((p) => this.evaluate(p.id, this.team(p.id)))
      .sort((a, b) => b.note - a.note);
    const top = results[0]?.note;
    for (const r of results) {
      if (results.length > 1 && r.note === top && r.note > 0) {
        r.best = true;
        r.points += 200; // bonus du meilleur 11
      }
      this.ctx.addScore(r.playerId, r.points);
    }
    this.results = results;
    this.endsAt = this.now() + 25000;
    this.setTimer(25000, () => this.ctx.finish());
    this.ctx.sync();
  }

  skip() {
    if (this.phase === 'build') this.reveal();
    else this.ctx.finish();
  }

  view(playerId: string): ElevenView {
    const me = this.team(playerId);
    const progress: ElevenView['progress'] = {};
    for (const p of this.ctx.players()) {
      const t = this.teams.get(p.id);
      progress[p.id] = { filled: t ? t.picks.filter(Boolean).length : 0, submitted: t?.submitted ?? false };
    }
    return {
      kind: 'eleven',
      gameId: 'eleven',
      phase: this.phase,
      endsAt: this.endsAt,
      durationMs: this.phase === 'build' ? this.durationMs : 25000,
      challenge: {
        name: this.challenge.name,
        description: this.challenge.description,
        budget: this.challenge.budget,
        rules: this.challenge.rules,
        bonuses: this.challenge.bonuses.map(({ label, value }) => ({ label, value })),
      },
      formation: this.settings.formation,
      slots: this.slots,
      pool: this.pool.map(({ clubs: _clubs, ...p }) => p),
      me: { picks: me.picks, spent: this.spent(me.picks), submitted: me.submitted },
      progress,
      results: this.results,
    };
  }
}
