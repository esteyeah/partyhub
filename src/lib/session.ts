'use client';

import type { Session } from '@shared/events';

/**
 * La session est stockée par onglet (sessionStorage) : on peut ouvrir plusieurs onglets
 * pour tester à plusieurs, et un rafraîchissement de page reconnecte au même joueur.
 * Le profil (pseudo + emoji) est mémorisé dans localStorage pour la prochaine fois.
 */
const SESSION_KEY = 'partyhub:session';
const PROFILE_KEY = 'partyhub:profile';

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function loadSession(): Session | null {
  return safe(() => JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null'), null);
}

export function saveSession(session: Session | null) {
  safe(() => (session ? sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)) : sessionStorage.removeItem(SESSION_KEY)), undefined);
}

export interface Profile {
  nickname: string;
  emoji: string;
}

export function loadProfile(): Profile | null {
  return safe(() => JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null'), null);
}

export function saveProfile(profile: Profile) {
  safe(() => localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)), undefined);
}
