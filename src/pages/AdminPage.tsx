import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import { cn, formatDate, formatChips } from '@/lib/utils';
import PlayerAvatar from '@/components/PlayerAvatar';
import {
  Shield, Users, Gamepad2, ArrowLeft, Crown, Lock, Unlock,
  Trash2, ChevronDown, ChevronUp, Settings2, AlertTriangle,
  Wifi, WifiOff
} from 'lucide-react';

export default function AdminPage() {
  const {
    currentUser, isAdmin, games, gameList,
    allProfiles, fetchAllProfiles, setAdminStatus, setProtectedStatus, adminDeleteGame
  } = useApp();
  const onlineUsers = useOnlineUsers();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'players' | 'games'>('players');
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchAllProfiles();
    }
  }, [isAdmin, fetchAllProfiles]);

  if (!currentUser || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-red-400 mb-4" />
          <p className="text-gray-500">无权访问管理后台</p>
          <button onClick={() => navigate('/')} className="btn-primary mt-4">返回首页</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-card border-b border-gray-200/50 dark:border-white/10 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => navigate('/')} className="btn-ghost p-1">
            <ArrowLeft size={22} />
          </button>
          <h1 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <Settings2 size={20} className="text-felt-600" />
            管理后台
          </h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Tab Switch */}
        <div className="flex items-center bg-gray-100 dark:bg-surface-dark-secondary rounded-xl p-1 gap-0.5">
          <button
            onClick={() => setActiveTab('players')}
            className={cn(
              'tab-button',
              activeTab === 'players' ? 'tab-button-active' : 'tab-button-inactive'
            )}
          >
            <Users size={14} className="inline mr-1.5" />
            玩家管理 ({allProfiles.length})
          </button>
          <button
            onClick={() => setActiveTab('games')}
            className={cn(
              'tab-button',
              activeTab === 'games' ? 'tab-button-active' : 'tab-button-inactive'
            )}
          >
            <Gamepad2 size={14} className="inline mr-1.5" />
            牌局管理 ({gameList.length})
          </button>
        </div>

        {/* Players Tab */}
        {activeTab === 'players' && (
          <div className="space-y-2 animate-fade-in">
            {allProfiles.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users size={32} className="mx-auto mb-2" />
                <p className="text-sm">暂无注册用户</p>
              </div>
            ) : (
              allProfiles.map(profile => {
                const isExpanded = expandedPlayer === profile.id;
                const isCurrentUser = profile.id === currentUser.id;
                const isOnline = !!onlineUsers[profile.id];

                return (
                  <div key={profile.id} className="glass-card-solid overflow-hidden">
                    <button
                      onClick={() => setExpandedPlayer(isExpanded ? null : profile.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
                      <div className="relative">
                        <PlayerAvatar nickname={profile.nickname} size="md" />
                        {isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-surface-dark" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                            {profile.nickname}
                          </span>
                          {isOnline && (
                            <span className="status-badge bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                              <Wifi size={10} className="mr-1" /> 在线
                            </span>
                          )}
                          {profile.isAdmin && (
                            <span className="status-badge bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400">
                              <Crown size={10} className="mr-1" /> 管理员
                            </span>
                          )}
                          {profile.isProtected && (
                            <span className="status-badge bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                              <Lock size={10} className="mr-1" /> 工具人
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{profile.email}</p>
                      </div>
                      <div className="text-gray-300 dark:text-gray-600">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-white/5 animate-slide-down">
                        <div className="mt-3 space-y-2">
                          {/* Admin Toggle */}
                          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-surface-dark-secondary">
                            <div className="flex items-center gap-2">
                              <Crown size={16} className={profile.isAdmin ? 'text-gold-500' : 'text-gray-400'} />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">管理员权限</span>
                            </div>
                            <button
                              onClick={() => setAdminStatus(profile.id, !profile.isAdmin)}
                              disabled={isCurrentUser}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                profile.isAdmin
                                  ? 'bg-gold-500 text-black'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
                                isCurrentUser && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              {profile.isAdmin ? '已开启' : '已关闭'}
                            </button>
                          </div>

                          {/* Protected Toggle */}
                          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-surface-dark-secondary">
                            <div className="flex items-center gap-2">
                              {profile.isProtected ? (
                                <Lock size={16} className="text-blue-500" />
                              ) : (
                                <Unlock size={16} className="text-gray-400" />
                              )}
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">工具人账号</span>
                            </div>
                            <button
                              onClick={() => setProtectedStatus(profile.id, !profile.isProtected)}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                profile.isProtected
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                              )}
                            >
                              {profile.isProtected ? '受保护' : '未保护'}
                            </button>
                          </div>

                          {/* Protected Warning */}
                          {profile.isProtected && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                              <Lock size={16} className="text-blue-500 flex-shrink-0" />
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                此账号为工具人账号，受保护状态，无法被删除
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Games Tab */}
        {activeTab === 'games' && (
          <div className="space-y-2 animate-fade-in">
            {gameList.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Gamepad2 size={32} className="mx-auto mb-2" />
                <p className="text-sm">暂无牌局记录</p>
              </div>
            ) : (
              gameList.map(game => {
                const isExpanded = expandedGame === game.id;
                const players = Object.values(game.players);
                const statusColors = {
                  waiting: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                  playing: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                  settled: 'bg-gray-100 dark:bg-gray-800 text-gray-500',
                };
                const statusLabels = { waiting: '等待中', playing: '进行中', settled: '已结算' };

                return (
                  <div key={game.id} className="glass-card-solid overflow-hidden">
                    <button
                      onClick={() => setExpandedGame(isExpanded ? null : game.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                            {game.location || '未命名牌局'}
                          </span>
                          <span className={cn('status-badge', statusColors[game.status])}>
                            {statusLabels[game.status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>{formatDate(game.date)}</span>
                          <span>{players.length}人</span>
                          <span>{players.reduce((s, p) => s + p.buyInHands, 0)}手</span>
                        </div>
                      </div>
                      <div className="text-gray-300 dark:text-gray-600">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-white/5 animate-slide-down">
                        <div className="mt-3 space-y-3">
                          {/* Player List */}
                          <div>
                            <p className="text-xs text-gray-400 mb-2">参与玩家</p>
                            <div className="flex flex-wrap gap-2">
                              {players.map(player => (
                                <div
                                  key={player.userId}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-surface-dark-secondary"
                                >
                                  <PlayerAvatar nickname={player.nickname} size="sm" />
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {player.nickname}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Game Stats */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded-lg bg-gray-50 dark:bg-surface-dark-secondary text-center">
                              <p className="text-xs text-gray-400">总筹码</p>
                              <p className="font-bold text-sm text-gray-900 dark:text-white">
                                {formatChips(players.reduce((s, p) => s + p.totalChips, 0))}
                              </p>
                            </div>
                            <div className="p-2 rounded-lg bg-gray-50 dark:bg-surface-dark-secondary text-center">
                              <p className="text-xs text-gray-400">每手筹码</p>
                              <p className="font-bold text-sm text-gray-900 dark:text-white">
                                {formatChips(game.chipsPerHand)}
                              </p>
                            </div>
                          </div>

                          {/* Delete Button */}
                          {confirmDelete === game.id ? (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
                              <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                              <p className="text-xs text-red-600 dark:text-red-400 flex-1">
                                确定删除此牌局？此操作不可撤销。
                              </p>
                              <button
                                onClick={() => {
                                  adminDeleteGame(game.id);
                                  setConfirmDelete(null);
                                  setExpandedGame(null);
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 text-white"
                              >
                                确认删除
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(game.id)}
                              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            >
                              <Trash2 size={16} />
                              删除牌局
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
