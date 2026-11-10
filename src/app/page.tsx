'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GAME_CATALOG, GAME_IDS } from '@shared/catalog';
import { Logo } from '@/components/Logo';
import { ProfileForm, useProfile } from '@/components/ProfileForm';
import { Button } from '@/components/ui/Button';
import { createRoom, getSocket, joinRoom } from '@/lib/socket';
import { saveProfile } from '@/lib/session';
import { useClientState } from '@/lib/store';

export default function HomePage() {
  const router = useRouter();
  const { status, notice } = useClientState();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [profile, setProfile] = useProfile();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSocket();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!profile.nickname.trim()) return setError('Choisis un pseudo pour jouer.');
    if (tab === 'join' && code.trim().length < 4) return setError('Entre le code du salon.');
    setLoading(true);
    saveProfile(profile);
    const res = tab === 'create'
      ? await createRoom(profile.nickname, profile.emoji)
      : await joinRoom(code, profile.nickname, profile.emoji);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    router.push(`/room/${res.session.code}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-2 text-sm text-zinc-400 sm:flex">
            <span className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
            {status === 'connected' ? 'Serveur en ligne' : 'Connexion…'}
          </span>
          <Link href="/admin" className="rounded-xl px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-white/8 hover:text-white">
            ⚙️ Admin
          </Link>
        </div>
      </header>

      <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.15fr_1fr] lg:py-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-fuchsia-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" /> Multijoueur temps réel
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Joue avec tes potes,
            <br />
            <span className="text-gradient">sans rien installer.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-zinc-400">
            Crée un salon privé, partage le code, et enchaînez quiz, blind tests et défis foot. Le classement se met à jour en direct.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {GAME_IDS.map((id, i) => {
              const g = GAME_CATALOG[id];
              return (
                <div
                  key={id}
                  className="group relative overflow-hidden rounded-2xl border border-white/8 bg-ink-850/70 p-4 transition hover:-translate-y-1 hover:border-white/15"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${g.gradient} opacity-30 blur-xl transition group-hover:opacity-60`} />
                  <div className="text-3xl">{g.emoji}</div>
                  <div className="mt-2 font-bold leading-tight">{g.name}</div>
                  <div className="mt-0.5 text-xs text-zinc-400">{g.tagline}</div>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={submit} className="panel p-6 sm:p-8">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-ink-900 p-1">
            {(['create', 'join'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setError(null);
                }}
                className={`rounded-xl py-2.5 text-sm font-bold transition ${
                  tab === t ? 'bg-white/10 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t === 'create' ? '✨ Créer une partie' : '🚪 Rejoindre'}
              </button>
            ))}
          </div>

          {tab === 'join' && (
            <div className="mb-5">
              <label className="label" htmlFor="code">
                Code du salon
              </label>
              <input
                id="code"
                className="input text-center font-mono text-3xl font-extrabold uppercase tracking-[0.4em]"
                placeholder="ABCDE"
                maxLength={6}
                autoComplete="off"
                autoCapitalize="characters"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              />
            </div>
          )}

          <ProfileForm value={profile} onChange={setProfile} />

          {(error || notice) && (
            <p className="mt-4 animate-shake rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">
              {error ?? notice}
            </p>
          )}

          <Button type="submit" size="lg" className="mt-6 w-full" disabled={loading || status !== 'connected'}>
            {loading ? 'Connexion…' : tab === 'create' ? 'Créer le salon →' : 'Rejoindre la partie →'}
          </Button>
          <p className="mt-3 text-center text-xs text-zinc-500">Jusqu’à 16 joueurs · Aucun compte nécessaire</p>
        </form>
      </section>
    </main>
  );
}
