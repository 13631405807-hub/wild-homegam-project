import { useNavigate } from 'react-router-dom';
import { Game, GameStatus } from '@/types';
import { formatDate, cn, formatChips, chipsToGold, formatGold } from '@/lib/utils';
import PlayerAvatar from './PlayerAvatar';
import { MapPin, Users, Clock, ChevronRight, Check } from 'lucide-react';

interface GameCardProps {
  game: Game;
}

const statusConfig: Record<GameStatus, { label: string; color: string; bgColor: string }> = {
  waiting: { label: '等待中', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/30' },
  playing: { label: '进行中', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/30' },
  settled: { label: '已结算', color: 'text-gray-500 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-800/50' },
};

function getDuration(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}时${m}分`;
  return `${m}分钟`;
}

export default function GameCard({ game }: GameCardProps) {
  const navigate = useNavigate();
  const players = Object.values(game.players);
  const status = statusConfig[game.status];

  // Find richest (most profit) and charity (most loss)
  const settledPlayers = players.filter(p => p.isSettled && p.settledGold !== null);
  const sorted = [...settledPlayers].sort((a, b) => (b.settledGold || 0) - (a.settledGold || 0));
  const richest = sorted.length > 0 && (sorted[0].settledGold || 0) > 0 ? sorted[0] : null;
  const charity = sorted.length > 0 && (sorted[sorted.length - 1].settledGold || 0) < 0 ? sorted[sorted.length - 1] : null;

  return (
    <button
      onClick={() => navigate(`/game/${game.id}`)}
      className="w-full glass-card p-4 text-left hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
    >
      {/* Top: Location + Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {game.location && (
            <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-200 font-medium truncate">
              <MapPin size={14} className="text-gray-400 flex-shrink-0" />
              <span className="truncate">{game.location}</span>
            </div>
          )}
        </div>
        <span className={cn('status-badge flex-shrink-0', status.bgColor, status.color)}>
          {game.status === 'playing' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />}
          {game.status === 'settled' && <Check size={10} className="mr-1" />}
          {status.label}
        </span>
      </div>

      {/* Middle: Date + Players + Duration */}
      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
        <span>{formatDate(game.date)}</span>
        <span className="flex items-center gap-1"><Users size={12} />{players.length}人</span>
        {game.status === 'playing' && (
          <span className="flex items-center gap-1"><Clock size={12} />{getDuration(game.createdAt)}</span>
        )}
      </div>

      {/* Bottom: Rich + Charity avatars */}
      {(richest || charity) ? (
        <div className="flex items-center gap-3">
          {richest && (
            <div className="flex items-center gap-2">
              <PlayerAvatar nickname={richest.nickname} size="sm" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">💰 富豪</p>
                <p className="text-xs font-medium text-green-600 dark:text-green-400">{formatGold(richest.settledGold || 0)}</p>
              </div>
            </div>
          )}
          {charity && charity.userId !== richest?.userId && (
            <div className="flex items-center gap-2">
              <PlayerAvatar nickname={charity.nickname} size="sm" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">🎁 慈善家</p>
                <p className="text-xs font-medium text-red-500">{formatGold(charity.settledGold || 0)}</p>
              </div>
            </div>
          )}
          <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 ml-auto" />
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {players.slice(0, 4).map(player => (
              <PlayerAvatar key={player.userId} nickname={player.nickname} size="sm" />
            ))}
            {players.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-500 border-2 border-white dark:border-surface-dark">
                +{players.length - 4}
              </div>
            )}
          </div>
          <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
        </div>
      )}
    </button>
  );
}
