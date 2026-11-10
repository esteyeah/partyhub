'use client';

import { useEffect, useRef, useState } from 'react';
import type { Clip } from '@shared/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytPromise: Promise<any> | null = null;
export function loadYouTubeApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytPromise) {
    ytPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT);
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    });
  }
  return ytPromise;
}

/**
 * Lecteur d'extrait "anti-spoiler" : joue `clip` de `start` à `end`, puis se fige
 * derrière un cache. Le joueur ne peut ni cliquer sur la vidéo ni avancer.
 */
export function ClipPlayer({ clip, endedLabel = '⏸ Coupé ! Que va-t-il se passer ?' }: { clip: Clip; endedLabel?: string }) {
  const [ended, setEnded] = useState(false);
  const [needsClick, setNeedsClick] = useState(false);
  const play = useRef<() => void>(() => {});
  const key = clip.type === 'youtube' ? `${clip.id}-${clip.start}-${clip.end}` : `${clip.src}-${clip.start}-${clip.end}`;

  useEffect(() => {
    setEnded(false);
    setNeedsClick(false);
  }, [key]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
      {clip.type === 'youtube' ? (
        <YouTubeClip key={key} clip={clip} onEnded={() => setEnded(true)} onBlocked={setNeedsClick} playRef={play} />
      ) : (
        <FileClip key={key} clip={clip} onEnded={() => setEnded(true)} onBlocked={setNeedsClick} playRef={play} />
      )}
      {/* Empêche toute interaction avec le lecteur (pas de scrub, pas de titre cliquable) */}
      <div className="absolute inset-0" />
      {needsClick && !ended && (
        <button
          onClick={() => {
            play.current();
            setNeedsClick(false);
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-bold"
        >
          <span className="rounded-2xl bg-white px-5 py-3 text-black">▶ Lancer l’extrait</span>
        </button>
      )}
      {ended && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-4 text-center text-xl font-black backdrop-blur-md sm:text-2xl">
          {endedLabel}
        </div>
      )}
    </div>
  );
}

interface InnerProps<C> {
  clip: C;
  onEnded: () => void;
  onBlocked: (b: boolean) => void;
  playRef: React.MutableRefObject<() => void>;
}

function YouTubeClip({ clip, onEnded, onBlocked, playRef }: InnerProps<Extract<Clip, { type: 'youtube' }>>) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let player: any = null;
    let poll: ReturnType<typeof setInterval> | undefined;
    let blockedTimer: ReturnType<typeof setTimeout> | undefined;
    let done = false;
    let cancelled = false;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !host.current) return;
      const el = document.createElement('div');
      host.current.appendChild(el);
      player = new YT.Player(el, {
        videoId: clip.id,
        width: '100%',
        height: '100%',
        playerVars: {
          start: Math.floor(clip.start),
          end: Math.ceil(clip.end),
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (e: any) => {
            playRef.current = () => e.target.playVideo();
            e.target.seekTo(clip.start, true);
            e.target.playVideo();
            blockedTimer = setTimeout(() => {
              if (e.target.getPlayerState?.() !== YT.PlayerState.PLAYING && !done) onBlocked(true);
            }, 1500);
          },
          onStateChange: (e: any) => {
            if (e.data === YT.PlayerState.PLAYING) onBlocked(false);
            if (e.data === YT.PlayerState.ENDED && !done) {
              done = true;
              onEnded();
            }
          },
        },
      });
      poll = setInterval(() => {
        const t = player?.getCurrentTime?.();
        if (!done && typeof t === 'number' && t >= clip.end) {
          done = true;
          player.pauseVideo();
          onEnded();
        }
      }, 120);
    });

    return () => {
      cancelled = true;
      clearInterval(poll);
      clearTimeout(blockedTimer);
      try {
        player?.destroy();
      } catch {
        /* ignore */
      }
      if (host.current) host.current.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={host} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />;
}

function FileClip({ clip, onEnded, onBlocked, playRef }: InnerProps<Extract<Clip, { type: 'file' }>>) {
  const ref = useRef<HTMLVideoElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    playRef.current = () => void v.play();
    const start = () => {
      v.currentTime = clip.start;
      v.play().catch(() => onBlocked(true));
    };
    if (v.readyState >= 1) start();
    else v.addEventListener('loadedmetadata', start, { once: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <video
      ref={ref}
      src={clip.src}
      playsInline
      preload="auto"
      className="absolute inset-0 h-full w-full object-contain"
      onPlay={() => onBlocked(false)}
      onTimeUpdate={(e) => {
        if (!done.current && e.currentTarget.currentTime >= clip.end) {
          done.current = true;
          e.currentTarget.pause();
          onEnded();
        }
      }}
      onEnded={() => {
        if (!done.current) {
          done.current = true;
          onEnded();
        }
      }}
    />
  );
}
