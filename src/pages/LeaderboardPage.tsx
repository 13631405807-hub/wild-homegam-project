import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { calculateLeaderboard, cn, formatGold, getBadgeInfo } from '@/lib/utils';
import PlayerAvatar from '@/components/PlayerAvatar';
import { Trophy, Medal, TrendingUp, TrendingDown, Crown } from 'lucide-react';

export default function LeaderboardPage() {
  const { games, currentUser } = useApp();
  const [filter, setFilter] = useState<'all' | 'month' | 'week'>('all');

  const gameList = Object.values(games);

  // Filter games by time period
  const filteredGames = gameList.filter(game => {
    if (game.status !== 'settled') return false;
    const gameDate = new Date(game.date);
    const now = new Date();
    if (filter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return gameDate >= weekAgo;
    }
    if (filter === 'month') {
      return gameDate.getMonth() === now.getMonth() && gameDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const leaderboard = calculateLeaderboard(filteredGames);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-card border-b border-gray-200/50 dark:border-white/10 px-4 py-3">
        <div className="flex items-center justify-center max-w-lg mx-auto">
          <h1 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy size={20} className="text-gold-500" />
            排行榜
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Time Filter */}
        <div className="flex items-center bg-gray-100 dark:bg-surface-dark-secondary rounded-xl p-1 gap-0.5">
          {[
            { key: 'all' as const, label: '全部' },
            { key: 'month' as const, label: '本月' },
            { key: 'week' as const, label: '本周' },
          ].map(option => (
            <button
              key={option.key}
              onClick={() => setFilter(option.key)}
              className={cn(
                'tab-button',
                filter === option.key ? 'tab-button-active' : 'tab-button-inactive'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-20">
            <Trophy size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">暂无已结算的牌局</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">完成牌局结算后将自动计算排名</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <div className="flex items-end justify-center gap-3 py-4 animate-fade-in">
                {/* 2nd Place */}
                <PodiumCard entry={leaderboard[1]} place={2} />
                {/* 1st Place */}
                <PodiumCard entry={leaderboard[0]} place={1} />
                {/* 3rd Place */}
                <PodiumCard entry={leaderboard[2]} place={3} />
              </div>
            )}

            {/* Full List */}
            <div className="glass-card-solid overflow-hidden">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.userId}
                  className={cn(
                    'flex items-center gap-3 p-4 transition-colors',
                    index < leaderboard.length - 1 && 'border-b border-gray-100 dark:border-white/5',
                    entry.userId === currentUser?.id && 'bg-felt-50 dark:bg-felt-900/20',
                  )}
                >
                  {/* Rank */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                    entry.rank === 1 && 'bg-gold-100 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400',
                    entry.rank === 2 && 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
                    entry.rank === 3 && 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
                    entry.rank > 3 && 'text-gray-400',
                  )}>
                    {entry.rank}
                  </div>

                  <PlayerAvatar nickname={entry.nickname} size="md" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {entry.nickname}
                      </span>
                      {entry.badge && (
                        <span className={cn('text-sm', getBadgeInfo(entry.badge).color)}>
                          {getBadgeInfo(entry.badge).emoji}
                        </span>
                      )}
                      {entry.userId === currentUser?.id && (
                        <span className="text-xs text-felt-600 dark:text-felt-400 font-medium">你</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      <span>{entry.totalGames}场</span>
                      <span>胜率 {(entry.winRate * 100).toFixed(0)}%</span>
                      {entry.badge && (
                        <span className={cn('font-medium', getBadgeInfo(entry.badge).color)}>
                          {getBadgeInfo(entry.badge).label}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={cn(
                      'font-bold tabular-nums',
                      entry.totalProfit >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-500'
                    )}>
                      {formatGold(entry.totalProfit)}
                    </p>
                    <p className="text-xs text-gray-400">金币</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="glass-card-solid p-4">
              <h3 className="section-title mb-3">称号说明</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { emoji: '💰', label: '富豪', desc: '总盈利前三' },
                  { emoji: '🎁', label: '慈善家', desc: '总亏损后二' },
                  { emoji: '📈', label: '连胜王', desc: '胜率≥70%且≥3场' },
                  { emoji: '🔥', label: '活跃玩家', desc: '参与≥5场' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-surface-dark-secondary">
                    <span className="text-lg">{item.emoji}</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PodiumCard({ entry, place }: { entry: { nickname: string; totalProfit: number; badge?: string }; place: number }) {
  const podiumHeights = [90, 65, 50]; // px heights for podium blocks
  const colors = ['from-gold-400 to-gold-500', 'from-gray-300 to-gray-400', 'from-orange-400 to-orange-500'];
  const emojis = ['👑', '🥈', '🥉'];

  return (
    <div className="flex flex-col items-center w-24">
      <PlayerAvatar nickname={entry.nickname} size={place === 1 ? 'lg' : 'md'} />
      <span className="text-base mt-1">{emojis[place - 1]}</span>
      <p className="font-bold text-xs text-gray-900 dark:text-white mt-1 text-center leading-tight">
        {entry.nickname}
      </p>
      <p className={cn('font-bold text-xs tabular-nums', entry.totalProfit >= 0 ? 'text-green-600' : 'text-red-500')}>
        {formatGold(entry.totalProfit)}
      </p>
      <div className="flex-1 min-h-[8px]" />
      <div
        className={cn('w-full rounded-t-xl bg-gradient-to-b flex items-center justify-center', colors[place - 1])}
        style={{ height: podiumHeights[place - 1] }}
      >
        <span className="text-white font-bold text-lg">{place}</span>
      </div>
    </div>
  );
}
