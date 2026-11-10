'use client';

import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/25 hover:brightness-110 hover:shadow-fuchsia-500/40',
  secondary: 'bg-white/8 text-white border border-white/10 hover:bg-white/12',
  ghost: 'text-zinc-300 hover:bg-white/8 hover:text-white',
  danger: 'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25',
  success: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:brightness-110',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-xl',
  md: 'px-5 py-2.5 text-base rounded-2xl',
  lg: 'px-7 py-4 text-lg rounded-2xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    />
  );
}
