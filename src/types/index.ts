export type GameStatus = 'waiting' | 'playing' | 'settled';

export interface User {
  id: string;
  nickname: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface GamePlayer {
  userId: string;
  nickname: string;
  isBanker: boolean;
  buyInHands: number;
  buyInAmount: number;       // 买入筹码总量
  totalChips: number;        // 总筹码 = buyInAmount
  remainingChips: number | null;  // 离场剩余筹码
  settledGold: number | null;     // 结算金币 (正=赢, 负=输)
  isSettled: boolean;
  joinedAt: string;
}

export type LogAction = 'buy_in' | 'return' | 'settle' | 'banker_set' | 'banker_transfer' | 'join';

export interface GameLog {
  id: string;
  timestamp: string;
  actorId: string;        // 操作人
  actorName: string;
  targetId: string;       // 被操作的玩家
  targetName: string;
  action: LogAction;
  hands?: number;         // 买入/还码手数
  chips?: number;         // 筹码变动量
  remainingChips?: number; // 结算时的剩余筹码
  settledGold?: number;   // 结算金币
  note?: string;
}

export interface Game {
  id: string;
  createdBy: string;
  date: string;
  location: string;
  status: GameStatus;
  bankerId: string;
  players: Record<string, GamePlayer>;
  logs: GameLog[];
  chipsPerHand: number;
  goldPerHand: number;
  bankerTip: number;
  startedAt: string | null;     // 开始牌局的时间
  settledAt: string | null;     // 结算牌局的时间
  createdAt: string;
  updatedAt: string;
}

export interface PlayerStats {
  userId: string;
  nickname: string;
  totalGames: number;
  totalProfit: number;        // 总盈亏 (金币)
  totalBuyInGold: number;     // 总买入金币
  biggestWin: number;
  biggestLoss: number;
  currentStreak: number;      // 当前连胜/连败 (正=连胜, 负=连败)
  bestStreak: number;
  winRate: number;            // 胜率
  avgProfit: number;          // 平均每局盈亏
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  totalProfit: number;
  totalGames: number;
  winRate: number;
  badge?: 'whale' | 'charity' | 'streak' | 'active';
}

export interface GameSettlement {
  totalBuyInChips: number;
  totalChips: number;
  totalSettledChips: number;
  totalGoldSum: number;       // 所有玩家金币盈亏之和（应为0）
  isBalanced: boolean;
}
