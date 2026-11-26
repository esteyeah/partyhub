import { ORDER_THEMES, type OrderItem, type OrderTheme } from '@content/order';
import type { OrderExtra, OrderPrompt } from '@shared/types';
import { shuffle } from '../../utils/random';
import { RoundGame, type RoundSpec } from '../RoundGame';

type Settings = { rounds: number; time: string };
type Round = { theme: OrderTheme; picked: OrderItem[]; q: string };

const COUNT = 7;
/** Points perdus par rang d'écart */
export const GAP_COST = 50;

const cmp = (a: OrderItem, b: OrderItem) =>
  typeof a.value === 'string' || typeof b.value === 'string'
    ? String(a.value).localeCompare(String(b.value), 'fr', { sensitivity: 'base' })
    : a.value - b.value;

/** Tire 7 propositions de valeurs toutes différentes */
function pick(theme: OrderTheme): OrderItem[] {
  const out: OrderItem[] = [];
  for (const i of shuffle(theme.items)) if (out.length < COUNT && !out.some((o) => cmp(o, i) === 0)) out.push(i);
  return out;
}

/**
 * Classe 7 : remettre 7 propositions dans l'ordre.
 * Score : 1000 − 50 × (somme des écarts de rang), +200 pour un sans-faute.
 */
export class OrderGame extends RoundGame<Round, OrderPrompt, OrderExtra, Settings> {
  readonly gameId = 'order' as const;
  protected revealMs = 12000;

  protected historyId(r: unknown) {
    return (r as Round)?.theme?.id ?? (r as OrderTheme)?.id;
  }

  protected prepare(): Round[] {
    // Les thèmes « rares » (ordre alphabétique) n'ont qu'une chance sur trois d'être gardés
    const pool = ORDER_THEMES.filter((t) => !t.rare || Math.random() < 0.34);
    return this.fresh(pool)
      .slice(0, this.settings.rounds)
      .map((theme) => ({ theme, q: theme.q, picked: pick(theme) }));
  }

  /** Ordre correct : indices des propositions affichées, du 1er au dernier */
  private correct(r: Round): number[] {
    const idx = r.picked.map((_, i) => i).sort((a, b) => cmp(r.picked[a], r.picked[b]));
    return r.theme.dir === 'asc' ? idx : idx.reverse();
  }

  protected buildRound(r: Round): RoundSpec<OrderPrompt, OrderExtra> {
    const good = this.correct(r);
    return {
      prompt: { question: r.theme.q },
      input: { kind: 'order', items: r.picked.map((p) => p.label), top: r.theme.top, bottom: r.theme.bottom },
      durationMs: Number(this.settings.time) * 1000,
      answer: good.map((i, k) => `${k + 1}. ${r.picked[i].label}`).join(' · '),
      extra: { correct: good, shows: r.picked.map((p) => p.show ?? '') },
    };
  }

  protected scoreOrder(r: Round, _spec: RoundSpec<OrderPrompt, OrderExtra>, order: number[]) {
    const good = this.correct(r);
    const gap = order.reduce((sum, item, rank) => sum + Math.abs(rank - good.indexOf(item)), 0);
    return {
      points: Math.max(0, 1000 - GAP_COST * gap) + (gap === 0 ? 200 : 0),
      correct: gap === 0,
      label: gap === 0 ? 'Sans faute !' : `${gap} rang${gap > 1 ? 's' : ''} d’écart`,
    };
  }
}
