import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Game, GamePlayer, GameLog, LogAction } from '@/types';
import { generateId, chipsToGold, calcPlayerGold, calculateBankerTip } from '@/lib/utils';

interface AppContextType {
  currentUser: User | null;
  users: Record<string, User>;
  games: Record<string, Game>;
  gameList: Game[];
  isLoading: boolean;

  login: (email: string, password: string) => boolean;
  register: (email: string, password: string, nickname: string) => boolean;
  logout: () => void;
  updateProfile: (nickname: string) => void;

  createGame: (location: string, date: string, chipsPerHand?: number, goldPerHand?: number) => string;
  joinGame: (gameId: string) => void;
  addPlayerToGame: (gameId: string, userId: string) => void;
  setBanker: (gameId: string, userId: string) => void;
  transferBanker: (gameId: string, toUserId: string) => void;
  randomBanker: (gameId: string) => void;
  updateGameSettings: (gameId: string, chipsPerHand: number, goldPerHand: number) => void;

  buyIn: (gameId: string, userId: string, hands: number) => void;
  batchBuyIn: (gameId: string, hands: number) => void;
  returnChips: (gameId: string, userId: string, hands: number) => void;
  settlePlayer: (gameId: string, userId: string, remainingChips: number) => void;
  startGame: (gameId: string) => void;
  settleGame: (gameId: string) => void;
}

const AppContext = createContext<AppContextType>(null!);

const STORAGE_KEY = 'wild-homegame-data';

interface StoredData {
  currentUser: User | null;
  users: Record<string, User>;
  games: Record<string, Game>;
  credentials: Record<string, string>;
}

function loadData(): StoredData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { currentUser: null, users: {}, games: {}, credentials: {} };
}

function saveData(data: StoredData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateSampleData(): StoredData {
  const users: Record<string, User> = {};
  const games: Record<string, Game> = {};
  const credentials: Record<string, string> = {};

  const sampleUsers = [
    { id: 'u1', nickname: '德扑小王子', email: 'prince@test.com' },
    { id: 'u2', nickname: 'All In姐', email: 'allin@test.com' },
    { id: 'u3', nickname: '稳如老狗', email: 'steady@test.com' },
    { id: 'u4', nickname: 'bluff大师', email: 'bluff@test.com' },
    { id: 'u5', nickname: '牌桌新人', email: 'newbie@test.com' },
    { id: 'u6', nickname: '鱼塘塘主', email: 'fish@test.com' },
  ];

  sampleUsers.forEach(u => {
    users[u.id] = { ...u, createdAt: new Date().toISOString() };
    credentials[u.email] = '123456';
  });

  const now = new Date();
  const ts = (h: number, m: number) => {
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const sampleGames: Game[] = [
    {
      id: 'g1',
      createdBy: 'u1',
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      location: '老王棋牌室',
      status: 'settled',
      bankerId: 'u1',
      chipsPerHand: 1000,
      goldPerHand: 50,
      bankerTip: 10,
      players: {
        u1: { userId: 'u1', nickname: '德扑小王子', isBanker: true, buyInHands: 3, buyInAmount: 3000, totalChips: 3000, remainingChips: 5200, settledGold: 110, isSettled: true, joinedAt: ts(19, 0) },
        u2: { userId: 'u2', nickname: 'All In姐', isBanker: false, buyInHands: 2, buyInAmount: 2000, totalChips: 2000, remainingChips: 500, settledGold: -75, isSettled: true, joinedAt: ts(19, 5) },
        u3: { userId: 'u3', nickname: '稳如老狗', isBanker: false, buyInHands: 2, buyInAmount: 2000, totalChips: 2000, remainingChips: 2800, settledGold: 40, isSettled: true, joinedAt: ts(19, 10) },
        u4: { userId: 'u4', nickname: 'bluff大师', isBanker: false, buyInHands: 3, buyInAmount: 3000, totalChips: 3000, remainingChips: 1500, settledGold: -75, isSettled: true, joinedAt: ts(19, 15) },
      },
      logs: [
        { id: 'l1', timestamp: ts(19, 0), actorId: 'u1', actorName: '德扑小王子', targetId: 'u1', targetName: '德扑小王子', action: 'banker_set', note: '成为银行家' },
        { id: 'l2', timestamp: ts(19, 5), actorId: 'u1', actorName: '德扑小王子', targetId: 'u2', targetName: 'All In姐', action: 'buy_in', hands: 2, chips: 2000 },
        { id: 'l3', timestamp: ts(19, 10), actorId: 'u1', actorName: '德扑小王子', targetId: 'u3', targetName: '稳如老狗', action: 'buy_in', hands: 2, chips: 2000 },
        { id: 'l4', timestamp: ts(19, 15), actorId: 'u1', actorName: '德扑小王子', targetId: 'u4', targetName: 'bluff大师', action: 'buy_in', hands: 3, chips: 3000 },
        { id: 'l5', timestamp: ts(19, 20), actorId: 'u1', actorName: '德扑小王子', targetId: 'u1', targetName: '德扑小王子', action: 'buy_in', hands: 3, chips: 3000 },
      ],
      createdAt: ts(19, 0),
      updatedAt: ts(23, 30),
      startedAt: ts(19, 0),
      settledAt: ts(23, 30),
    },
    {
      id: 'g2',
      createdBy: 'u2',
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      location: '小李家',
      status: 'settled',
      bankerId: 'u3',
      chipsPerHand: 1000,
      goldPerHand: 50,
      bankerTip: 10,
      players: {
        u1: { userId: 'u1', nickname: '德扑小王子', isBanker: false, buyInHands: 2, buyInAmount: 2000, totalChips: 2000, remainingChips: 100, settledGold: -95, isSettled: true, joinedAt: ts(19, 0) },
        u2: { userId: 'u2', nickname: 'All In姐', isBanker: false, buyInHands: 3, buyInAmount: 3000, totalChips: 3000, remainingChips: 4800, settledGold: 90, isSettled: true, joinedAt: ts(19, 5) },
        u3: { userId: 'u3', nickname: '稳如老狗', isBanker: true, buyInHands: 2, buyInAmount: 2000, totalChips: 2000, remainingChips: 1800, settledGold: -10, isSettled: true, joinedAt: ts(19, 10) },
        u5: { userId: 'u5', nickname: '牌桌新人', isBanker: false, buyInHands: 2, buyInAmount: 2000, totalChips: 2000, remainingChips: 1300, settledGold: -35, isSettled: true, joinedAt: ts(19, 15) },
      },
      logs: [],
      createdAt: ts(19, 0),
      updatedAt: ts(23, 0),
      startedAt: ts(19, 0),
      settledAt: ts(23, 0),
    },
    {
      id: 'g3',
      createdBy: 'u1',
      date: now.toISOString().split('T')[0],
      location: '咖啡德扑俱乐部',
      status: 'playing',
      bankerId: 'u1',
      chipsPerHand: 1000,
      goldPerHand: 50,
      bankerTip: 0,
      players: {
        u1: { userId: 'u1', nickname: '德扑小王子', isBanker: true, buyInHands: 3, buyInAmount: 3000, totalChips: 3000, remainingChips: null, settledGold: null, isSettled: false, joinedAt: ts(18, 0) },
        u2: { userId: 'u2', nickname: 'All In姐', isBanker: false, buyInHands: 2, buyInAmount: 2000, totalChips: 2000, remainingChips: null, settledGold: null, isSettled: false, joinedAt: ts(18, 5) },
        u3: { userId: 'u3', nickname: '稳如老狗', isBanker: false, buyInHands: 2, buyInAmount: 2000, totalChips: 2000, remainingChips: null, settledGold: null, isSettled: false, joinedAt: ts(18, 10) },
        u6: { userId: 'u6', nickname: '鱼塘塘主', isBanker: false, buyInHands: 2, buyInAmount: 2000, totalChips: 2000, remainingChips: null, settledGold: null, isSettled: false, joinedAt: ts(18, 15) },
      },
      logs: [
        { id: 'l10', timestamp: ts(18, 0), actorId: 'u1', actorName: '德扑小王子', targetId: 'u1', targetName: '德扑小王子', action: 'banker_set' },
        { id: 'l11', timestamp: ts(18, 5), actorId: 'u1', actorName: '德扑小王子', targetId: 'u1', targetName: '德扑小王子', action: 'buy_in', hands: 3, chips: 3000 },
        { id: 'l12', timestamp: ts(18, 10), actorId: 'u1', actorName: '德扑小王子', targetId: 'u2', targetName: 'All In姐', action: 'buy_in', hands: 2, chips: 2000 },
        { id: 'l13', timestamp: ts(18, 15), actorId: 'u1', actorName: '德扑小王子', targetId: 'u3', targetName: '稳如老狗', action: 'buy_in', hands: 2, chips: 2000 },
        { id: 'l14', timestamp: ts(18, 20), actorId: 'u1', actorName: '德扑小王子', targetId: 'u6', targetName: '鱼塘塘主', action: 'buy_in', hands: 2, chips: 2000 },
      ],
      createdAt: ts(18, 0),
      updatedAt: ts(18, 20),
      startedAt: ts(18, 0),
      settledAt: null,
    },
  ];

  sampleGames.forEach(g => { games[g.id] = g; });
  return { currentUser: null, users, games, credentials };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoredData>(() => {
    const saved = loadData();
    if (Object.keys(saved.users).length === 0) {
      const sample = generateSampleData();
      saveData(sample);
      return sample;
    }
    return saved;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { setIsLoading(false); }, []);

  const updateData = useCallback((updater: (prev: StoredData) => StoredData) => {
    setData(prev => {
      const next = updater(prev);
      saveData(next);
      return next;
    });
  }, []);

  const addLog = useCallback((gameId: string, log: Omit<GameLog, 'id' | 'timestamp'>) => {
    updateData(prev => {
      const game = prev.games[gameId];
      if (!game) return prev;
      const fullLog: GameLog = { ...log, id: generateId(), timestamp: new Date().toISOString() };
      return {
        ...prev,
        games: {
          ...prev.games,
          [gameId]: { ...game, logs: [...game.logs, fullLog], updatedAt: new Date().toISOString() },
        },
      };
    });
  }, [updateData]);

  const login = useCallback((email: string, password: string): boolean => {
    if (data.credentials[email] === password) {
      const user = Object.values(data.users).find(u => u.email === email);
      if (user) {
        updateData(prev => ({ ...prev, currentUser: user }));
        return true;
      }
    }
    return false;
  }, [data, updateData]);

  const register = useCallback((email: string, password: string, nickname: string): boolean => {
    if (data.credentials[email]) return false;
    const id = generateId();
    const user: User = { id, nickname, email, createdAt: new Date().toISOString() };
    updateData(prev => ({
      ...prev,
      currentUser: user,
      users: { ...prev.users, [id]: user },
      credentials: { ...prev.credentials, [email]: password },
    }));
    return true;
  }, [data, updateData]);

  const logout = useCallback(() => {
    updateData(prev => ({ ...prev, currentUser: null }));
  }, [updateData]);

  const updateProfile = useCallback((nickname: string) => {
    if (!data.currentUser) return;
    updateData(prev => ({
      ...prev,
      currentUser: prev.currentUser ? { ...prev.currentUser, nickname } : null,
      users: prev.currentUser && prev.users[prev.currentUser.id]
        ? { ...prev.users, [prev.currentUser.id]: { ...prev.users[prev.currentUser.id], nickname } }
        : prev.users,
    }));
  }, [data.currentUser, updateData]);

  const createGame = useCallback((location: string, date: string, chipsPerHand: number = 1000, goldPerHand: number = 50): string => {
    if (!data.currentUser) return '';
    const id = generateId();
    const game: Game = {
      id,
      createdBy: data.currentUser.id,
      date,
      location,
      status: 'waiting',
      bankerId: '',
      players: {},
      logs: [],
      chipsPerHand,
      goldPerHand,
      bankerTip: 0,
      startedAt: null,
      settledAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateData(prev => ({ ...prev, games: { ...prev.games, [id]: game } }));
    return id;
  }, [data.currentUser, updateData]);

  const joinGame = useCallback((gameId: string) => {
    if (!data.currentUser) return;
    const user = data.currentUser;
    updateData(prev => {
      const game = prev.games[gameId];
      if (!game || game.players[user.id]) return prev;
      const player: GamePlayer = {
        userId: user.id,
        nickname: user.nickname,
        isBanker: false,
        buyInHands: 0,
        buyInAmount: 0,
        totalChips: 0,
        remainingChips: null,
        settledGold: null,
        isSettled: false,
        joinedAt: new Date().toISOString(),
      };
      const log: GameLog = {
        id: generateId(), timestamp: new Date().toISOString(),
        actorId: user.id, actorName: user.nickname,
        targetId: user.id, targetName: user.nickname,
        action: 'join',
      };
      return {
        ...prev,
        games: { ...prev.games, [gameId]: { ...game, players: { ...game.players, [user.id]: player }, logs: [...game.logs, log], updatedAt: new Date().toISOString() } },
      };
    });
  }, [data.currentUser, updateData]);

  const addPlayerToGame = useCallback((gameId: string, userId: string) => {
    const actor = data.currentUser;
    updateData(prev => {
      const game = prev.games[gameId];
      if (!game || game.players[userId]) return prev;
      const user = prev.users[userId];
      if (!user) return prev;
      const player: GamePlayer = {
        userId: user.id,
        nickname: user.nickname,
        isBanker: false,
        buyInHands: 0,
        buyInAmount: 0,
        totalChips: 0,
        remainingChips: null,
        settledGold: null,
        isSettled: false,
        joinedAt: new Date().toISOString(),
      };
      const log: GameLog = {
        id: generateId(), timestamp: new Date().toISOString(),
        actorId: actor?.id || '', actorName: actor?.nickname || '',
        targetId: userId, targetName: user.nickname,
        action: 'join',
      };
      return {
        ...prev,
        games: { ...prev.games, [gameId]: { ...game, players: { ...game.players, [userId]: player }, logs: [...game.logs, log], updatedAt: new Date().toISOString() } },
      };
    });
  }, [data.currentUser, updateData]);

  const setBanker = useCallback((gameId: string, userId: string) => {
    const user = data.users[userId];
    const actor = data.currentUser;
    if (!user || !actor) return;
    updateData(prev => {
      const game = prev.games[gameId];
      if (!game) return prev;
      const log: GameLog = {
        id: generateId(), timestamp: new Date().toISOString(),
        actorId: actor.id, actorName: actor.nickname,
        targetId: userId, targetName: user.nickname,
        action: 'banker_set',
      };
      return {
        ...prev,
        games: { ...prev.games, [gameId]: { ...game, bankerId: userId, logs: [...game.logs, log], updatedAt: new Date().toISOString() } },
      };
    });
  }, [data.users, data.currentUser, updateData]);

  const transferBanker = useCallback((gameId: string, toUserId: string) => {
    const toUser = data.users[toUserId];
    const actor = data.currentUser;
    if (!toUser || !actor) return;
    updateData(prev => {
      const game = prev.games[gameId];
      if (!game) return prev;
      const log: GameLog = {
        id: generateId(), timestamp: new Date().toISOString(),
        actorId: actor.id, actorName: actor.nickname,
        targetId: toUserId, targetName: toUser.nickname,
        action: 'banker_transfer',
      };
      return {
        ...prev,
        games: { ...prev.games, [gameId]: { ...game, bankerId: toUserId, logs: [...game.logs, log], updatedAt: new Date().toISOString() } },
      };
    });
  }, [data.users, data.currentUser, updateData]);

  const randomBanker = useCallback((gameId: string) => {
    updateData(prev => {
      const game = prev.games[gameId];
      if (!game) return prev;
      const playerIds = Object.keys(game.players);
      if (playerIds.length === 0) return prev;
      const randomId = playerIds[Math.floor(Math.random() * playerIds.length)];
      const user = prev.users[randomId];
      const actor = prev.currentUser;
      const log: GameLog = {
        id: generateId(), timestamp: new Date().toISOString(),
        actorId: actor?.id || '', actorName: actor?.nickname || '',
        targetId: randomId, targetName: user?.nickname || '',
        action: 'banker_set', note: '随机选出银行家',
      };
      return {
        ...prev,
        games: { ...prev.games, [gameId]: { ...game, bankerId: randomId, logs: [...game.logs, log], updatedAt: new Date().toISOString() } },
      };
    });
  }, [updateData]);

  const updateGameSettings = useCallback((gameId: string, chipsPerHand: number, goldPerHand: number) => {
    updateData(prev => {
      const game = prev.games[gameId];
      if (!game) return prev;
      return { ...prev, games: { ...prev.games, [gameId]: { ...game, chipsPerHand, goldPerHand, updatedAt: new Date().toISOString() } } };
    });
  }, [updateData]);

  const buyIn = useCallback((gameId: string, userId: string, hands: number) => {
    const user = data.users[userId];
    const actor = data.currentUser;
    if (!user || !actor) return;
    updateData(prev => {
      const game = prev.games[gameId];
      if (!game) return prev;
      const player = game.players[userId];
      if (!player) return prev;
      const chips = hands * game.chipsPerHand;
      const log: GameLog = {
        id: generateId(), timestamp: new Date().toISOString(),
        actorId: actor.id, actorName: actor.nickname,
        targetId: userId, targetName: user.nickname,
        action: 'buy_in', hands, chips,
      };
      return {
        ...prev,
        games: {
          ...prev.games,
          [gameId]: {
            ...game,
            players: {
              ...game.players,
              [userId]: {
                ...player,
                buyInHands: player.buyInHands + hands,
                buyInAmount: player.buyInAmount + chips,
                totalChips: player.totalChips + chips,
              },
            },
            logs: [...game.logs, log],
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, [data.users, data.currentUser, updateData]);

  const batchBuyIn = useCallback((gameId: string, hands: number) => {
    const actor = data.currentUser;
    if (!actor) return;
    updateData(prev => {
      const game = prev.games[gameId];
      if (!game) return prev;
      const chips = hands * game.chipsPerHand;
      const newPlayers = { ...game.players };
      const newLogs = [...game.logs];
      Object.values(newPlayers).forEach(player => {
        newPlayers[player.userId] = {
          ...player,
          buyInHands: player.buyInHands + hands,
          buyInAmount: player.buyInAmount + chips,
          totalChips: player.totalChips + chips,
        };
        newLogs.push({
          id: generateId(), timestamp: new Date().toISOString(),
          actorId: actor.id, actorName: actor.nickname,
          targetId: player.userId, targetName: player.nickname,
          action: 'buy_in', hands, chips,
          note: '批量买入',
        });
      });
      return {
        ...prev,
        games: { ...prev.games, [gameId]: { ...game, players: newPlayers, logs: newLogs, updatedAt: new Date().toISOString() } },
      };
    });
  }, [data.currentUser, updateData]);

  const returnChips = useCallback((gameId: string, userId: string, hands: number) => {
    const user = data.users[userId];
    const actor = data.currentUser;
    if (!user || !actor) return;
    updateData(prev => {
      const game = prev.games[gameId];
      if (!game) return prev;
      const player = game.players[userId];
      if (!player) return prev;
      const chips = hands * game.chipsPerHand;
      const newBuyInHands = Math.max(0, player.buyInHands - hands);
      const newBuyInAmount = Math.max(0, player.buyInAmount - chips);
      const newTotalChips = Math.max(0, player.totalChips - chips);
      const log: GameLog = {
        id: generateId(), timestamp: new Date().toISOString(),
        actorId: actor.id, actorName: actor.nickname,
        targetId: userId, targetName: user.nickname,
        action: 'return', hands, chips: -chips,
        note: `归还${hands}手，减少${chips}筹码`,
      };
      return {
        ...prev,
        games: {
          ...prev.games,
          [gameId]: {
            ...game,
            players: {
              ...game.players,
              [userId]: {
                ...player,
                buyInHands: newBuyInHands,
                buyInAmount: newBuyInAmount,
                totalChips: newTotalChips,
              },
            },
            logs: [...game.logs, log],
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, [data.users, data.currentUser, updateData]);

  const settlePlayer = useCallback((gameId: string, userId: string, remainingChips: number) => {
    const user = data.users[userId];
    const actor = data.currentUser;
    if (!user || !actor) return;
    updateData(prev => {
      const game = prev.games[gameId];
      if (!game) return prev;
      const player = game.players[userId];
      if (!player) return prev;
      const gold = calcPlayerGold({ ...player, remainingChips, isSettled: true }, game.chipsPerHand, game.goldPerHand);
      const isResettle = player.isSettled;
      const log: GameLog = {
        id: generateId(), timestamp: new Date().toISOString(),
        actorId: actor.id, actorName: actor.nickname,
        targetId: userId, targetName: user.nickname,
        action: 'settle', remainingChips, settledGold: gold,
        note: isResettle ? `重新结算 (原 ${player.remainingChips})` : undefined,
      };
      return {
        ...prev,
        games: {
          ...prev.games,
          [gameId]: {
            ...game,
            players: {
              ...game.players,
              [userId]: { ...player, remainingChips, settledGold: gold, isSettled: true },
            },
            logs: [...game.logs, log],
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, [data.users, data.currentUser, updateData]);

  const startGame = useCallback((gameId: string) => {
    updateData(prev => {
      const game = prev.games[gameId];
      if (!game) return prev;
      return { ...prev, games: { ...prev.games, [gameId]: { ...game, status: 'playing', startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } } };
    });
  }, [updateData]);

  const settleGame = useCallback((gameId: string) => {
    updateData(prev => {
      const game = prev.games[gameId];
      if (!game) return prev;
      const tipInfo = calculateBankerTip(game);
      return {
        ...prev,
        games: {
          ...prev.games,
          [gameId]: { ...game, status: 'settled', settledAt: new Date().toISOString(), bankerTip: tipInfo.tipAmount, updatedAt: new Date().toISOString() },
        },
      };
    });
  }, [updateData]);

  return (
    <AppContext.Provider value={{
      currentUser: data.currentUser,
      users: data.users,
      games: data.games,
      gameList: Object.values(data.games).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      isLoading,
      login, register, logout, updateProfile,
      createGame, joinGame, addPlayerToGame, setBanker, transferBanker, randomBanker, updateGameSettings,
      buyIn, batchBuyIn, returnChips, settlePlayer,
      startGame, settleGame,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
