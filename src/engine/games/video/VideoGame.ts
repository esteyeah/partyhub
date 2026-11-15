import { MEMES, type MemeQuestion } from '@content/memes';
import { VIDEO_QUESTIONS, type VideoQuestion } from '@content/video';
import type { VideoExtra, VideoPrompt } from '@shared/types';
import { loadCustomVideoQuestions } from '../../customContent';
import { fuzzyMatch, normalize } from '../../utils/fuzzy';
import { shuffle } from '../../utils/random';
import { speedPoints } from '../GameModule';
import { RoundGame, type RoundSpec } from '../RoundGame';

type Settings = { rounds: number; time: string; source: string; mode?: string };
type Item = VideoQuestion | MemeQuestion;
const isMeme = (x: Item): x is MemeQuestion => 'text' in x;

export class VideoGame extends RoundGame<Item, VideoPrompt, VideoExtra, Settings> {
  readonly gameId = 'video' as const;

  protected async prepare() {
    const videos: Item[] = this.settings.source === 'memes' ? [] : [...VIDEO_QUESTIONS, ...(await loadCustomVideoQuestions())];
    const memes: Item[] =
      this.settings.source === 'videos' ? []
      : this.settings.source === 'sequels' ? MEMES.filter((m) => m.kind === 'sequel')
      : this.settings.source === 'quotes' ? MEMES.filter((m) => m.kind !== 'sequel')
      : MEMES;
    if (this.settings.source !== 'mix') return shuffle([...videos, ...memes]).slice(0, this.settings.rounds);
    // Mélange : autant de vidéos que de mèmes (si possible), puis on alterne
    const half = Math.ceil(this.settings.rounds / 2);
    const v = shuffle(videos).slice(0, Math.max(half, this.settings.rounds - memes.length));
    const m = shuffle(memes).slice(0, this.settings.rounds - v.length);
    return shuffle([...v, ...m]);
  }

  protected buildRound(q: Item): RoundSpec<VideoPrompt, VideoExtra> {
    const spec = this.buildChoiceRound(q);
    if (this.settings.mode !== 'libre' || spec.input?.kind !== 'choice') return spec;
    // Réponse libre : on retire les propositions, il faut taper la réponse
    const clipMs = isMeme(q) ? 0 : Math.max(0, q.clip.end - q.clip.start) * 1000;
    return {
      ...spec,
      input: { kind: 'text', placeholder: 'Ta réponse…', keys: [{ key: 'answer', label: 'Réponse' }] },
      durationMs: Math.max(spec.durationMs, clipMs + 20_000),
      correctIndex: undefined,
    };
  }

  /** Réponses acceptées : la bonne réponse et ses mots propres (absents des autres propositions) */
  private accepted(q: Item): string[] {
    const answer = q.choices[q.answer];
    const others = new Set(q.choices.filter((_, i) => i !== q.answer).flatMap((c) => normalize(c).split(' ')));
    const words = normalize(answer).split(' ').filter((w) => w.length >= 4 && !others.has(w));
    return [answer, ...words];
  }

  protected matchText(q: Item, guess: string, remaining: string[]) {
    if (!remaining.includes('answer')) return { found: [], close: false };
    const m = fuzzyMatch(guess, this.accepted(q));
    return { found: m === 'exact' ? ['answer'] : [], close: m === 'close' };
  }

  protected textPoints(_key: string, ms: number, order: number, spec: RoundSpec<VideoPrompt, VideoExtra>): number {
    const bonus = order === 0 ? 150 : order === 1 ? 75 : order === 2 ? 25 : 0;
    return speedPoints(ms, spec.durationMs) + bonus;
  }

  private buildChoiceRound(q: Item): RoundSpec<VideoPrompt, VideoExtra> {
    if (isMeme(q)) {
      const order = shuffle(q.choices.map((_, i) => i));
      return {
        prompt: { quote: { text: q.text, source: q.source }, question: q.kind === 'sequel' ? 'Quel film vient ensuite ?' : 'Complète la réplique' },
        input: { kind: 'choice', choices: order.map((i) => q.choices[i]), layout: 'grid' },
        durationMs: Number(this.settings.time) * 1000,
        correctIndex: order.indexOf(q.answer),
        answer: q.choices[q.answer],
        extra: { fullQuote: q.text.replace('…', q.kind === 'sequel' ? `« ${q.choices[q.answer]} »` : q.choices[q.answer]) },
      };
    }
    const clipSeconds = Math.max(0, q.clip.end - q.clip.start);
    const revealSeconds = q.revealClip ? Math.max(0, q.revealClip.end - q.revealClip.start) : 0;
    return {
      prompt: { clip: q.clip, question: q.question },
      input: { kind: 'choice', choices: q.choices, layout: 'grid' },
      // Le chrono de vote démarre avec l'extrait : durée de l'extrait + temps de vote
      durationMs: (clipSeconds + Number(this.settings.time)) * 1000,
      correctIndex: q.answer,
      answer: q.choices[q.answer],
      extra: { revealClip: q.revealClip, explanation: q.explanation },
      revealMs: Math.max(6000, (revealSeconds + 4) * 1000),
    };
  }
}
