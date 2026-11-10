'use client';

import { useEffect, useState } from 'react';
import { serverNow } from './socket';

/** Temps restant (ms) jusqu'à `endsAt` (heure serveur), rafraîchi ~10 fois par seconde. */
export function useRemaining(endsAt: number | null | undefined): number {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(serverNow()), 100);
    return () => clearInterval(id);
  }, [endsAt]);
  return endsAt ? Math.max(0, endsAt - now) : 0;
}

/** Anime un nombre de `from` à `to`. */
export function useCountUp(to: number, from = 0, duration = 1200, delay = 0): number {
  const [value, setValue] = useState(from);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const timeout = setTimeout(() => {
      const step = (t: number) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(from + (to - from) * eased));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [to, from, duration, delay]);
  return value;
}
