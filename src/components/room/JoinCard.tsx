'use client';

import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { ProfileForm, useProfile } from '@/components/ProfileForm';
import { Button } from '@/components/ui/Button';
import { saveProfile } from '@/lib/session';
import { joinRoom } from '@/lib/socket';
import { setState, useClientState } from '@/lib/store';

/** Affiché quand on ouvre un lien de salon sans être encore joueur. */
export function JoinCard({ code }: { code: string }) {
  const { status, notice } = useClientState();
  const [profile, setProfile] = useProfile();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile.nickname.trim()) return setError('Choisis un pseudo pour jouer.');
    setLoading(true);
    setError(null);
    saveProfile(profile);
    const res = await joinRoom(code, profile.nickname, profile.emoji);
    setLoading(false);
    if (!res.ok) setError(res.error);
    else setState({ notice: null });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>
      <form onSubmit={submit} className="panel p-6 sm:p-8">
        <p className="text-center text-sm text-zinc-400">Tu es invité dans le salon</p>
        <p className="mt-1 text-center font-mono text-4xl font-extrabold tracking-[0.3em] text-gradient">{code}</p>
        <div className="my-6 h-px bg-white/8" />
        <ProfileForm value={profile} onChange={setProfile} />
        {(error || notice) && (
          <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">{error ?? notice}</p>
        )}
        <Button type="submit" size="lg" className="mt-6 w-full" disabled={loading || status !== 'connected'}>
          {loading ? 'Connexion…' : 'Rejoindre →'}
        </Button>
      </form>
    </main>
  );
}
