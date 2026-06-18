import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Game, GamePlayer, GameLog, LogAction } from '@/types';
import { supabase } from '@/lib/supabase';
import { chipsToGold, calcPlayerGold, calculateBankerTip } from '@/lib/utils';
import { Session } from '@supabase/supabase-js';

interface AppContextType {
  currentUser: User | null;
  users: Record<string, User>;
  games: Record<string, Game>;
  gameList: Game[];
  isLoading: boolean;
  isAdmin: boolean;

  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, nickname: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (nickname: string) => Promise<void>;

  createGame: (location: string, date: string, chipsPerHand?: number, goldPerHand?: number) => Promise<string>;
  joinGame: (gameId: string) => Promise<void>;
  addPlayerToGame: (gameId: string, userId: string) => Promise<void>;
  setBanker: (gameId: string, userId: string) => Promise<void>;
  transferBanker: (gameId: string, toUserId: string) => Promise<void>;
  randomBanker: (gameId: string) => Promise<void>;
  updateGameSettings: (gameId: string, chipsPerHand: number, goldPerHand: number) => Promise<void>;

  buyIn: (gameId: string, userId: string, hands: number) => Promise<void>;
  batchBuyIn: (gameId: string, hands: number) => Promise<void>;
  returnChips: (gameId: string, userId: string, hands: number) => Promise<void>;
  settlePlayer: (gameId: string, userId: string, remainingChips: number) => Promise<void>;
  startGame: (gameId: string) => Promise<void>;
  settleGame: (gameId: string) => Promise<void>;

  deleteGame: (gameId: string) => Promise<void>;
  removePlayerFromGame: (gameId: string, userId: string) => Promise<void>;
  refreshGames: () => Promise<void>;

  // Admin functions
  allProfiles: User[];
  fetchAllProfiles: () => Promise<void>;
  setAdminStatus: (userId: string, isAdmin: boolean) => Promise<void>;
  setProtectedStatus: (userId: string, isProtected: boolean) => Promise<void>;
  adminDeleteGame: (gameId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType>(null!);

function mapDbGame(dbGame: any): Game {
  const players: Record<string, GamePlayer> = {};
  const playerRows = dbGame.game_players || [];
  playerRows.forEach((p: any) => {
    players[p.user_id] = {
      userId: p.user_id,
      nickname: p.profiles?.nickname || '未知',
      isBanker: p.is_banker,
      buyInHands: p.buy_in_hands || 0,
      buyInAmount: p.buy_in_amount || 0,
      totalChips: p.total_chips || 0,
      remainingChips: p.remaining_chips,
      settledGold: p.settled_gold,
      isSettled: p.is_settled || false,
      joinedAt: p.joined_at,
    };
  });

  const logs: GameLog[] = (dbGame.game_logs || []).map((l: any) => ({
    id: l.id,
    timestamp: l.created_at,
    actorId: l.actor_id || '',
    actorName: l.actor_name || '',
    targetId: l.target_id || '',
    targetName: l.target_name || '',
    action: l.action as LogAction,
    hands: l.hands,
    chips: l.chips,
    remainingChips: l.remaining_chips,
    settledGold: l.settled_gold,
    note: l.note,
  }));

  return {
    id: dbGame.id,
    createdBy: dbGame.created_by,
    date: dbGame.date,
    location: dbGame.location || '',
    status: dbGame.status,
    bankerId: dbGame.banker_id || '',
    players,
    logs,
    chipsPerHand: dbGame.chips_per_hand || 1000,
    goldPerHand: dbGame.gold_per_hand || 50,
    bankerTip: dbGame.banker_tip || 0,
    startedAt: dbGame.started_at,
    settledAt: dbGame.settled_at,
    createdAt: dbGame.created_at,
    updatedAt: dbGame.updated_at,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [games, setGames] = useState<Record<string, Game>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allProfiles, setAllProfiles] = useState<User[]>([]);

  const fetchGames = useCallback(async () => {
    const { data } = await supabase
      .from('games')
      .select('*, game_players(*, profiles(nickname)), game_logs(*)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (data) {
      const mapped: Record<string, Game> = {};
      data.forEach(g => { mapped[g.id] = mapDbGame(g); });
      setGames(mapped);
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      const user: User = {
        id: data.id,
        nickname: data.nickname,
        email: data.email || '',
        createdAt: data.created_at,
        isAdmin: data.is_admin || false,
        isProtected: data.is_protected || false,
      };
      setCurrentUser(user);
      setUsers(prev => ({ ...prev, [data.id]: user }));
      setIsAdmin(data.is_admin || false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  useEffect(() => {
    if (currentUser) {
      fetchGames();
      const interval = setInterval(fetchGames, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchGames]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  }, []);

  const register = useCallback(async (email: string, password: string, nickname: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nickname } },
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string): Promise<boolean> => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    if (error) {
      console.error('OTP verification error:', error);
      return false;
    }
    return true;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setGames({});
    setIsAdmin(false);
  }, []);

  const updateProfile = useCallback(async (nickname: string) => {
    if (!currentUser) return;
    await supabase.from('profiles').update({ nickname }).eq('id', currentUser.id);
    setCurrentUser(prev => prev ? { ...prev, nickname } : null);
  }, [currentUser]);

  const addLog = useCallback(async (gameId: string, log: { actorId: string; actorName: string; targetId: string; targetName: string; action: LogAction; hands?: number; chips?: number; remainingChips?: number; settledGold?: number; note?: string }) => {
    await supabase.from('game_logs').insert({
      game_id: gameId, actor_id: log.actorId, actor_name: log.actorName,
      target_id: log.targetId, target_name: log.targetName, action: log.action,
      hands: log.hands, chips: log.chips, remaining_chips: log.remainingChips,
      settled_gold: log.settledGold, note: log.note,
    });
  }, []);

  const createGame = useCallback(async (location: string, date: string, chipsPerHand: number = 1000, goldPerHand: number = 50): Promise<string> => {
    if (!currentUser) return '';

    // 1. 创建牌局
    const { data: game, error: gameError } = await supabase.from('games').insert({
      created_by: currentUser.id, date, location,
      chips_per_hand: chipsPerHand, gold_per_hand: goldPerHand,
    }).select().single();

    if (gameError || !game) {
      console.error('创建牌局失败:', gameError);
      return '';
    }

    // 2. 创建者自动成为第一个玩家（银行家）
    const { error: playerError } = await supabase.from('game_players').upsert({
      game_id: game.id,
      user_id: currentUser.id,
      is_banker: true,
    });

    if (playerError) {
      console.error('添加玩家失败:', playerError);
    }

    // 3. 添加加入日志
    await supabase.from('game_logs').insert({
      game_id: game.id,
      actor_id: currentUser.id,
      actor_name: currentUser.nickname,
      target_id: currentUser.id,
      target_name: currentUser.nickname,
      action: 'join',
    });

    // 4. 设置创建者为银行家
    await supabase.from('games').update({ banker_id: currentUser.id }).eq('id', game.id);

    // 5. 刷新游戏列表并等待完成
    await fetchGames();

    // 6. 等待状态更新完成
    await new Promise(resolve => setTimeout(resolve, 100));

    return game.id;
  }, [currentUser, fetchGames]);

  const joinGame = useCallback(async (gameId: string) => {
    if (!currentUser) return;
    await supabase.from('game_players').upsert({
      game_id: gameId, user_id: currentUser.id, is_banker: false,
    }, { onConflict: 'game_id,user_id', ignoreDuplicates: true });
    await addLog(gameId, {
      actorId: currentUser.id, actorName: currentUser.nickname,
      targetId: currentUser.id, targetName: currentUser.nickname,
      action: 'join',
    });
    await fetchGames();
  }, [currentUser, addLog, fetchGames]);

  const addPlayerToGame = useCallback(async (gameId: string, userId: string) => {
    const user = users[userId];
    if (!user || !currentUser) return;
    await supabase.from('game_players').upsert({
      game_id: gameId, user_id: userId, is_banker: false,
    }, { onConflict: 'game_id,user_id', ignoreDuplicates: true });
    await addLog(gameId, {
      actorId: currentUser.id, actorName: currentUser.nickname,
      targetId: userId, targetName: user.nickname,
      action: 'join',
    });
    await fetchGames();
  }, [users, currentUser, addLog, fetchGames]);

  const setBanker = useCallback(async (gameId: string, userId: string) => {
    const user = users[userId];
    if (!user || !currentUser) return;
    await supabase.from('games').update({ banker_id: userId }).eq('id', gameId);
    await addLog(gameId, {
      actorId: currentUser.id, actorName: currentUser.nickname,
      targetId: userId, targetName: user.nickname,
      action: 'banker_set',
    });
    await fetchGames();
  }, [users, currentUser, addLog, fetchGames]);

  const transferBanker = useCallback(async (gameId: string, toUserId: string) => {
    const toUser = users[toUserId];
    if (!toUser || !currentUser) return;
    await supabase.from('games').update({ banker_id: toUserId }).eq('id', gameId);
    await addLog(gameId, {
      actorId: currentUser.id, actorName: currentUser.nickname,
      targetId: toUserId, targetName: toUser.nickname,
      action: 'banker_transfer',
    });
    await fetchGames();
  }, [users, currentUser, addLog, fetchGames]);

  const randomBanker = useCallback(async (gameId: string) => {
    const game = games[gameId];
    if (!game || !currentUser) return;
    const playerIds = Object.keys(game.players);
    if (playerIds.length === 0) return;
    const randomId = playerIds[Math.floor(Math.random() * playerIds.length)];
    const user = users[randomId];
    await supabase.from('games').update({ banker_id: randomId }).eq('id', gameId);
    await addLog(gameId, {
      actorId: currentUser.id, actorName: currentUser.nickname,
      targetId: randomId, targetName: user?.nickname || '',
      action: 'banker_set', note: '随机选出银行家',
    });
    await fetchGames();
  }, [games, users, currentUser, addLog, fetchGames]);

  const updateGameSettings = useCallback(async (gameId: string, chipsPerHand: number, goldPerHand: number) => {
    await supabase.from('games').update({ chips_per_hand: chipsPerHand, gold_per_hand: goldPerHand }).eq('id', gameId);
    await fetchGames();
  }, [fetchGames]);

  const buyIn = useCallback(async (gameId: string, userId: string, hands: number) => {
    const game = games[gameId];
    const player = game?.players[userId];
    const user = users[userId];
    if (!game || !player || !user || !currentUser) return;
    const chips = hands * game.chipsPerHand;
    await supabase.from('game_players').update({
      buy_in_hands: player.buyInHands + hands,
      buy_in_amount: player.buyInAmount + chips,
      total_chips: player.totalChips + chips,
    }).eq('game_id', gameId).eq('user_id', userId);
    await addLog(gameId, {
      actorId: currentUser.id, actorName: currentUser.nickname,
      targetId: userId, targetName: user.nickname,
      action: 'buy_in', hands, chips,
    });
    await fetchGames();
  }, [games, users, currentUser, addLog, fetchGames]);

  const batchBuyIn = useCallback(async (gameId: string, hands: number) => {
    const game = games[gameId];
    if (!game || !currentUser) return;
    const chips = hands * game.chipsPerHand;
    for (const player of Object.values(game.players)) {
      await supabase.from('game_players').update({
        buy_in_hands: player.buyInHands + hands,
        buy_in_amount: player.buyInAmount + chips,
        total_chips: player.totalChips + chips,
      }).eq('game_id', gameId).eq('user_id', player.userId);
      await addLog(gameId, {
        actorId: currentUser.id, actorName: currentUser.nickname,
        targetId: player.userId, targetName: player.nickname,
        action: 'buy_in', hands, chips, note: '批量买入',
      });
    }
    await fetchGames();
  }, [games, currentUser, addLog, fetchGames]);

  const returnChips = useCallback(async (gameId: string, userId: string, hands: number) => {
    const game = games[gameId];
    const player = game?.players[userId];
    const user = users[userId];
    if (!game || !player || !user || !currentUser) return;
    const chips = hands * game.chipsPerHand;
    await supabase.from('game_players').update({
      buy_in_hands: Math.max(0, player.buyInHands - hands),
      buy_in_amount: Math.max(0, player.buyInAmount - chips),
      total_chips: Math.max(0, player.totalChips - chips),
    }).eq('game_id', gameId).eq('user_id', userId);
    await addLog(gameId, {
      actorId: currentUser.id, actorName: currentUser.nickname,
      targetId: userId, targetName: user.nickname,
      action: 'return', hands, chips: -chips,
      note: `归还${hands}手，减少${chips}筹码`,
    });
    await fetchGames();
  }, [games, users, currentUser, addLog, fetchGames]);

  const settlePlayer = useCallback(async (gameId: string, userId: string, remainingChips: number) => {
    const game = games[gameId];
    const player = game?.players[userId];
    const user = users[userId];
    if (!game || !player || !user || !currentUser) return;
    const gold = calcPlayerGold({ ...player, remainingChips, isSettled: true }, game.chipsPerHand, game.goldPerHand);
    const isResettle = player.isSettled;
    await supabase.from('game_players').update({
      remaining_chips: remainingChips, settled_gold: gold, is_settled: true,
    }).eq('game_id', gameId).eq('user_id', userId);
    await addLog(gameId, {
      actorId: currentUser.id, actorName: currentUser.nickname,
      targetId: userId, targetName: user.nickname,
      action: 'settle', remainingChips, settledGold: gold,
      note: isResettle ? `重新结算 (原 ${player.remainingChips})` : undefined,
    });
    await fetchGames();
  }, [games, users, currentUser, addLog, fetchGames]);

  const startGame = useCallback(async (gameId: string) => {
    await supabase.from('games').update({
      status: 'playing', started_at: new Date().toISOString(),
    }).eq('id', gameId);
    await fetchGames();
  }, [fetchGames]);

  const settleGame = useCallback(async (gameId: string) => {
    const game = games[gameId];
    if (!game) return;
    const tipInfo = calculateBankerTip(game);
    await supabase.from('games').update({
      status: 'settled', settled_at: new Date().toISOString(), banker_tip: tipInfo.tipAmount,
    }).eq('id', gameId);
    await fetchGames();
  }, [games, fetchGames]);

  const deleteGame = useCallback(async (gameId: string) => {
    await supabase.from('games').delete().eq('id', gameId);
    await fetchGames();
  }, [fetchGames]);

  const removePlayerFromGame = useCallback(async (gameId: string, userId: string) => {
    await supabase.from('game_players').delete().eq('game_id', gameId).eq('user_id', userId);
    await fetchGames();
  }, [fetchGames]);

  const refreshGames = useCallback(async () => {
    await fetchGames();
  }, [fetchGames]);

  // Admin functions
  const fetchAllProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      const profiles: User[] = data.map((p: any) => ({
        id: p.id,
        nickname: p.nickname,
        email: p.email || '',
        avatar: p.avatar,
        createdAt: p.created_at,
        isAdmin: p.is_admin || false,
        isProtected: p.is_protected || false,
      }));
      setAllProfiles(profiles);
    }
  }, []);

  const setAdminStatus = useCallback(async (userId: string, admin: boolean) => {
    await supabase.from('profiles').update({ is_admin: admin }).eq('id', userId);
    await fetchAllProfiles();
  }, [fetchAllProfiles]);

  const setProtectedStatus = useCallback(async (userId: string, protectedStatus: boolean) => {
    await supabase.from('profiles').update({ is_protected: protectedStatus }).eq('id', userId);
    await fetchAllProfiles();
  }, [fetchAllProfiles]);

  const adminDeleteGame = useCallback(async (gameId: string) => {
    await supabase.from('games').delete().eq('id', gameId);
    await fetchGames();
  }, [fetchGames]);

  const gameList = Object.values(games).sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <AppContext.Provider value={{
      currentUser, users, games, gameList, isLoading, isAdmin,
      login, register, verifyOtp, logout, updateProfile,
      createGame, joinGame, addPlayerToGame, setBanker, transferBanker, randomBanker, updateGameSettings,
      buyIn, batchBuyIn, returnChips, settlePlayer,
      startGame, settleGame,
      deleteGame, removePlayerFromGame, refreshGames,
      allProfiles, fetchAllProfiles, setAdminStatus, setProtectedStatus, adminDeleteGame,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
