'use client';

import { useEffect, useState } from 'react';
import { AVATAR_EMOJIS } from '@/lib/colors';
import { loadProfile } from '@/lib/session';

export interface ProfileValue {
  nickname: string;
  emoji: string;
}

/** Choix du pseudo + avatar emoji (mémorisés entre deux visites). */
export function useProfile() {
  const [profile, setProfile] = useState<ProfileValue>({ nickname: '', emoji: AVATAR_EMOJIS[0] });
  useEffect(() => {
    const saved = loadProfile();
    setProfile(saved ?? { nickname: '', emoji: AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)] });
  }, []);
  return [profile, setProfile] as const;
}

export function ProfileForm({ value, onChange }: { value: ProfileValue; onChange: (v: ProfileValue) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="nickname">
          Ton pseudo
        </label>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-3xl ring-1 ring-white/10">
            {value.emoji}
          </span>
          <input
            id="nickname"
            className="input"
            placeholder="Ex : Zizou du 93"
            maxLength={16}
            autoComplete="off"
            value={value.nickname}
            onChange={(e) => onChange({ ...value, nickname: e.target.value })}
          />
        </div>
      </div>
      <div>
        <span className="label">Avatar</span>
        <div className="grid grid-cols-10 gap-1.5">
          {AVATAR_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onChange({ ...value, emoji: e })}
              className={`aspect-square rounded-xl text-xl transition hover:scale-110 hover:bg-white/10 ${
                value.emoji === e ? 'bg-fuchsia-500/25 ring-2 ring-fuchsia-400' : 'bg-white/[0.03]'
              }`}
              aria-label={`Avatar ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
