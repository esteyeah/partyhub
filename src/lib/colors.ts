import type { PlayerColor } from '@shared/types';

/** Classes Tailwind écrites en entier pour être détectées au build. */
export const PLAYER_STYLES: Record<PlayerColor, { bg: string; ring: string; text: string; soft: string }> = {
  violet: { bg: 'bg-violet-500', ring: 'ring-violet-400', text: 'text-violet-300', soft: 'bg-violet-500/15' },
  fuchsia: { bg: 'bg-fuchsia-500', ring: 'ring-fuchsia-400', text: 'text-fuchsia-300', soft: 'bg-fuchsia-500/15' },
  rose: { bg: 'bg-rose-500', ring: 'ring-rose-400', text: 'text-rose-300', soft: 'bg-rose-500/15' },
  orange: { bg: 'bg-orange-500', ring: 'ring-orange-400', text: 'text-orange-300', soft: 'bg-orange-500/15' },
  amber: { bg: 'bg-amber-500', ring: 'ring-amber-400', text: 'text-amber-300', soft: 'bg-amber-500/15' },
  lime: { bg: 'bg-lime-500', ring: 'ring-lime-400', text: 'text-lime-300', soft: 'bg-lime-500/15' },
  emerald: { bg: 'bg-emerald-500', ring: 'ring-emerald-400', text: 'text-emerald-300', soft: 'bg-emerald-500/15' },
  cyan: { bg: 'bg-cyan-500', ring: 'ring-cyan-400', text: 'text-cyan-300', soft: 'bg-cyan-500/15' },
  sky: { bg: 'bg-sky-500', ring: 'ring-sky-400', text: 'text-sky-300', soft: 'bg-sky-500/15' },
  indigo: { bg: 'bg-indigo-500', ring: 'ring-indigo-400', text: 'text-indigo-300', soft: 'bg-indigo-500/15' },
};

/** Couleurs des réponses façon quiz télé */
export const CHOICE_STYLES = [
  { bg: 'bg-rose-500', hover: 'hover:bg-rose-400', shape: '▲' },
  { bg: 'bg-sky-500', hover: 'hover:bg-sky-400', shape: '◆' },
  { bg: 'bg-amber-500', hover: 'hover:bg-amber-400', shape: '●' },
  { bg: 'bg-emerald-500', hover: 'hover:bg-emerald-400', shape: '■' },
];

export const AVATAR_EMOJIS = ['😎', '🦊', '🐼', '🐸', '🦁', '🐙', '👾', '🤖', '🦄', '🐲', '👻', '🎃', '🍕', '🌮', '⚡', '🔥', '🚀', '🎧', '🏀', '🐧'];
