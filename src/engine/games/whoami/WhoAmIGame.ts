import { WHO_ITEMS, type WhoCategory, type WhoItem } from '@content/whoami';
import type { WhoExtra, WhoPrompt } from '@shared/types';
import { fuzzyMatch } from '../../utils/fuzzy';
import { shuffle } from '../../utils/random';
import { speedPoints } from '../GameModule';
import { RoundGame, type RoundSpec } from '../RoundGame';

type Settings = { rounds: number; time: string; category: string };

const LABELS: Record<WhoCategory, string> = {
  perso: '⭐ Personnalité',
  fiction: '🦸 Personnage de fiction',
  oeuvre: '🎨 Œuvre',
};

/** Temps laissé après le dernier indice */
const LAST_CLUE_EXTRA_MS = 8000;

/**
 * Qui suis-je ? Les indices tombent un par un, du plus vague au plus évident.
 * Plus on trouve tôt (avec peu d'indices), plus on marque.
 */
export class WhoAmIGame extends RoundGame<WhoItem, WhoPrompt, WhoExtra, Settings> {
  readonly gameId = 'whoami' as const;
  protected revealMs = 7000;

  protected prepare() {
    const c = this.settings.category;
    const pool = c === 'mix' ? WHO_ITEMS : WHO_ITEMS.filter((w) => w.cat === c);
    return shuffle(pool).slice(0, this.settings.rounds);
  }

  protected buildRound(item: WhoItem): RoundSpec<WhoPrompt, WhoExtra> {
    const clueMs = Number(this.settings.time) * 1000;
    return {
      prompt: { categoryLabel: LABELS[item.cat], clues: item.clues, clueMs },
      input: { kind: 'text', placeholder: 'Qui ou quoi suis-je ?', keys: [{ key: 'answer', label: 'Réponse' }] },
      durationMs: (item.clues.length - 1) * clueMs + clueMs + LAST_CLUE_EXTRA_MS,
      answer: item.name,
      extra: {},
    };
  }

  protected matchText(item: WhoItem, guess: string, remaining: string[]) {
    if (!remaining.includes('answer')) return { found: [], close: false };
    const m = fuzzyMatch(guess, [item.name, ...(item.aliases ?? [])]);
    return { found: m === 'exact' ? ['answer'] : [], close: m === 'close' };
  }

  protected textPoints(_key: string, ms: number, order: number, spec: RoundSpec<WhoPrompt, WhoExtra>): number {
    const bonus = order === 0 ? 150 : order === 1 ? 75 : order === 2 ? 25 : 0;
    return speedPoints(ms, spec.durationMs, 1000, 0.15) + bonus;
  }
}
