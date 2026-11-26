import { MEMES, type MemeQuestion } from '@content/memes';
import { VIDEO_QUESTIONS, type VideoQuestion } from '@content/video';
import type { VideoExtra, VideoPrompt } from '@shared/types';
import { loadCustomVideoQuestions } from '../../customContent';
import { fuzzyMatch, normalize } from '../../utils/fuzzy';
import { shuffle } from '../../utils/random';
import { speedPoints } from '../GameModule';
import { RoundGame, type RoundSpec } from '../RoundGame';

/** Marge pour le chargement du lecteur YouTube */
const LOAD_BUFFER_S = 20;

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
    if (this.settings.source !== 'mix') return this.fresh([...videos, ...memes]).slice(0, this.settings.rounds);
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
    const vote = Math.max(spec.voteMs ?? spec.durationMs, 20_000);
    return {
      ...spec,
      input: { kind: 'text', placeholder: 'Ta réponse…', keys: [{ key: 'answer', label: 'Réponse' }] },
      durationMs: spec.durationMs - (spec.voteMs ?? spec.durationMs) + vote,
      voteMs: spec.voteMs ? vote : undefined,
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
    if (m === 'exact') return { found: ['answer'], close: false };
    // Un morceau d'au moins 2 mots de la bonne réponse suffit (« tequila heineken »)
    const g = normalize(guess).split(' ').filter(Boolean);
    const words = normalize(q.choices[q.answer]).split(' ').filter(Boolean);
    if (g.length >= 2) {
      const windows: string[] = [];
      for (let i = 0; i + g.length <= words.length; i++) windows.push(words.slice(i, i + g.length).join(' '));
      const w = fuzzyMatch(guess, windows);
      if (w === 'exact') return { found: ['answer'], close: false };
      if (w === 'close') return { found: [], close: true };
    }
    return { found: [], close: m === 'close' };
  }

  /** Points comptés à partir de la coupure de l'extrait (le temps de visionnage ne pénalise pas) */
  private voteTime(ms: number, spec: RoundSpec<VideoPrompt, VideoExtra>) {
    const vote = spec.voteMs ?? spec.durationMs;
    // Temps compté à partir de l'arrêt de l'extrait
    const before = this.voteStartedAt !== null ? this.voteStartedAt - (this.now() - ms) : ms;
    return { ms: Math.max(0, ms - before), duration: vote };
  }

  protected scoreChoice(_q: Item, spec: RoundSpec<VideoPrompt, VideoExtra>, choice: number, ms: number) {
    const t = this.voteTime(ms, spec);
    const correct = choice === spec.correctIndex;
    return { correct, points: correct ? speedPoints(t.ms, t.duration) : 0 };
  }

  protected textPoints(_key: string, ms: number, order: number, spec: RoundSpec<VideoPrompt, VideoExtra>): number {
    const bonus = order === 0 ? 150 : order === 1 ? 75 : order === 2 ? 25 : 0;
    const t = this.voteTime(ms, spec);
    return speedPoints(t.ms, t.duration) + bonus;
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
      // Extrait + marge de chargement, puis le chrono de vote (affiché seulement à la coupure)
      // Sécurité si l'arrêt de l'extrait n'est jamais signalé (le chrono démarre normalement à la coupure)
      durationMs: (clipSeconds + LOAD_BUFFER_S + Number(this.settings.time)) * 1000,
      voteMs: Number(this.settings.time) * 1000,
      correctIndex: q.answer,
      answer: q.choices[q.answer],
      extra: { revealClip: q.revealClip, explanation: q.explanation },
      revealMs: Math.max(6000, (revealSeconds + 4) * 1000),
    };
  }
}
