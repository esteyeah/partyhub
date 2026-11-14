import { PIXEL_ITEMS, type PixelCategory, type PixelItem } from '@content/pixel';
import type { PixelExtra, PixelPrompt } from '@shared/types';
import { fuzzyMatch } from '../../utils/fuzzy';
import { sample, shuffle } from '../../utils/random';
import { speedPoints } from '../GameModule';
import { RoundGame, type RoundSpec } from '../RoundGame';
import { resolveWikiImages } from './wikiImages';

type Settings = { rounds: number; time: string; category: string; mode: string };
type Item = PixelItem & { image: string };

const CATEGORY_LABELS: Record<PixelCategory, string> = {
  celeb: '⭐ Célébrité',
  game: '🎮 Jaquette de jeu vidéo',
  film: '🎬 Affiche de film',
  serie: '📺 Affiche de série',
};

/**
 * Devine l'image : l'image démarre très zoomée et floue, puis se défloute et dézoome
 * petit à petit. Plus on trouve tôt, plus on marque.
 */
export class PixelGame extends RoundGame<Item, PixelPrompt, PixelExtra, Settings> {
  readonly gameId = 'pixel' as const;
  protected revealMs = 6000;
  private pool: PixelItem[] = [];

  protected async prepare(): Promise<Item[]> {
    const cat = this.settings.category;
    this.pool = cat === 'mix' ? PIXEL_ITEMS : PIXEL_ITEMS.filter((p) => p.cat === cat);
    // Un peu plus que nécessaire au cas où certaines images manquent
    const picked = shuffle(this.pool).slice(0, this.settings.rounds + 6);
    const images = await resolveWikiImages(picked.map((p) => p.wiki));
    return picked
      .filter((p) => images.has(p.wiki))
      .map((p) => ({ ...p, image: images.get(p.wiki)! }))
      .slice(0, this.settings.rounds);
  }

  protected buildRound(item: Item): RoundSpec<PixelPrompt, PixelExtra> {
    const durationMs = Number(this.settings.time) * 1000;
    const base = {
      prompt: { image: item.image, category: item.cat, categoryLabel: CATEGORY_LABELS[item.cat] },
      durationMs,
      answer: item.name,
      extra: { image: item.image },
    };
    if (this.settings.mode === 'qcm') {
      const others = this.pool.filter((p) => p.cat === item.cat && p.name !== item.name);
      const choices = shuffle([item.name, ...sample(others, 3).map((p) => p.name)]);
      return { ...base, input: { kind: 'choice', choices, layout: 'grid' }, correctIndex: choices.indexOf(item.name) };
    }
    return {
      ...base,
      input: { kind: 'text', placeholder: 'Qui / quoi est-ce ?', keys: [{ key: 'answer', label: 'Réponse' }] },
    };
  }

  protected matchText(item: Item, guess: string, remaining: string[]) {
    if (!remaining.includes('answer')) return { found: [], close: false };
    const m = fuzzyMatch(guess, [item.name, ...(item.aliases ?? [])]);
    return { found: m === 'exact' ? ['answer'] : [], close: m === 'close' };
  }

  protected textPoints(_key: string, ms: number, order: number, spec: RoundSpec<PixelPrompt, PixelExtra>): number {
    const bonus = order === 0 ? 150 : order === 1 ? 75 : order === 2 ? 25 : 0;
    // Barème plus pentu que le quiz : trouver tôt (image floue) rapporte bien plus
    return speedPoints(ms, spec.durationMs, 1000, 0.2) + bonus;
  }
}
