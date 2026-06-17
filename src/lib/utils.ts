import { Game, GamePlayer, PlayerStats, LeaderboardEntry } from '@/types';

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function formatChips(chips: number): string {
  if (Math.abs(chips) >= 10000) {
    return (chips / 10000).toFixed(1) + 'w';
  }
  return chips.toLocaleString();
}

export function formatGold(gold: number): string {
  const sign = gold > 0 ? '+' : '';
  return `${sign}${Math.round(gold)}`;
}

export function chipsToGold(chips: number, chipsPerHand: number, goldPerHand: number): number {
  return (chips / chipsPerHand) * goldPerHand;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;

  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export function isEveningTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 6;
}

// 计算单个玩家的金币盈亏
export function calcPlayerGold(player: GamePlayer, chipsPerHand: number, goldPerHand: number): number {
  if (!player.isSettled || player.remainingChips === null) return 0;
  const diff = player.remainingChips - player.totalChips;
  return Math.round(chipsToGold(diff, chipsPerHand, goldPerHand));
}

// 计算牌局结算状态
export function calculateGameSettlement(game: Game): GameSettlement {
  const players = Object.values(game.players);
  const totalBuyInChips = players.reduce((sum, p) => sum + p.totalChips, 0);

  const settledPlayers = players.filter(p => p.isSettled);
  const totalSettledChips = settledPlayers.reduce((sum, p) => sum + (p.remainingChips || 0), 0);

  // 所有已结算玩家的金币盈亏之和（零和游戏应为0）
  const totalGoldSum = settledPlayers.reduce((sum, p) => {
    return sum + calcPlayerGold(p, game.chipsPerHand, game.goldPerHand);
  }, 0);

  return {
    totalBuyInChips,
    totalChips: totalBuyInChips,
    totalSettledChips,
    totalGoldSum: Math.round(totalGoldSum),
    isBalanced: Math.abs(totalGoldSum) <= 1, // 允许1金币的四舍五入误差
  };
}

// 计算银行家打赏
export function calculateBankerTip(game: Game): {
  tipAmount: number;
  breakdown: { nickname: string; amount: number }[];
} {
  const players = Object.values(game.players);
  const settledPlayers = players.filter(p => p.isSettled && p.settledGold !== null);

  if (settledPlayers.length < 2) return { tipAmount: 0, breakdown: [] };

  const totalHands = players.reduce((sum, p) => sum + p.buyInHands, 0);
  const isLargeGame = players.length >= 7 || totalHands >= 40;
  const tipAmount = isLargeGame ? 20 : 10;

  // 按盈利排序
  const sorted = [...settledPlayers].sort((a, b) => (b.settledGold || 0) - (a.settledGold || 0));

  // 只有盈利的人才需要打赏
  const winners = sorted.filter(p => (p.settledGold || 0) > 0);
  if (winners.length === 0) return { tipAmount: 0, breakdown: [] };

  const breakdown: { nickname: string; amount: number }[] = [];

  if (!isLargeGame) {
    // 普通牌局：盈利最多的人出10
    breakdown.push({ nickname: winners[0].nickname, amount: 10 });
  } else {
    // 大型牌局：20金币
    if (winners.length === 1) {
      breakdown.push({ nickname: winners[0].nickname, amount: 20 });
    } else {
      const firstProfit = winners[0].settledGold || 0;
      const secondProfit = winners[1].settledGold || 0;

      if (firstProfit >= secondProfit * 2) {
        // 第一名领先超2倍，全部由第一名出
        breakdown.push({ nickname: winners[0].nickname, amount: 20 });
      } else {
        // 按比例：第一名15，第二名5
        breakdown.push({ nickname: winners[0].nickname, amount: 15 });
        breakdown.push({ nickname: winners[1].nickname, amount: 5 });
      }
    }
  }

  return { tipAmount, breakdown };
}

export function calculateLeaderboard(games: Game[]): LeaderboardEntry[] {
  const statsMap: Record<string, { nickname: string; profit: number; games: number; wins: number }> = {};

  games.filter(g => g.status === 'settled').forEach(game => {
    Object.values(game.players).forEach(player => {
      if (!statsMap[player.userId]) {
        statsMap[player.userId] = { nickname: player.nickname, profit: 0, games: 0, wins: 0 };
      }
      const stat = statsMap[player.userId];
      stat.games++;
      if (player.isSettled && player.settledGold !== null) {
        stat.profit += player.settledGold;
        if (player.settledGold > 0) stat.wins++;
      }
    });
  });

  const entries: LeaderboardEntry[] = Object.entries(statsMap)
    .map(([userId, stat]) => ({
      rank: 0,
      userId,
      nickname: stat.nickname,
      totalProfit: Math.round(stat.profit),
      totalGames: stat.games,
      winRate: stat.games > 0 ? stat.wins / stat.games : 0,
    }))
    .sort((a, b) => b.totalProfit - a.totalProfit);

  entries.forEach((entry, index) => {
    entry.rank = index + 1;
    if (entry.totalProfit > 0 && entry.rank <= 3) entry.badge = 'whale';
    if (entry.totalProfit < 0 && entry.rank >= entries.length - 2) entry.badge = 'charity';
    if (entry.winRate >= 0.7 && entry.totalGames >= 3) entry.badge = 'streak';
    if (entry.totalGames >= 5) entry.badge = entry.badge || 'active';
  });

  return entries;
}

export function getPlayerStats(userId: string, games: Game[]): PlayerStats | null {
  const settledGames = games.filter(g => g.status === 'settled' && g.players[userId]);
  if (settledGames.length === 0) return null;

  let totalProfit = 0;
  let totalBuyInGold = 0;
  let biggestWin = 0;
  let biggestLoss = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  let wins = 0;
  const nickname = settledGames[0].players[userId].nickname;

  settledGames.forEach(game => {
    const player = game.players[userId];
    if (!player.isSettled || player.settledGold === null) return;

    const profit = player.settledGold;
    const buyInGold = chipsToGold(player.totalChips, game.chipsPerHand, game.goldPerHand);

    totalProfit += profit;
    totalBuyInGold += buyInGold;

    if (profit > biggestWin) biggestWin = profit;
    if (profit < biggestLoss) biggestLoss = profit;

    if (profit > 0) {
      wins++;
      currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
    } else {
      currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
    }
    if (Math.abs(currentStreak) > Math.abs(bestStreak)) bestStreak = currentStreak;
  });

  return {
    userId,
    nickname,
    totalGames: settledGames.length,
    totalProfit: Math.round(totalProfit),
    totalBuyInGold: Math.round(totalBuyInGold),
    biggestWin: Math.round(biggestWin),
    biggestLoss: Math.round(biggestLoss),
    currentStreak,
    bestStreak,
    winRate: settledGames.length > 0 ? wins / settledGames.length : 0,
    avgProfit: Math.round(totalProfit / settledGames.length),
  };
}

export function getStreakEmoji(streak: number): string {
  if (streak >= 5) return '🔥';
  if (streak >= 3) return '⚡';
  if (streak <= -5) return '❄️';
  if (streak <= -3) return '💧';
  return '';
}

export function getBadgeInfo(badge: string): { emoji: string; label: string; color: string } {
  switch (badge) {
    case 'whale': return { emoji: '💰', label: '富豪', color: 'text-gold-500' };
    case 'charity': return { emoji: '🎁', label: '慈善家', color: 'text-blue-500' };
    case 'streak': return { emoji: '📈', label: '连胜王', color: 'text-green-500' };
    case 'active': return { emoji: '🔥', label: '活跃玩家', color: 'text-orange-500' };
    default: return { emoji: '', label: '', color: '' };
  }
}

export function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function getLogActionLabel(action: string): string {
  switch (action) {
    case 'buy_in': return '买入';
    case 'return': return '还码';
    case 'settle': return '结算';
    case 'banker_set': return '成为银行家';
    case 'banker_transfer': return '移交银行家';
    case 'join': return '加入';
    default: return action;
  }
}
