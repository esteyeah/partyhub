import { MOVIE_TITLES, type MovieTitle, type TitleLang } from '@content/movietitles';
import type { MovieTitleExtra, MovieTitlePrompt } from '@shared/types';
import { fuzzyMatch } from '../../utils/fuzzy';
import { shuffle } from '../../utils/random';
import { speedPoints } from '../GameModule';
import { RoundGame, type RoundSpec } from '../RoundGame';

type Settings = { rounds: number; time: string; lang: string; mode: string };

const LANGS: Record<TitleLang, { flag: string; label: string }> = {
  qc: { flag: '🇨🇦', label: 'Titre québécois' },
  es: { flag: '🇪🇸', label: 'Titre espagnol' },
  en: { flag: '🇬🇧', label: 'Titre anglais' },
};

/** Devine le film à partir de son titre étranger (québécois surtout). */
export class MovieTitleGame extends RoundGame<MovieTitle, MovieTitlePrompt, MovieTitleExtra, Settings> {
  readonly gameId = 'movietitle' as const;
  protected revealMs = 6000;

  protected prepare() {
    const l = this.settings.lang;
    const pool = l === 'mix' ? MOVIE_TITLES : MOVIE_TITLES.filter((m) => m.lang === l);
    // Évite deux fois le même film dans une partie
    const seen = new Set<string>();
    return shuffle(pool).filter((m) => (seen.has(m.answer) ? false : (seen.add(m.answer), true))).slice(0, this.settings.rounds);
  }

  protected buildRound(m: MovieTitle): RoundSpec<MovieTitlePrompt, MovieTitleExtra> {
    const time = Number(this.settings.time) * 1000;
    const base = {
      prompt: { foreign: m.foreign, flag: LANGS[m.lang].flag, langLabel: LANGS[m.lang].label },
      answer: m.answer,
      extra: { year: m.year },
    };
    if (this.settings.mode === 'libre') {
      return {
        ...base,
        input: { kind: 'text', placeholder: 'Titre du film en France…', keys: [{ key: 'answer', label: 'Film' }] },
        durationMs: Math.max(time, 25_000),
      };
    }
    const others = shuffle([...new Set(MOVIE_TITLES.map((x) => x.answer).filter((a) => a !== m.answer))]).slice(0, 3);
    const choices = shuffle([m.answer, ...others]);
    return { ...base, input: { kind: 'choice', choices, layout: 'grid' }, durationMs: time, correctIndex: choices.indexOf(m.answer) };
  }

  protected matchText(m: MovieTitle, guess: string, remaining: string[]) {
    if (!remaining.includes('answer')) return { found: [], close: false };
    const r = fuzzyMatch(guess, [m.answer, ...(m.aliases ?? [])]);
    return { found: r === 'exact' ? ['answer'] : [], close: r === 'close' };
  }

  protected textPoints(_key: string, ms: number, order: number, spec: RoundSpec<MovieTitlePrompt, MovieTitleExtra>): number {
    const bonus = order === 0 ? 150 : order === 1 ? 75 : order === 2 ? 25 : 0;
    return speedPoints(ms, spec.durationMs) + bonus;
  }
}
