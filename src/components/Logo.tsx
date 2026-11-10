import Link from 'next/link';

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5">
      <span
        className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-fuchsia-500/30 transition group-hover:rotate-6 ${
          small ? 'h-9 w-9 text-lg' : 'h-11 w-11 text-2xl'
        }`}
      >
        🎮
      </span>
      <span className={`font-black tracking-tight ${small ? 'text-xl' : 'text-2xl'}`}>
        Party<span className="text-gradient">Hub</span>
      </span>
    </Link>
  );
}
