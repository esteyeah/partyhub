import { MEMES, type MemeQuestion } from '@content/memes';
import { VIDEO_QUESTIONS, type VideoQuestion } from '@content/video';
import type { VideoExtra, VideoPrompt } from '@shared/types';
import { loadCustomVideoQuestions } from '../../customContent';
import { shuffle } from '../../utils/random';
import { RoundGame, type RoundSpec } from '../RoundGame';

type Settings = { rounds: number; time: string; source: string };
type Item = VideoQuestion | MemeQuestion;
const isMeme = (x: Item): x is MemeQuestion => 'text' in x;

export class VideoGame extends RoundGame<Item, VideoPrompt, VideoExtra, Settings> {
  readonly gameId = 'video' as const;

  protected async prepare() {
    const videos: Item[] = this.settings.source === 'memes' ? [] : [...VIDEO_QUESTIONS, ...(await loadCustomVideoQuestions())];
    const memes: Item[] = this.settings.source === 'videos' ? [] : MEMES;
    if (this.settings.source !== 'mix') return shuffle([...videos, ...memes]).slice(0, this.settings.rounds);
    // Mélange : autant de vidéos que de mèmes (si possible), puis on alterne
    const half = Math.ceil(this.settings.rounds / 2);
    const v = shuffle(videos).slice(0, Math.max(half, this.settings.rounds - memes.length));
    const m = shuffle(memes).slice(0, this.settings.rounds - v.length);
    return shuffle([...v, ...m]);
  }

  protected buildRound(q: Item): RoundSpec<VideoPrompt, VideoExtra> {
    if (isMeme(q)) {
      const order = shuffle(q.choices.map((_, i) => i));
      return {
        prompt: { quote: { text: q.text, source: q.source }, question: 'Complète la réplique' },
        input: { kind: 'choice', choices: order.map((i) => q.choices[i]), layout: 'grid' },
        durationMs: Number(this.settings.time) * 1000,
        correctIndex: order.indexOf(q.answer),
        answer: q.choices[q.answer],
        extra: { fullQuote: q.text.replace('…', q.choices[q.answer]) },
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
