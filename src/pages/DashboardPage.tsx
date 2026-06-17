import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { getPlayerStats, cn, formatGold, getStreakEmoji } from '@/lib/utils';
import GameCard from '@/components/GameCard';
import PlayerAvatar from '@/components/PlayerAvatar';
import ThemeToggle from '@/components/ThemeToggle';
import { Plus, TrendingUp, TrendingDown, Zap, Crown } from 'lucide-react';

export default function DashboardPage() {
  const { currentUser, gameList, games } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const allGames = Object.values(games);
  const stats = getPlayerStats(currentUser.id, allGames);
  const currentStreakEmoji = stats ? getStreakEmoji(stats.currentStreak) : '';

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-card border-b border-gray-200/50 dark:border-white/10 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <PlayerAvatar nickname={currentUser.nickname} size="md" />
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white">{currentUser.nickname}</h1>
              {stats && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.totalGames}场 {currentStreakEmoji}
                  {stats.currentStreak > 0 && `${stats.currentStreak}连胜`}
                  {stats.currentStreak < 0 && `${Math.abs(stats.currentStreak)}连败`}
                </p>
              )}
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-6">
        {/* Quick Stats */}
        {stats ? (
          <div className="grid grid-cols-2 gap-3 animate-fade-in">
            <div className="glass-card-solid p-4">
              <div className="flex items-center gap-2 mb-1">
                {stats.totalProfit >= 0
                  ? <TrendingUp size={16} className="text-green-500" />
                  : <TrendingDown size={16} className="text-red-500" />
                }
                <span className="section-title mb-0">总盈亏</span>
              </div>
              <p className={cn(
                'stat-number',
                stats.totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'
              )}>
                {formatGold(stats.totalProfit)}
              </p>
              <p className="text-xs text-gray-400 mt-1">金币</p>
            </div>
            <div className="glass-card-solid p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={16} className="text-gold-500" />
                <span className="section-title mb-0">场均盈亏</span>
              </div>
              <p className={cn(
                'stat-number',
                stats.avgProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'
              )}>
                {formatGold(stats.avgProfit)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                胜率 {(stats.winRate * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        ) : (
          <div className="glass-card-solid p-6 text-center animate-fade-in">
            <Crown size={40} className="mx-auto text-gold-400 mb-3" />
            <h2 className="font-bold text-gray-900 dark:text-white mb-1">欢迎来到狂野HomeGame</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">开始你的第一场牌局吧</p>
            <button onClick={() => navigate('/new-game')} className="btn-primary">
              <Plus size={18} className="inline mr-1" /> 开启牌局
            </button>
          </div>
        )}

        {/* Game List */}
        <div>
          <h2 className="section-title">牌局记录</h2>
          {gameList.length > 0 ? (
            <div className="space-y-3">
              {gameList.slice(0, 10).map(game => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <p className="text-sm">暂无牌局记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
