import type { PlayerPublic } from '@shared/types';
import { PLAYER_STYLES } from '@/lib/colors';

const SIZES = {
  xs: 'h-7 w-7 text-sm',
  sm: 'h-9 w-9 text-lg',
  md: 'h-12 w-12 text-2xl',
  lg: 'h-16 w-16 text-3xl',
  xl: 'h-24 w-24 text-5xl',
};

export function Avatar({
  player,
  size = 'md',
  showHost = false,
  className = '',
}: {
  player: Pick<PlayerPublic, 'emoji' | 'color' | 'connected' | 'isHost'>;
  size?: keyof typeof SIZES;
  showHost?: boolean;
  className?: string;
}) {
  const s = PLAYER_STYLES[player.color];
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <span
        className={`inline-flex items-center justify-center rounded-full ${s.soft} ring-2 ${s.ring} ${SIZES[size]} ${
          player.connected ? '' : 'opacity-40 grayscale'
        }`}
      >
        {player.emoji}
      </span>
      {showHost && player.isHost && (
        <span className="absolute -top-2 -right-1 text-base drop-shadow" title="Hôte">
          👑
        </span>
      )}
    </span>
  );
}
