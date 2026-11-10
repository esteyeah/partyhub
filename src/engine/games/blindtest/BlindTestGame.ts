import { BLIND_TRACKS, type BlindTrack } from '@content/blindtest';
import type { BlindExtra, BlindPrompt } from '@shared/types';
import { fuzzyMatch } from '../../utils/fuzzy';
import { sample, shuffle } from '../../utils/random';
import { RoundGame, type RoundSpec } from '../RoundGame';
import { resolvePreview } from './itunes';

type Settings = { mode: string; rounds: number; time: string; genre: string };
type Track = BlindTrack & { audioUrl: string; artwork?: string };

const label = (t: BlindTrack) => `${t.title} — ${t.artist}`;

export class BlindTestGame extends RoundGame<Track, BlindPrompt, BlindExtra, Settings> {
  readonly gameId = 'blindtest' as const;
  protected introMs = 3500;
  protected revealMs = 8000;
  private pool: BlindTrack[] = [];

  protected async prepare(): Promise<Track[]> {
    const genre = this.settings.genre as BlindTrack['tags'][number] | 'mix';
    this.pool = genre === 'mix' ? BLIND_TRACKS : BLIND_TRACKS.filter((t) => t.tags.includes(genre));
    // On résout un peu plus de titres que nécessaire au cas où certains n'ont pas d'extrait.
    const picked = shuffle(this.pool).slice(0, this.settings.rounds + 4);
    const resolved = await Promise.all(
      picked.map(async (t): Promise<Track | null> => {
        if (t.previewUrl) return { ...t, audioUrl: t.previewUrl };
        const r = await resolvePreview(t.artist, t.title);
        return r ? { ...t, audioUrl: r.previewUrl, artwork: r.artwork } : null;
      }),
    );
    return resolved.filter((t): t is Track => !!t).slice(0, this.settings.rounds);
  }

  protected buildRound(track: Track): RoundSpec<BlindPrompt, BlindExtra> {
    const durationMs = Number(this.settings.time) * 1000;
    const base = {
      prompt: { audioUrl: track.audioUrl },
      durationMs,
      answer: label(track),
      extra: { title: track.title, artist: track.artist, artwork: track.artwork },
    };

    if (this.settings.mode === 'libre') {
      return {
        ...base,
        input: {
          kind: 'text',
          placeholder: 'Titre ou artiste…',
          keys: [
            { key: 'artist', label: 'Artiste' },
            { key: 'title', label: 'Titre' },
          ],
        },
      };
    }

    // QCM : 3 leurres, de préférence du même style
    const others = this.pool.filter((t) => t.title !== track.title);
    const sameTag = others.filter((t) => t.tags.some((tag) => track.tags.includes(tag)));
    const decoys = sample(sameTag.length >= 3 ? sameTag : others, 3);
    const choices = shuffle([track, ...decoys]);
    return {
      ...base,
      input: { kind: 'choice', choices: choices.map(label), layout: 'grid' },
      correctIndex: choices.indexOf(track),
    };
  }

  protected matchText(track: Track, guess: string, remaining: string[]) {
    const found: string[] = [];
    let close = false;
    const targets: Record<string, string[]> = {
      artist: [track.artist, ...(track.artistAliases ?? [])],
      title: [track.title, ...(track.titleAliases ?? [])],
    };
    for (const key of remaining) {
      const m = fuzzyMatch(guess, targets[key]);
      if (m === 'exact') found.push(key);
      else if (m === 'close') close = true;
    }
    return { found, close };
  }
}
