import { cn } from '@/lib/utils';

interface PlayerAvatarProps {
  nickname: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isBanker?: boolean;
  isSettled?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

// 32 unique gradient combinations - enough to avoid collisions for typical use
const gradients = [
  'from-emerald-500 to-teal-700',
  'from-blue-500 to-indigo-700',
  'from-purple-500 to-violet-700',
  'from-pink-500 to-rose-700',
  'from-orange-500 to-red-700',
  'from-yellow-500 to-amber-700',
  'from-cyan-500 to-blue-700',
  'from-fuchsia-500 to-purple-700',
  'from-lime-500 to-green-700',
  'from-red-500 to-pink-700',
  'from-teal-500 to-cyan-700',
  'from-indigo-500 to-blue-700',
  'from-rose-500 to-red-700',
  'from-amber-500 to-orange-700',
  'from-violet-500 to-purple-700',
  'from-sky-500 to-blue-700',
  'from-green-600 to-emerald-800',
  'from-blue-600 to-blue-800',
  'from-pink-600 to-fuchsia-800',
  'from-orange-600 to-red-800',
  'from-teal-600 to-teal-800',
  'from-purple-600 to-indigo-800',
  'from-red-600 to-rose-800',
  'from-yellow-600 to-amber-800',
  'from-cyan-600 to-sky-800',
  'from-lime-600 to-green-800',
  'from-fuchsia-600 to-pink-800',
  'from-indigo-600 to-violet-800',
  'from-rose-600 to-pink-800',
  'from-amber-600 to-yellow-800',
  'from-emerald-600 to-teal-800',
  'from-sky-600 to-cyan-800',
];

// Small icons to differentiate players with same initial
const icons = ['♠', '♥', '♦', '♣', '★', '◆', '●', '▲'];

function getHash(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function getDisplayText(nickname: string): string {
  // Use first two characters for better uniqueness
  const chars = nickname.replace(/[^一-龥a-zA-Z0-9]/g, '');
  if (chars.length >= 2) return chars.substring(0, 2);
  return chars.charAt(0) || '?';
}

export default function PlayerAvatar({ nickname, size = 'md', isBanker, isSettled, className }: PlayerAvatarProps) {
  const hash = getHash(nickname);
  const gradient = gradients[hash % gradients.length];
  const icon = icons[hash % icons.length];
  const text = size === 'sm' ? nickname.charAt(0).toUpperCase() : getDisplayText(nickname);

  const showIcon = size !== 'sm';

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <div className={cn(
        'rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold shadow-md',
        gradient,
        sizeMap[size],
      )}>
        <div className="flex flex-col items-center leading-none">
          <span>{text}</span>
          {showIcon && <span className="opacity-60" style={{ fontSize: size === 'xl' ? 10 : size === 'lg' ? 8 : 7 }}>{icon}</span>}
        </div>
      </div>
      {isBanker && (
        <div className="absolute -bottom-0.5 -right-0.5 bg-gold-400 text-black rounded-full flex items-center justify-center font-bold shadow-sm"
          style={{ width: size === 'sm' ? 14 : size === 'md' ? 16 : 20, height: size === 'sm' ? 14 : size === 'md' ? 16 : 20, fontSize: size === 'sm' ? 8 : size === 'md' ? 9 : 11 }}>
          $
        </div>
      )}
      {isSettled && (
        <div className="absolute -top-0.5 -right-0.5 bg-green-500 text-white rounded-full flex items-center justify-center"
          style={{ width: size === 'sm' ? 12 : size === 'md' ? 14 : 18, height: size === 'sm' ? 12 : size === 'md' ? 14 : 18, fontSize: size === 'sm' ? 7 : size === 'md' ? 8 : 10 }}>
          ✓
        </div>
      )}
    </div>
  );
}
