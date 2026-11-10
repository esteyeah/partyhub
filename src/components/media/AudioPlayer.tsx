'use client';

import { useEffect, useRef, useState } from 'react';

const VOLUME_KEY = 'partyhub:volume';

/** Lecteur audio du Blind Test : lecture auto, volume mémorisé, vinyle + égaliseur animés. */
export function AudioPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [blocked, setBlocked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VOLUME_KEY);
      const v = Number(raw);
      if (raw !== null && v >= 0 && v <= 1) setVolume(v);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.volume = volume;
    try {
      localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      /* ignore */
    }
  }, [volume]);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    return () => a.pause();
  }, [src]);

  return (
    <div className="flex flex-col items-center gap-5">
      <audio ref={ref} src={src} preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      <div className="relative flex h-40 w-40 items-center justify-center">
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 opacity-30 blur-2xl ${playing ? 'animate-pulse' : ''}`} />
        <div
          className={`relative flex h-36 w-36 items-center justify-center rounded-full bg-[repeating-radial-gradient(circle,#18181b_0_3px,#27272a_3px_5px)] shadow-2xl ring-4 ring-white/10 ${
            playing ? 'animate-[spin_3s_linear_infinite]' : ''
          }`}
        >
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-fuchsia-400 to-violet-500 ring-4 ring-black" />
        </div>
      </div>
      <div className="flex h-10 items-end gap-1" aria-hidden>
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            className="h-full w-1.5 origin-bottom rounded-full bg-gradient-to-t from-violet-500 to-fuchsia-300"
            style={{
              animation: playing ? `eq ${0.6 + ((i * 37) % 7) / 10}s ease-in-out ${(i % 5) * 0.08}s infinite` : 'none',
              transform: playing ? undefined : 'scaleY(0.15)',
            }}
          />
        ))}
      </div>
      {blocked && (
        <button onClick={() => ref.current?.play().then(() => setBlocked(false))} className="rounded-2xl bg-white px-5 py-2.5 font-bold text-black">
          🔊 Activer le son
        </button>
      )}
      <label className="flex items-center gap-2 text-sm text-zinc-400">
        🔈
        <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-32 accent-fuchsia-400" />
        🔊
      </label>
    </div>
  );
}
