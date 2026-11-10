import { VIDEO_QUESTIONS, type VideoQuestion } from '@content/video';
import type { VideoExtra, VideoPrompt } from '@shared/types';
import { shuffle } from '../../utils/random';
import { RoundGame, type RoundSpec } from '../RoundGame';

type Settings = { rounds: number; time: string };

export class VideoGame extends RoundGame<VideoQuestion, VideoPrompt, VideoExtra, Settings> {
  readonly gameId = 'video' as const;

  protected prepare() {
    return shuffle(VIDEO_QUESTIONS).slice(0, this.settings.rounds);
  }

  protected buildRound(q: VideoQuestion): RoundSpec<VideoPrompt, VideoExtra> {
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
