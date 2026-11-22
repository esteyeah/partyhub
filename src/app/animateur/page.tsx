'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CLOSEST_QUESTIONS } from '@content/closest';
import { DATE_EVENTS } from '@content/dates';
import { MEMES } from '@content/memes';
import { MOVIE_TITLES } from '@content/movietitles';
import { PIXEL_ITEMS } from '@content/pixel';
import { QUIZ_QUESTIONS } from '@content/quiz';
import { WHO_ITEMS } from '@content/whoami';
import { YEAR_TRACKS } from '@content/yeartracks';
import { resolvePreview } from '@/engine/games/blindtest/itunes';
import { resolveWikiImages } from '@/engine/games/pixel/wikiImages';
import { Logo } from '@/components/Logo';

/**
 * Mode animateur : un seul téléphone. Celui qui le tient pose les questions à voix haute,
 * voit la réponse, avance à son rythme (pas de chrono) et compte les points des autres.
 */

interface Card {
  label: string;
  question: string;
  /** Indices dévoilés un par un (Qui suis-je) */
  clues?: string[];
  choices?: string[];
  answer: string;
  note?: string;
  audio?: { artist: string; title: string };
  image?: string;
}

type Mode = 'quiz' | 'closest' | 'dates' | 'whoami' | 'movietitle' | 'memes' | 'blindyear' | 'pixel';

const MODES: { id: Mode; emoji: string; name: string; hint: string }[] = [
  { id: 'quiz', emoji: '🧠', name: 'Quiz', hint: 'Lis la question et les 4 réponses' },
  { id: 'closest', emoji: '🎯', name: 'Au plus proche', hint: 'Chacun annonce un nombre, le plus proche gagne' },
  { id: 'dates', emoji: '🏛️', name: 'Devine la date', hint: 'Chacun annonce une année' },
  { id: 'whoami', emoji: '🕵️', name: 'Qui suis-je ?', hint: 'Lis les indices un par un' },
  { id: 'movietitle', emoji: '🎞️', name: 'Devine le film', hint: 'Lis le titre québécois / étranger' },
  { id: 'memes', emoji: '💬', name: 'Complète la phrase', hint: 'Lis le début de la réplique' },
  { id: 'blindyear', emoji: '🎵', name: 'Blind test', hint: 'Fais écouter l’extrait : titre, artiste ou année' },
  { id: 'pixel', emoji: '🔍', name: 'Devine l’image', hint: 'Montre l’image floue, puis défloute' },
];

function shuffle<T>(a: readonly T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

const fmt = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 3 });

function buildDeck(mode: Mode): Card[] {
  switch (mode) {
    case 'quiz':
      return shuffle(QUIZ_QUESTIONS).map((q) => ({
        label: q.category === 'enigme' ? '🧩 Énigme' : '🧠 Quiz',
        question: q.question,
        choices: q.category === 'enigme' ? undefined : q.choices,
        answer: q.choices[q.answer],
        note: q.explanation,
      }));
    case 'closest':
      return shuffle(CLOSEST_QUESTIONS).map((q) => ({ label: '🎯 Au plus proche', question: q.q, answer: fmt(q.answer) + (q.unit ? ` ${q.unit}` : '') }));
    case 'dates':
      return shuffle(DATE_EVENTS).map((e) => ({ label: e.cat === 'histoire' ? '🏛️ Histoire' : '🎭 Culture', question: `${e.text} : en quelle année ?`, answer: String(e.year) }));
    case 'whoami':
      return shuffle(WHO_ITEMS).map((w) => ({ label: '🕵️ Qui suis-je ?', question: 'Qui suis-je ?', clues: w.clues, answer: w.name }));
    case 'movietitle':
      return shuffle(MOVIE_TITLES).map((m) => ({
        label: m.lang === 'qc' ? '🇨🇦 Titre québécois' : m.lang === 'es' ? '🇪🇸 Titre espagnol' : '🇬🇧 Titre anglais',
        question: `« ${m.foreign} »`,
        answer: m.answer,
        note: `Sorti en ${m.year}`,
      }));
    case 'memes':
      return shuffle(MEMES).map((m) => ({
        label: m.kind === 'sequel' ? '🎞️ Quelle est la suite ?' : '💬 Complète la phrase',
        question: m.text,
        choices: m.choices,
        answer: m.choices[m.answer],
        note: m.source,
      }));
    case 'blindyear':
      return shuffle(YEAR_TRACKS).map((t) => ({
        label: '🎵 Blind test',
        question: 'Titre, artiste… et année ?',
        answer: `${t.title} — ${t.artist}`,
        note: `Sorti en ${t.year}`,
        audio: { artist: t.artist, title: t.title },
      }));
    case 'pixel':
      return shuffle(PIXEL_ITEMS).map((p) => ({ label: '🔍 Devine l’image', question: 'Qui ou qu’est-ce que c’est ?', answer: p.name, image: `wiki:${p.wiki}` }));
  }
}

export default function AnimateurPage() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [deck, setDeck] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [clue, setClue] = useState(1);
  const [players, setPlayers] = useState<{ name: string; score: number }[]>([]);
  const [newName, setNewName] = useState('');

  const card = deck[i];

  const start = (m: Mode) => {
    setMode(m);
    setDeck(buildDeck(m));
    setI(0);
    setShown(false);
    setClue(1);
  };
  const go = (d: number) => {
    setI((x) => Math.max(0, Math.min(deck.length - 1, x + d)));
    setShown(false);
    setClue(1);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-5">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        {mode && (
          <button onClick={() => setMode(null)} className="rounded-xl px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/10 hover:text-white">
            ← Jeux
          </button>
        )}
      </div>

      {!mode ? (
        <div className="space-y-4">
          <div className="panel p-5">
            <h1 className="text-2xl font-black">🎤 Mode animateur</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Un seul téléphone : tu poses les questions à voix haute aux autres, tu vois la réponse, pas de chrono. Les autres ne touchent pas l’écran !
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map((m) => (
              <button key={m.id} onClick={() => start(m.id)} className="panel p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.06]">
                <div className="text-3xl">{m.emoji}</div>
                <div className="mt-1 font-bold">{m.name}</div>
                <div className="text-xs text-zinc-500">{m.hint}</div>
              </button>
            ))}
          </div>
          <Scores players={players} setPlayers={setPlayers} newName={newName} setNewName={setNewName} />
        </div>
      ) : card ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>{card.label}</span>
            <span className="font-mono">
              {i + 1}/{deck.length}
            </span>
          </div>

          <div className="panel space-y-4 p-5">
            {card.image && <PixelImage key={card.image} wiki={card.image.slice(5)} sharp={shown} />}
            {card.audio && <Audio key={card.answer} {...card.audio} />}
            <h2 className="text-2xl font-black leading-snug">{card.question}</h2>
            {card.clues && (
              <ol className="space-y-2">
                {card.clues.slice(0, shown ? card.clues.length : clue).map((c, k) => (
                  <li key={k} className="flex gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
                    <span className="font-mono font-black text-amber-300">{k + 1}</span>
                    {c}
                  </li>
                ))}
              </ol>
            )}
            {card.clues && !shown && clue < card.clues.length && (
              <button onClick={() => setClue((c) => c + 1)} className="w-full rounded-xl bg-amber-500/20 py-2 font-bold text-amber-200">
                Indice suivant ({clue + 1}/{card.clues.length})
              </button>
            )}
            {card.choices && (
              <div className="grid grid-cols-2 gap-2">
                {card.choices.map((c, k) => (
                  <div key={k} className={`rounded-xl px-3 py-2 text-sm font-semibold ${shown && c === card.answer ? 'bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/50' : 'bg-white/[0.05]'}`}>
                    {String.fromCharCode(65 + k)}. {c}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Réponse : visible par l'animateur (bandeau discret, à toucher pour l'afficher en grand) */}
          <button onClick={() => setShown((s) => !s)} className={`w-full rounded-2xl p-4 text-left transition ${shown ? 'bg-emerald-500/15 ring-1 ring-emerald-400/40' : 'bg-white/[0.04]'}`}>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{shown ? 'Réponse (touchée pour cacher)' : 'Réponse pour toi (touche pour l’afficher en grand)'}</div>
            <div className={`mt-1 font-black ${shown ? 'text-2xl text-emerald-200' : 'text-base text-zinc-300'}`}>{card.answer}</div>
            {card.note && <div className="text-sm text-zinc-400">{card.note}</div>}
          </button>

          <div className="flex gap-3">
            <button disabled={i === 0} onClick={() => go(-1)} className="flex-1 rounded-2xl bg-white/[0.06] py-3 font-bold disabled:opacity-30">
              ← Précédente
            </button>
            <button onClick={() => go(1)} className="flex-[2] rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 font-bold">
              Suivante →
            </button>
          </div>

          <Scores players={players} setPlayers={setPlayers} newName={newName} setNewName={setNewName} compact />
        </div>
      ) : null}
    </main>
  );
}

function Scores({
  players,
  setPlayers,
  newName,
  setNewName,
  compact,
}: {
  players: { name: string; score: number }[];
  setPlayers: (f: (p: { name: string; score: number }[]) => { name: string; score: number }[]) => void;
  newName: string;
  setNewName: (s: string) => void;
  compact?: boolean;
}) {
  const sorted = useMemo(() => players.map((p, k) => ({ ...p, k })).sort((a, b) => b.score - a.score), [players]);
  return (
    <div className="panel p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">🏆 Points des joueurs</h3>
      <ul className="space-y-1.5">
        {sorted.map((p) => (
          <li key={p.k} className="flex items-center gap-2">
            <span className="flex-1 truncate font-semibold">{p.name}</span>
            <button onClick={() => setPlayers((ps) => ps.map((x, k) => (k === p.k ? { ...x, score: x.score - 1 } : x)))} className="h-8 w-8 rounded-lg bg-white/10 font-bold">
              −
            </button>
            <span className="w-8 text-center font-mono font-black">{p.score}</span>
            <button onClick={() => setPlayers((ps) => ps.map((x, k) => (k === p.k ? { ...x, score: x.score + 1 } : x)))} className="h-8 w-8 rounded-lg bg-emerald-500/30 font-bold">
              +
            </button>
          </li>
        ))}
      </ul>
      {(!compact || players.length === 0) && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            setPlayers((ps) => [...ps, { name: newName.trim().slice(0, 20), score: 0 }]);
            setNewName('');
          }}
          className="mt-2 flex gap-2"
        >
          <input className="input text-sm" placeholder="Ajouter un joueur (facultatif)" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="rounded-xl bg-white/10 px-3 text-sm font-bold">+</button>
        </form>
      )}
    </div>
  );
}

function Audio({ artist, title }: { artist: string; title: string }) {
  const [src, setSrc] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    resolvePreview(artist, title).then((r) => setSrc(r?.previewUrl ?? null));
  }, [artist, title]);
  if (src === undefined) return <p className="text-sm text-zinc-500">Chargement de l’extrait…</p>;
  if (src === null) return <p className="text-sm text-rose-300">Extrait introuvable, passe à la suivante.</p>;
  return <audio src={src} controls autoPlay className="w-full" />;
}

function PixelImage({ wiki, sharp }: { wiki: string; sharp: boolean }) {
  const [src, setSrc] = useState<string | null | undefined>(undefined);
  const [step, setStep] = useState(0);
  useEffect(() => {
    resolveWikiImages([wiki]).then((m) => setSrc(m.get(wiki) ?? null));
  }, [wiki]);
  const level = sharp ? 4 : step;
  const blur = [26, 16, 9, 4, 0][level];
  const scale = [3.4, 2.5, 1.8, 1.3, 1][level];
  if (src === undefined) return <p className="text-sm text-zinc-500">Chargement de l’image…</p>;
  if (src === null) return <p className="text-sm text-rose-300">Image introuvable, passe à la suivante.</p>;
  return (
    <div className="space-y-2">
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-contain transition-all duration-500" style={{ filter: `blur(${blur}px)`, transform: `scale(${scale})` }} />
      </div>
      {!sharp && step < 4 && (
        <button onClick={() => setStep((s) => s + 1)} className="w-full rounded-xl bg-teal-500/20 py-2 font-bold text-teal-200">
          Déflouter un peu ({step + 1}/4)
        </button>
      )}
    </div>
  );
}
