import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { getPlayerStats, cn, formatGold, getStreakEmoji, formatDate } from '@/lib/utils';
import PlayerAvatar from '@/components/PlayerAvatar';
import ThemeToggle from '@/components/ThemeToggle';
import {
  LogOut, Edit3, TrendingUp, Zap, Target,
  Award, Gamepad2, Crown, Settings2
} from 'lucide-react';

function ProfitChart({ games, userId }: { games: import('@/types').Game[]; userId: string }) {
  const settledGames = games
    .filter(g => g.status === 'settled' && g.players[userId]?.isSettled);

  const last15 = settledGames.slice(-15);
  const profits = last15.map(g => g.players[userId].settledGold || 0);
  const maxAbs = Math.max(...profits.map(p => Math.abs(p)), 1);

  // Fixed 15 slots, fill from right
  const slots: (number | null)[] = Array(15).fill(null);
  const startIdx = 15 - profits.length;
  profits.forEach((p, i) => { slots[startIdx + i] = p; });

  return (
    <div className="glass-card-solid p-4">
      <h3 className="section-title mb-3">近15场盈亏</h3>
      {profits.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">暂无结算记录</p>
      ) : (
        <>
          <div className="flex items-end gap-1 h-28">
            {slots.map((profit, i) => {
              if (profit === null) {
                return <div key={i} className="flex-1 flex items-end" style={{ height: '100px' }}>
                  <div className="w-full h-1 bg-gray-100 dark:bg-surface-dark-secondary rounded-t" />
                </div>;
              }
              const height = Math.max((Math.abs(profit) / maxAbs) * 100, 6);
              const isPositive = profit >= 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className={cn('text-[9px] tabular-nums font-medium', isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
                    {profit !== 0 ? formatGold(profit) : '0'}
                  </span>
                  <div className="w-full flex items-end" style={{ height: '100px' }}>
                    <div className={cn('w-full rounded-t-sm transition-all duration-300',
                      isPositive ? 'bg-green-500 dark:bg-green-400' : 'bg-red-400 dark:bg-red-500')}
                      style={{ height: `${height}%`, minHeight: '4px' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
            <span>15场前</span>
            <span>最近</span>
          </div>
        </>
      )}
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: 'chart' | 'list'; onChange: (v: 'chart' | 'list') => void }) {
  return (
    <div className="flex items-center bg-gray-100 dark:bg-surface-dark-secondary rounded-lg p-0.5 gap-0.5">
      <button onClick={() => onChange('chart')}
        className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
          view === 'chart' ? 'bg-white dark:bg-surface-dark shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400')}>
        图表
      </button>
      <button onClick={() => onChange('list')}
        className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
          view === 'list' ? 'bg-white dark:bg-surface-dark shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400')}>
        列表
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const { currentUser, games, gameList, logout, updateProfile, isAdmin } = useApp();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState('');
  const [view, setView] = useState<'chart' | 'list'>('chart');

  if (!currentUser) return null;

  const allGames = Object.values(games);
  const stats = getPlayerStats(currentUser.id, allGames);
  const myGames = gameList.filter(g => g.players[currentUser.id]);
  const streakEmoji = stats ? getStreakEmoji(stats.currentStreak) : '';

  const handleSaveNickname = () => {
    if (nickname.trim()) updateProfile(nickname.trim());
    setIsEditing(false);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-card border-b border-gray-200/50 dark:border-white/10 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="font-bold text-lg text-gray-900 dark:text-white">个人资料</h1>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Profile Card */}
        <div className="glass-card-solid p-6 text-center animate-fade-in">
          <div className="relative inline-block mb-3">
            <PlayerAvatar nickname={currentUser.nickname} size="xl" />
            <button onClick={() => { setIsEditing(true); setNickname(currentUser.nickname); }}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-felt-700 text-white flex items-center justify-center shadow-lg">
              <Edit3 size={14} />
            </button>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2 max-w-xs mx-auto">
              <input type="text" value={nickname} onChange={e => setNickname(e.target.value)}
                className="input-field text-center py-2 text-lg font-bold" autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveNickname()} />
              <button onClick={handleSaveNickname} className="btn-primary py-2 px-4 text-sm">保存</button>
            </div>
          ) : (
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{currentUser.nickname}</h2>
          )}
          {isAdmin && (
            <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400">
              <Crown size={12} /> 管理员
            </span>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentUser.email}</p>
          {stats && (
            <div className="flex items-center justify-center gap-1 mt-2">
              {streakEmoji && <span className="text-lg">{streakEmoji}</span>}
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {stats.currentStreak > 0 && `${stats.currentStreak}连胜中`}
                {stats.currentStreak < 0 && `${Math.abs(stats.currentStreak)}连败中`}
                {stats.currentStreak === 0 && '无连胜/连败'}
              </span>
            </div>
          )}
        </div>

        {/* Main Profit Display */}
        {stats && (
          <div className="glass-card-solid p-5 text-center animate-slide-up">
            <p className="section-title mb-1">总盈亏</p>
            <p className={cn('text-4xl font-bold tabular-nums',
              stats.totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
              {formatGold(stats.totalProfit)}
            </p>
            <p className="text-sm text-gray-400 mt-1">金币</p>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 animate-slide-up">
            <StatCard icon={Zap} label="场均盈亏"
              value={`${formatGold(stats.avgProfit)}`}
              color={stats.avgProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'} />
            <StatCard icon={Target} label="胜率"
              value={`${(stats.winRate * 100).toFixed(0)}%`}
              color="text-blue-600 dark:text-blue-400" />
            <StatCard icon={Award} label="最大赢局"
              value={formatGold(stats.biggestWin)}
              color="text-green-600 dark:text-green-400" />
            <StatCard icon={Gamepad2} label="总局数"
              value={`${stats.totalGames} 场`}
              color="text-gray-700 dark:text-gray-300" />
          </div>
        )}

        {/* Chart / List Toggle */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title mb-0">牌局记录</h2>
            <ViewToggle view={view} onChange={setView} />
          </div>
          {view === 'chart' ? (
            <ProfitChart games={allGames} userId={currentUser.id} />
          ) : (
            myGames.length > 0 ? (
              <div className="glass-card-solid overflow-hidden">
                {myGames.map(game => {
                  const player = game.players[currentUser.id];
                  if (!player) return null;
                  const gold = player.settledGold;
                  const sorted = Object.values(game.players)
                    .filter(p => p.isSettled && p.settledGold !== null)
                    .sort((a, b) => (b.settledGold || 0) - (a.settledGold || 0));
                  const isRichest = sorted.length > 0 && sorted[0].userId === currentUser.id && (sorted[0].settledGold || 0) > 0;
                  const isCharity = sorted.length > 0 && sorted[sorted.length - 1].userId === currentUser.id && (sorted[sorted.length - 1].settledGold || 0) < 0;

                  return (
                    <button key={game.id} onClick={() => navigate(`/game/${game.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-surface-dark-secondary transition-colors">
                      <span className="text-sm text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">{formatDate(game.date)}</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">{game.location}</span>
                      {isRichest ? (
                        <span className="status-badge bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 text-xs">💰 富豪</span>
                      ) : isCharity ? (
                        <span className="status-badge bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs">🎁 慈善家</span>
                      ) : game.status === 'playing' ? (
                        <span className="status-badge bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs">进行中</span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                      {gold !== null ? (
                        <span className={cn('font-bold text-sm tabular-nums w-16 text-right', gold >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
                          {formatGold(gold)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 w-16 text-right">-</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Gamepad2 size={32} className="mx-auto mb-2" />
                <p className="text-sm">暂无牌局记录</p>
              </div>
            )
          )}
        </div>

        {/* Admin Link */}
        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full btn-secondary flex items-center justify-center gap-2 text-felt-600 dark:text-felt-400"
          >
            <Settings2 size={18} /> 进入管理后台
          </button>
        )}

        {/* Logout */}
        <button onClick={handleLogout} className="w-full btn-secondary flex items-center justify-center gap-2 text-red-500">
          <LogOut size={18} /> 退出登录
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof TrendingUp; label: string; value: string; color: string;
}) {
  return (
    <div className="glass-card-solid p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className={color} />
        <span className="section-title mb-0">{label}</span>
      </div>
      <p className={cn('text-lg font-bold tabular-nums', color)}>{value}</p>
    </div>
  );
}
