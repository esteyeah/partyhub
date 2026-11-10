'use client';

import { useRemaining } from '@/lib/hooks';

/** Chrono circulaire basé sur l'heure serveur. */
export function TimerRing({ endsAt, durationMs, size = 64 }: { endsAt: number | null; durationMs: number; size?: number }) {
  const remaining = useRemaining(endsAt);
  const ratio = durationMs ? Math.min(1, remaining / durationMs) : 0;
  const seconds = Math.ceil(remaining / 1000);
  const r = 26;
  const c = 2 * Math.PI * r;
  const danger = seconds <= 5 && remaining > 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-white/10" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className={`transition-[stroke-dashoffset] duration-100 ease-linear ${danger ? 'stroke-rose-500' : 'stroke-fuchsia-400'}`}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-mono text-lg font-extrabold ${
          danger ? 'text-rose-400 animate-pulse' : 'text-white'
        }`}
      >
        {seconds}
      </span>
    </div>
  );
}

export function TimerBar({ endsAt, durationMs }: { endsAt: number | null; durationMs: number }) {
  const remaining = useRemaining(endsAt);
  const ratio = durationMs ? Math.min(1, remaining / durationMs) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-[width] duration-100 ease-linear"
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
