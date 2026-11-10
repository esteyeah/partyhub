'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { formatTime, parseTime, parseYouTubeUrl } from '@shared/clips';
import { loadYouTubeApi } from '@/components/media/ClipPlayer';

export interface ClipDraft {
  url: string;
  start: string;
  end: string;
  /** Fin de la « suite » révélée (Devine la suite) */
  revealEnd?: string;
}

export const EMPTY_CLIP: ClipDraft = { url: '', start: '', end: '', revealEnd: '' };

/**
 * Colle un lien YouTube, puis règle le début et la fin de l'extrait
 * avec le lecteur (« Début = maintenant ») ou à la main (m:ss).
 */
export function YouTubeEditor({ value, onChange, withReveal }: { value: ClipDraft; onChange: (v: ClipDraft) => void; withReveal?: boolean }) {
  const parsed = parseYouTubeUrl(value.url);
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  const stopAt = useRef<number | null>(null);
  const [ready, setReady] = useState(false);

  // (Re)crée le lecteur quand la vidéo change
  useEffect(() => {
    if (!parsed) return;
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    setReady(false);
    loadYouTubeApi().then((YT) => {
      if (cancelled || !host.current) return;
      host.current.innerHTML = '';
      const el = document.createElement('div');
      host.current.appendChild(el);
      player.current = new YT.Player(el, {
        videoId: parsed.id,
        width: '100%',
        height: '100%',
        playerVars: { controls: 1, rel: 0, playsinline: 1, modestbranding: 1, start: parsed.start ?? 0 },
        events: { onReady: () => !cancelled && setReady(true) },
      });
      poll = setInterval(() => {
        const t = player.current?.getCurrentTime?.();
        if (stopAt.current !== null && typeof t === 'number' && t >= stopAt.current) {
          player.current.pauseVideo();
          stopAt.current = null;
        }
      }, 100);
    });
    return () => {
      cancelled = true;
      clearInterval(poll);
      try {
        player.current?.destroy();
      } catch {
        /* ignore */
      }
      player.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed?.id]);

  // Le lien contient ?t=… : on pré-remplit le début
  useEffect(() => {
    if (parsed?.start != null && !value.start) onChange({ ...value, start: formatTime(parsed.start) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed?.id]);

  const now = () => formatTime(player.current?.getCurrentTime?.() ?? 0);
  const play = (from: string, to: string) => {
    const a = parseTime(from);
    const b = parseTime(to);
    if (a === null || b === null || !player.current) return;
    stopAt.current = b;
    player.current.seekTo(a, true);
    player.current.playVideo();
  };

  const field = (key: keyof ClipDraft, label: string) => (
    <div className="flex items-center gap-2">
      <label className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</label>
      <input
        className="w-24 rounded-xl border border-white/10 bg-ink-800 px-2.5 py-1.5 font-mono text-sm outline-none focus:border-fuchsia-400/60"
        placeholder="m:ss"
        value={value[key] ?? ''}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })}
        aria-label={label}
      />
      <button
        type="button"
        disabled={!ready}
        onClick={() => onChange({ ...value, [key]: now() })}
        className="rounded-xl bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 disabled:opacity-30"
      >
        ⏱ = position actuelle
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor="yt-url">
          Lien YouTube (vidéo, short…)
        </label>
        <input
          id="yt-url"
          className="input"
          placeholder="https://www.youtube.com/watch?v=…"
          value={value.url}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
        />
        {value.url && !parsed && <p className="mt-1 text-xs text-rose-300">Lien YouTube non reconnu.</p>}
      </div>
      {parsed && (
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
            <div ref={host} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
          </div>
          <div className="space-y-2.5">
            <p className="text-xs text-zinc-500">Lance la vidéo, mets-la en pause au bon moment puis clique sur ⏱.</p>
            {field('start', 'Début')}
            {field('end', withReveal ? 'Coupure' : 'Fin')}
            {withReveal && field('revealEnd', 'Fin de la suite')}
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" disabled={!ready} onClick={() => play(value.start, value.end)} className="rounded-xl bg-fuchsia-500/20 px-3 py-1.5 text-sm font-semibold text-fuchsia-100 hover:bg-fuchsia-500/30 disabled:opacity-30">
                ▶ Tester l’extrait
              </button>
              {withReveal && value.revealEnd && (
                <button type="button" disabled={!ready} onClick={() => play(value.end, value.revealEnd!)} className="rounded-xl bg-emerald-500/20 px-3 py-1.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-30">
                  ▶ Tester la suite
                </button>
              )}
            </div>
            {(() => {
              const a = parseTime(value.start);
              const b = parseTime(value.end);
              return a !== null && b !== null && b > a ? <p className="text-xs text-zinc-400">Durée de l’extrait : {Math.round(b - a)} s</p> : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

/** Convertit le brouillon en objet "clip" pour la validation */
export function draftToClip(d: ClipDraft) {
  const p = parseYouTubeUrl(d.url);
  return { id: p?.id ?? '', start: parseTime(d.start), end: parseTime(d.end) };
}

export function clipToDraft(clip: { id: string; start: number; end: number }, revealEnd?: number): ClipDraft {
  return {
    url: `https://www.youtube.com/watch?v=${clip.id}`,
    start: formatTime(clip.start),
    end: formatTime(clip.end),
    revealEnd: revealEnd !== undefined ? formatTime(revealEnd) : '',
  };
}
