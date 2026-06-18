import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { cn, formatChips, formatGold, chipsToGold, calculateGameSettlement, calculateBankerTip, formatTimestamp, getLogActionLabel } from '@/lib/utils';
import PlayerAvatar from '@/components/PlayerAvatar';
import {
  ArrowLeft, Settings2, Plus, Minus, Check, AlertTriangle,
  ChevronDown, ChevronUp, DollarSign, UserPlus, Shield,
  Shuffle, ArrowRightLeft, ScrollText, Filter, Banknote
} from 'lucide-react';

function useGameDuration(startedAt: string | null, settledAt: string | null, status: string) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (status === 'settled' && startedAt && settledAt) {
      const diff = new Date(settledAt).getTime() - new Date(startedAt).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setElapsed(h > 0 ? `${h}时${m}分` : `${m}分钟`);
      return;
    }
    if (status === 'settled') { setElapsed('已结束'); return; }
    if (!startedAt) { setElapsed(''); return; }
    const update = () => {
      const diff = Date.now() - new Date(startedAt).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setElapsed(h > 0 ? `${h}时${m}分` : `${m}分钟`);
    };
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [startedAt, settledAt, status]);
  return elapsed;
}

export default function GameLobbyPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const {
    currentUser, users, games, joinGame, addPlayerToGame, setBanker,
    transferBanker, randomBanker, updateGameSettings,
    buyIn, batchBuyIn, returnChips, settlePlayer, startGame, settleGame,
    fetchAllUsers
  } = useApp();

  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [buyInHands, setBuyInHands] = useState(1);
  const [batchHands, setBatchHands] = useState(1);
  const [showBatchBuy, setShowBatchBuy] = useState(false);
  const [returnHands, setReturnHands] = useState(1);
  const [settleChips, setSettleChips] = useState(0);
  const [activePlayer, setActivePlayer] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<'buy' | 'return' | 'settle'>('buy');
  const [settleView, setSettleView] = useState<'receipt' | 'detail'>('receipt');
  const [showSettings, setShowSettings] = useState(false);
  const [tempChips, setTempChips] = useState(1000);
  const [tempGold, setTempGold] = useState(50);
  const [showLog, setShowLog] = useState(false);
  const [logFilter, setLogFilter] = useState<string>('all');
  const [showBankerMenu, setShowBankerMenu] = useState(false);

  // Fetch all users when component mounts
  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  if (!gameId || !currentUser) return null;
  const game = games[gameId];
  if (!game) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">牌局不存在</p></div>;

  const players = Object.values(game.players);
  const isBanker = game.bankerId === currentUser.id;
  const isInGame = !!game.players[currentUser.id];
  const allSettled = players.length > 0 && players.every(p => p.isSettled);
  const settlement = calculateGameSettlement(game);
  const tipInfo = calculateBankerTip(game);
  const availableUsers = Object.values(users).filter(u => !game.players[u.id]);
  const totalChipsInPlay = players.reduce((s, p) => s + p.totalChips, 0);
  const totalHands = players.reduce((s, p) => s + p.buyInHands, 0);
  const duration = useGameDuration(game.startedAt, game.settledAt, game.status);

  const filteredLogs = logFilter === 'all'
    ? game.logs
    : game.logs.filter(l => l.targetId === logFilter || l.actorId === logFilter);

  const handleBuyIn = (userId: string) => {
    if (buyInHands <= 0) return;
    buyIn(gameId, userId, buyInHands);
    setBuyInHands(1);
    setActivePlayer(null);
  };

  const handleReturn = (userId: string) => {
    if (returnHands <= 0) return;
    returnChips(gameId, userId, returnHands);
    setReturnHands(1);
    setActivePlayer(null);
  };

  const handleSettle = (userId: string) => {
    settlePlayer(gameId, userId, settleChips);
    setSettleChips(0);
    setActivePlayer(null);
  };

  return (
    <div className="min-h-screen pb-8">
      {/* ===== Top Header ===== */}
      <div className="sticky top-0 z-40 glass-card border-b border-gray-200/50 dark:border-white/10 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => navigate('/')} className="btn-ghost p-1">
            <ArrowLeft size={22} />
          </button>
          <div className="text-center flex-1">
            <h1 className="font-bold text-base text-gray-900 dark:text-white truncate">{game.location || '牌局'}</h1>
            <p className="text-xs text-gray-400">{game.date}</p>
          </div>
          {isBanker && game.status === 'waiting' ? (
            <button onClick={() => setShowSettings(!showSettings)} className="btn-ghost p-1"><Settings2 size={20} /></button>
          ) : (
            <div className="w-8" />
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* ===== Game Info Card ===== */}
        <div className="glass-card-solid p-4">
          <div className="flex items-center justify-between mb-3">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              {game.status === 'waiting' && (
                <span className="status-badge bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
                  等待中
                </span>
              )}
              {game.status === 'playing' && (
                <span className="status-badge bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                  进行中
                </span>
              )}
              {game.status === 'settled' && (
                <span className="status-badge bg-gray-100 dark:bg-gray-800 text-gray-500">
                  <Check size={12} className="mr-1" /> 已结束
                </span>
              )}
              {game.status === 'playing' && (
                <span className="text-xs text-gray-500 dark:text-gray-400">已进行 {duration}</span>
              )}
              {game.status === 'settled' && duration && (
                <span className="text-xs text-gray-500 dark:text-gray-400">历时 {duration}</span>
              )}
            </div>
            {/* Banker */}
            {game.bankerId && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                银行家: {users[game.bankerId]?.nickname}
              </span>
            )}
          </div>
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{players.length}</p>
              <p className="text-xs text-gray-400">玩家</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{totalHands}</p>
              <p className="text-xs text-gray-400">买入手数</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{formatChips(totalChipsInPlay)}</p>
              <p className="text-xs text-gray-400">总筹码</p>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && isBanker && game.status === 'waiting' && (
          <div className="glass-card-solid p-4 animate-slide-down">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">牌局设置</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">每手筹码</label>
                <input type="number" value={tempChips} onChange={e => setTempChips(Number(e.target.value))} className="input-field text-center py-2" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">每手金币</label>
                <input type="number" value={tempGold} onChange={e => setTempGold(Number(e.target.value))} className="input-field text-center py-2" />
              </div>
            </div>
            <button onClick={() => { updateGameSettings(gameId, tempChips, tempGold); setShowSettings(false); }} className="w-full btn-primary text-sm py-2.5">保存</button>
          </div>
        )}

        {/* Action Buttons */}
        {game.status === 'waiting' && !isInGame && (
          <button onClick={() => joinGame(gameId)} className="w-full btn-primary text-lg py-4 flex items-center justify-center gap-2">
            <UserPlus size={20} /> 加入牌局
          </button>
        )}

        {/* Banker Selection (Waiting) */}
        {game.status === 'waiting' && isInGame && players.length >= 1 && (
          <div className="flex gap-2">
            {!game.bankerId && (
              <button onClick={() => setBanker(gameId, currentUser.id)} className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm">
                <Shield size={16} /> 我来当银行家
              </button>
            )}
            <button onClick={() => randomBanker(gameId)} className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm">
              <Shuffle size={16} /> 随机银行家
            </button>
          </div>
        )}

        {/* Banker Transfer (Playing) */}
        {game.status === 'playing' && isBanker && (
          <div>
            <button onClick={() => setShowBankerMenu(!showBankerMenu)} className="btn-ghost w-full flex items-center justify-center gap-2 text-sm">
              <ArrowRightLeft size={16} /> 移交银行家
            </button>
            {showBankerMenu && (
              <div className="glass-card-solid p-3 mt-2 animate-slide-down">
                <div className="space-y-1">
                  {players.filter(p => p.userId !== currentUser.id).map(p => (
                    <button key={p.userId} onClick={() => { transferBanker(gameId, p.userId); setShowBankerMenu(false); }}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-surface-dark-secondary transition-colors">
                      <PlayerAvatar nickname={p.nickname} size="sm" />
                      <span className="font-medium text-sm">{p.nickname}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Start Game + Batch Buy-in */}
        {game.status === 'waiting' && isBanker && players.length >= 2 && game.bankerId && (
          <div className="space-y-3">
            {/* Batch Buy-in */}
            <div className="glass-card-solid p-3">
              <button onClick={() => setShowBatchBuy(!showBatchBuy)}
                className="btn-ghost w-full flex items-center justify-between text-sm">
                <span>批量买入（给所有人）</span>
                {showBatchBuy ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showBatchBuy && (
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => setBatchHands(Math.max(1, batchHands - 1))} className="btn-secondary py-2 px-3"><Minus size={16} /></button>
                  <input type="number" value={batchHands} onChange={e => setBatchHands(Math.max(1, Number(e.target.value)))}
                    className="input-field text-center py-2 w-16" min="1" />
                  <button onClick={() => setBatchHands(batchHands + 1)} className="btn-secondary py-2 px-3"><Plus size={16} /></button>
                  <button onClick={() => { batchBuyIn(gameId, batchHands); setShowBatchBuy(false); }}
                    className="btn-primary py-2 px-4 text-sm flex-1">
                    每人 {batchHands} 手 ({formatChips(batchHands * game.chipsPerHand)})
                  </button>
                </div>
              )}
            </div>
            <button onClick={() => startGame(gameId)} className="w-full btn-gold text-lg py-4 animate-pulse-gold">开始牌局</button>
          </div>
        )}
        {game.status === 'playing' && isBanker && allSettled && (
          <button onClick={() => settleGame(gameId)} className="w-full btn-gold text-lg py-4 flex items-center justify-center gap-2">
            <Check size={20} /> 结束牌局
          </button>
        )}

        {/* Add Player */}
        {isBanker && (game.status === 'waiting' || game.status === 'playing') && (
          <div>
            <button onClick={() => setShowAddPlayer(!showAddPlayer)} className="btn-ghost w-full flex items-center justify-center gap-2 text-sm">
              <UserPlus size={16} /> 添加玩家
            </button>
            {showAddPlayer && (
              <div className="glass-card-solid p-3 mt-2 animate-slide-down">
                {availableUsers.length > 0 ? (
                  <div className="space-y-1">
                    {availableUsers.map(user => (
                      <button key={user.id} onClick={() => { addPlayerToGame(gameId, user.id); setShowAddPlayer(false); }}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-surface-dark-secondary transition-colors">
                        <PlayerAvatar nickname={user.nickname} size="sm" />
                        <span className="font-medium text-sm">{user.nickname}</span>
                      </button>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-500 text-center py-2">暂无可添加的玩家</p>}
              </div>
            )}
          </div>
        )}

        {/* ===== Player List + Gold Pool (hidden when settled) ===== */}
        {game.status !== 'settled' && (<div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="section-title">玩家</h2>
            {game.status === 'playing' && (
              <span className="text-xs text-gray-400">{players.filter(p => p.isSettled).length}/{players.length} 已结算</span>
            )}
          </div>

          <div className="space-y-2">
            {players.map(player => {
              const isExpanded = activePlayer === player.userId;

              return (
                <div key={player.userId} className="glass-card-solid overflow-hidden">
                  {/* Player Row */}
                  <button onClick={() => { setActivePlayer(isExpanded ? null : player.userId); setActiveAction('buy'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    <PlayerAvatar nickname={player.nickname} size="md" isBanker={player.userId === game.bankerId} isSettled={player.isSettled} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-gray-900 dark:text-white truncate">{player.nickname}</span>
                        {player.userId === game.bankerId && (
                          <span className="status-badge bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400">银行家</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{player.buyInHands}手买入</div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-base text-gray-900 dark:text-white tabular-nums">{formatChips(player.totalChips)}</p>
                      <p className="text-xs text-gray-400">筹码</p>
                    </div>
                    {game.status !== 'waiting' && (
                      <div className="text-gray-300 dark:text-gray-600 ml-1">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    )}
                  </button>

                  {/* Settled result */}
                  {player.isSettled && player.settledGold !== null && (
                    <div className="px-4 pb-2 -mt-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">剩余 {formatChips(player.remainingChips || 0)}</span>
                        <span className={cn('font-bold tabular-nums', player.settledGold >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
                          {formatGold(player.settledGold)} 金币
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Expanded: Banker Actions */}
                  {isExpanded && isBanker && game.status === 'playing' && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-white/5 animate-slide-down">
                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-3 mb-3">
                        {!player.isSettled && (
                          <>
                            <button onClick={() => setActiveAction('buy')}
                              className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95',
                                activeAction === 'buy' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-surface-dark-secondary text-gray-600 dark:text-gray-300')}>
                              <Plus size={16} /><span>买入</span>
                            </button>
                            <button onClick={() => setActiveAction('return')}
                              className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95',
                                activeAction === 'return' ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-surface-dark-secondary text-gray-600 dark:text-gray-300')}>
                              <Minus size={16} /><span>还码</span>
                            </button>
                          </>
                        )}
                        <button onClick={() => setActiveAction('settle')}
                          className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95',
                            activeAction === 'settle' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-surface-dark-secondary text-gray-600 dark:text-gray-300')}>
                          <Check size={16} /><span>{player.isSettled ? '重新结算' : '结算'}</span>
                        </button>
                      </div>

                      {/* Buy In */}
                      {activeAction === 'buy' && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setBuyInHands(Math.max(1, buyInHands - 1))} className="btn-secondary py-2 px-3"><Minus size={16} /></button>
                          <input type="number" value={buyInHands} onChange={e => setBuyInHands(Math.max(1, Number(e.target.value)))} className="input-field text-center py-2 w-16" min="1" />
                          <button onClick={() => setBuyInHands(buyInHands + 1)} className="btn-secondary py-2 px-3"><Plus size={16} /></button>
                          <button onClick={() => handleBuyIn(player.userId)} className="btn-primary py-2 px-4 text-sm flex-1">
                            +{formatChips(buyInHands * game.chipsPerHand)}
                          </button>
                        </div>
                      )}

                      {/* Return Chips */}
                      {activeAction === 'return' && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setReturnHands(Math.max(1, returnHands - 1))} className="btn-secondary py-2 px-3"><Minus size={16} /></button>
                          <input type="number" value={returnHands} onChange={e => setReturnHands(Math.max(1, Number(e.target.value)))} className="input-field text-center py-2 w-16" min="1" />
                          <button onClick={() => setReturnHands(returnHands + 1)} className="btn-secondary py-2 px-3"><Plus size={16} /></button>
                          <button onClick={() => handleReturn(player.userId)} disabled={returnHands > player.buyInHands}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 text-sm rounded-xl transition-all disabled:opacity-50 flex-1">
                            -{formatChips(returnHands * game.chipsPerHand)}
                          </button>
                        </div>
                      )}

                      {/* Settle / Re-settle */}
                      {activeAction === 'settle' && (
                        <div>
                          <div className="flex items-center gap-2">
                            <input type="number" value={settleChips} onChange={e => setSettleChips(Number(e.target.value))}
                              placeholder="剩余筹码" className="input-field py-2 flex-1"
                              onFocus={() => { if (settleChips === 0 && player.remainingChips) setSettleChips(player.remainingChips); }} />
                            <button onClick={() => handleSettle(player.userId)}
                              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 text-sm rounded-xl transition-all active:scale-95">
                              {player.isSettled ? '更新' : '结算'}
                            </button>
                          </div>
                          {settleChips !== player.totalChips && (
                            <p className={cn('text-xs mt-1 font-medium text-right',
                              settleChips - player.totalChips >= 0 ? 'text-green-600' : 'text-red-500')}>
                              {formatGold(chipsToGold(settleChips - player.totalChips, game.chipsPerHand, game.goldPerHand))} 金币
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        {/* ===== Gold Pool Indicator (during play) ===== */}
        {game.status === 'playing' && (
          <div className="glass-card-solid p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">金币对齐</span>
              {players.filter(p => p.isSettled).length > 0 ? (
                <span className={cn('text-lg font-bold tabular-nums',
                  settlement.isBalanced ? 'text-green-600 dark:text-green-400' : 'text-orange-500')}>
                  {settlement.isBalanced ? '✓ 对齐' : `差额 ${settlement.totalGoldSum}`}
                </span>
              ) : (
                <span className="text-lg font-bold tabular-nums text-gray-400">等待结算</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              总筹码 {formatChips(totalChipsInPlay)} · 总金币 {chipsToGold(totalChipsInPlay, game.chipsPerHand, game.goldPerHand)}
              {players.filter(p => p.isSettled).length > 0 && (
                <> · 已结算 {players.filter(p => p.isSettled).length}/{players.length} 人</>
              )}
            </p>
          </div>
        )}
        </div>)}

        {/* ===== Settlement Summary ===== */}
        {game.status === 'settled' && (
          <div className="glass-card-solid p-4 animate-slide-up">
            {/* Header with toggle */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <DollarSign size={18} className="text-gold-500" /> 结算汇总
              </h3>
              <div className="flex items-center bg-gray-100 dark:bg-surface-dark-secondary rounded-lg p-0.5 gap-0.5">
                <button onClick={() => setSettleView('receipt')}
                  className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                    settleView === 'receipt' ? 'bg-white dark:bg-surface-dark shadow-sm text-gray-900 dark:text-white' : 'text-gray-500')}>
                  小票
                </button>
                <button onClick={() => setSettleView('detail')}
                  className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                    settleView === 'detail' ? 'bg-white dark:bg-surface-dark shadow-sm text-gray-900 dark:text-white' : 'text-gray-500')}>
                  详情
                </button>
              </div>
            </div>

            {/* Balance Check */}
            <div className={cn('rounded-xl p-3 flex items-center gap-3 mb-4', settlement.isBalanced ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20')}>
              {settlement.isBalanced ? (
                <>
                  <Check size={20} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-300 text-sm">金币对齐 ✓</p>
                    <p className="text-xs text-green-600 dark:text-green-400">盈亏总和为 0</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-600 text-sm">金币未对齐</p>
                    <p className="text-xs text-red-500">差额: {settlement.totalGoldSum} 金币</p>
                  </div>
                </>
              )}
            </div>

            {/* Receipt View (compact - all players) */}
            {settleView === 'receipt' && (
              <div className="space-y-1.5">
                {[...players].sort((a, b) => (b.settledGold || 0) - (a.settledGold || 0)).map(player => (
                  <div key={player.userId} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <PlayerAvatar nickname={player.nickname} size="sm" />
                      <span className="font-medium text-sm text-gray-900 dark:text-white">{player.nickname}</span>
                    </div>
                    <span className={cn('font-bold tabular-nums', (player.settledGold || 0) > 0 ? 'text-green-600 dark:text-green-400' : (player.settledGold || 0) < 0 ? 'text-red-500' : 'text-gray-400')}>
                      {player.settledGold !== null ? formatGold(player.settledGold) : '0'}
                    </span>
                  </div>
                ))}
                {settlement.isBalanced && tipInfo.breakdown.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-gray-200 dark:border-white/10">
                    {tipInfo.breakdown.map((b, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1">
                        <span className="text-gray-500">💰 {b.nickname} 打赏银行家</span>
                        <span className="font-medium text-gold-600 dark:text-gold-400">{b.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Detail View (all players + chips + badges) */}
            {settleView === 'detail' && (() => {
              const sorted = [...players].sort((a, b) => (b.settledGold || 0) - (a.settledGold || 0));
              const richestId = sorted.length > 0 && (sorted[0].settledGold || 0) > 0 ? sorted[0].userId : null;
              const charityId = sorted.length > 0 && (sorted[sorted.length - 1].settledGold || 0) < 0 ? sorted[sorted.length - 1].userId : null;

              return (
                <div className="space-y-2">
                  {sorted.map(player => (
                    <div key={player.userId} className="py-2 border-b border-gray-50 dark:border-white/5 last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PlayerAvatar nickname={player.nickname} size="sm" />
                          <span className="font-medium text-sm text-gray-900 dark:text-white">{player.nickname}</span>
                          {player.userId === richestId && (
                            <span className="text-xs">💰 富豪</span>
                          )}
                          {player.userId === charityId && richestId !== charityId && (
                            <span className="text-xs">🎁 慈善家</span>
                          )}
                        </div>
                        <span className={cn('font-bold tabular-nums', (player.settledGold || 0) > 0 ? 'text-green-600 dark:text-green-400' : (player.settledGold || 0) < 0 ? 'text-red-500' : 'text-gray-400')}>
                          {player.settledGold !== null ? formatGold(player.settledGold) : '0'} 金币
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400 ml-10">
                        <span>买入 {formatChips(player.totalChips)}</span>
                        <span>剩余 {formatChips(player.remainingChips || 0)}</span>
                        <span>差额 {formatChips((player.remainingChips || 0) - player.totalChips)}</span>
                      </div>
                    </div>
                  ))}
                  {settlement.isBalanced && tipInfo.breakdown.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-gray-200 dark:border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Banknote size={16} className="text-gold-500" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">银行家打赏</span>
                        <span className="text-xs text-gray-500">({players.length >= 7 || totalHands >= 40 ? '大型' : '标准'})</span>
                      </div>
                      {tipInfo.breakdown.map((b, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1">
                          <span className="text-gray-600 dark:text-gray-300">{b.nickname}</span>
                          <span className="font-medium text-gold-600 dark:text-gold-400">{b.amount} 金币</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ===== Operation Log (larger font) ===== */}
        <div>
          <button onClick={() => setShowLog(!showLog)} className="btn-ghost w-full flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5"><ScrollText size={14} /> 操作日志 ({game.logs.length})</span>
            {showLog ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showLog && (
            <div className="glass-card-solid p-4 mt-2 animate-slide-down">
              {/* Log Filter */}
              <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
                <Filter size={14} className="text-gray-400 flex-shrink-0" />
                <button onClick={() => setLogFilter('all')}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                    logFilter === 'all' ? 'bg-felt-700 text-white' : 'bg-gray-100 dark:bg-surface-dark-secondary text-gray-600 dark:text-gray-300')}>
                  全部
                </button>
                {players.map(p => (
                  <button key={p.userId} onClick={() => setLogFilter(logFilter === p.userId ? 'all' : p.userId)}
                    className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                      logFilter === p.userId ? 'bg-felt-700 text-white' : 'bg-gray-100 dark:bg-surface-dark-secondary text-gray-600 dark:text-gray-300')}>
                    {p.nickname}
                  </button>
                ))}
              </div>

              {/* Log Entries - larger */}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {filteredLogs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">暂无日志</p>
                ) : (
                  [...filteredLogs].reverse().map(log => (
                    <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-50 dark:border-white/5 last:border-0">
                      <span className="text-xs text-gray-400 tabular-nums flex-shrink-0 pt-0.5 w-16">{formatTimestamp(log.timestamp)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn('text-sm font-semibold',
                            log.action === 'buy_in' ? 'text-green-600 dark:text-green-400' :
                            log.action === 'return' ? 'text-orange-500' :
                            log.action === 'settle' ? 'text-blue-500' :
                            log.action === 'join' ? 'text-purple-500 dark:text-purple-400' :
                            'text-gray-500')}>
                            {getLogActionLabel(log.action)}
                          </span>
                          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{log.targetName}</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {log.action === 'join'
                            ? '加入牌局'
                            : log.action === 'settle'
                            ? `剩余 ${formatChips(log.remainingChips || 0)} → ${formatGold(log.settledGold || 0)} 金币${log.note ? ` (${log.note})` : ''}`
                            : log.action === 'banker_set' || log.action === 'banker_transfer'
                            ? (log.note || '')
                            : `${log.action === 'return' ? '-' : '+'}${log.hands}手 (${formatChips(Math.abs(log.chips || 0))})`
                          }
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
