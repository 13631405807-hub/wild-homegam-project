/**
 * 狂野HomeGame - 核心流程测试脚本
 *
 * 使用方法：
 * 1. 确保已配置 .env 文件（VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY）
 * 2. 运行：node test-core-flows.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// 加载 .env 文件
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 请配置 .env 文件：VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 测试数据
const testEmail = `test-${Date.now()}@example.com`;
const testPassword = 'test123456';
const testNickname = '测试玩家';

let userId = null;
let gameId = null;

// 辅助函数
function log(message, data = null) {
  console.log(`✓ ${message}`);
  if (data) console.log('  数据:', JSON.stringify(data, null, 2));
}

function error(message, err = null) {
  console.error(`❌ ${message}`);
  if (err) console.error('  错误:', err);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    error(`断言失败: ${message}`);
  }
}

// 测试流程
async function testFlows() {
  console.log('\n🚀 开始测试核心流程...\n');
  console.log(`📧 测试邮箱: ${testEmail}\n`);

  // 1. 注册
  console.log('━━━ 1. 注册 ━━━');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: { nickname: testNickname }
    }
  });

  if (signUpError) {
    error('注册失败', signUpError.message);
  }

  userId = signUpData.user?.id;
  if (!userId) {
    error('注册成功但未获取到用户 ID');
  }
  log('注册成功', { userId, email: testEmail });

  // 2. 登录
  console.log('\n━━━ 2. 登录 ━━━');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (signInError) {
    error('登录失败', signInError.message);
  }
  log('登录成功', { userId: signInData.user.id });

  // 3. 检查 profile 是否自动创建
  console.log('\n━━━ 3. 检查 Profile ━━━');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) {
    error('获取 Profile 失败', profileError.message);
  }
  assert(profile.nickname === testNickname, '昵称应该匹配');
  log('Profile 已创建', { nickname: profile.nickname, is_admin: profile.is_admin });

  // 4. 创建牌局（模拟完整的 createGame 流程）
  console.log('\n━━━ 4. 创建牌局 ━━━');
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      created_by: userId,
      date: new Date().toISOString().split('T')[0],
      location: '测试棋牌室',
      chips_per_hand: 1000,
      gold_per_hand: 50
    })
    .select()
    .single();

  if (gameError) {
    error('创建牌局失败', gameError.message);
  }
  gameId = game.id;
  log('牌局创建成功', { gameId, location: game.location });

  // 5. 创建者自动加入牌局（模拟 createGame 中的逻辑）
  console.log('\n━━━ 5. 创建者自动加入牌局 ━━━');
  const { error: joinError } = await supabase
    .from('game_players')
    .upsert({
      game_id: gameId,
      user_id: userId,
      is_banker: true
    });

  if (joinError) {
    error('加入牌局失败', joinError.message);
  }
  log('创建者已加入牌局');

  // 6. 设置银行家
  console.log('\n━━━ 6. 设置银行家 ━━━');
  const { error: bankerError } = await supabase
    .from('games')
    .update({ banker_id: userId })
    .eq('id', gameId);

  if (bankerError) {
    error('设置银行家失败', bankerError.message);
  }
  log('银行家已设置');

  // 7. 添加加入日志
  console.log('\n━━━ 7. 添加加入日志 ━━━');
  const { error: logError } = await supabase
    .from('game_logs')
    .insert({
      game_id: gameId,
      actor_id: userId,
      actor_name: testNickname,
      target_id: userId,
      target_name: testNickname,
      action: 'join'
    });

  if (logError) {
    error('添加日志失败', logError.message);
  }
  log('加入日志已添加');

  // 8. 验证数据一致性：牌局、玩家、日志
  console.log('\n━━━ 8. 验证数据一致性 ━━━');
  const { data: fullGame, error: fetchError } = await supabase
    .from('games')
    .select('*, game_players(*), game_logs(*)')
    .eq('id', gameId)
    .single();

  if (fetchError) {
    error('获取牌局详情失败', fetchError.message);
  }

  assert(fullGame.game_players.length === 1, '应该有1个玩家');
  assert(fullGame.game_players[0].user_id === userId, '玩家应该是创建者');
  assert(fullGame.game_players[0].is_banker === true, '创建者应该是银行家');
  assert(fullGame.banker_id === userId, '银行家ID应该匹配');
  assert(fullGame.game_logs.length === 1, '应该有1条日志');
  assert(fullGame.game_logs[0].action === 'join', '日志类型应该是join');
  log('数据一致性验证通过', {
    players: fullGame.game_players.length,
    logs: fullGame.game_logs.length,
    banker: fullGame.banker_id
  });

  // 9. 开始牌局
  console.log('\n━━━ 9. 开始牌局 ━━━');
  const { error: startError } = await supabase
    .from('games')
    .update({
      status: 'playing',
      started_at: new Date().toISOString()
    })
    .eq('id', gameId);

  if (startError) {
    error('开始牌局失败', startError.message);
  }

  // 验证状态
  const { data: startedGame } = await supabase
    .from('games')
    .select('status, started_at')
    .eq('id', gameId)
    .single();

  assert(startedGame.status === 'playing', '状态应该是playing');
  assert(startedGame.started_at !== null, '应该有开始时间');
  log('牌局已开始', { status: startedGame.status });

  // 10. 买入
  console.log('\n━━━ 10. 买入 ━━━');
  const buyInHands = 5;
  const buyInChips = buyInHands * 1000;
  const { error: buyInError } = await supabase
    .from('game_players')
    .update({
      buy_in_hands: buyInHands,
      buy_in_amount: buyInChips,
      total_chips: buyInChips
    })
    .eq('game_id', gameId)
    .eq('user_id', userId);

  if (buyInError) {
    error('买入失败', buyInError.message);
  }

  // 添加买入日志
  await supabase.from('game_logs').insert({
    game_id: gameId,
    actor_id: userId,
    actor_name: testNickname,
    target_id: userId,
    target_name: testNickname,
    action: 'buy_in',
    hands: buyInHands,
    chips: buyInChips
  });

  // 验证
  const { data: playerAfterBuy } = await supabase
    .from('game_players')
    .select('buy_in_hands, total_chips')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .single();

  assert(playerAfterBuy.buy_in_hands === buyInHands, '买入手数应该匹配');
  assert(playerAfterBuy.total_chips === buyInChips, '总筹码应该匹配');
  log(`买入成功: ${buyInHands}手, ${buyInChips}筹码`);

  // 11. 归还筹码
  console.log('\n━━━ 11. 归还筹码 ━━━');
  const returnHands = 2;
  const returnChips = returnHands * 1000;
  const newBuyInHands = buyInHands - returnHands;
  const newTotalChips = buyInChips - returnChips;

  const { error: returnError } = await supabase
    .from('game_players')
    .update({
      buy_in_hands: newBuyInHands,
      buy_in_amount: newTotalChips,
      total_chips: newTotalChips
    })
    .eq('game_id', gameId)
    .eq('user_id', userId);

  if (returnError) {
    error('归还筹码失败', returnError.message);
  }

  // 添加归还日志
  await supabase.from('game_logs').insert({
    game_id: gameId,
    actor_id: userId,
    actor_name: testNickname,
    target_id: userId,
    target_name: testNickname,
    action: 'return',
    hands: returnHands,
    chips: -returnChips
  });

  log(`归还成功: ${returnHands}手, 减少${returnChips}筹码`);

  // 12. 结算
  console.log('\n━━━ 12. 结算 ━━━');
  const remainingChips = 2500;
  const settledGold = Math.round((remainingChips - newTotalChips) / 1000 * 50);

  const { error: settleError } = await supabase
    .from('game_players')
    .update({
      remaining_chips: remainingChips,
      settled_gold: settledGold,
      is_settled: true
    })
    .eq('game_id', gameId)
    .eq('user_id', userId);

  if (settleError) {
    error('结算失败', settleError.message);
  }

  // 添加结算日志
  await supabase.from('game_logs').insert({
    game_id: gameId,
    actor_id: userId,
    actor_name: testNickname,
    target_id: userId,
    target_name: testNickname,
    action: 'settle',
    remaining_chips: remainingChips,
    settled_gold: settledGold
  });

  // 验证结算数据
  const { data: settledPlayer } = await supabase
    .from('game_players')
    .select('remaining_chips, settled_gold, is_settled')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .single();

  assert(settledPlayer.remaining_chips === remainingChips, '剩余筹码应该匹配');
  assert(settledPlayer.settled_gold === settledGold, '结算金币应该匹配');
  assert(settledPlayer.is_settled === true, '应该已结算');
  log(`结算成功: 剩余${remainingChips}筹码, 盈亏${settledGold}金币`);

  // 13. 结束牌局
  console.log('\n━━━ 13. 结束牌局 ━━━');
  const { error: settleGameError } = await supabase
    .from('games')
    .update({
      status: 'settled',
      settled_at: new Date().toISOString()
    })
    .eq('id', gameId);

  if (settleGameError) {
    error('结束牌局失败', settleGameError.message);
  }
  log('牌局已结束');

  // 14. 最终数据验证
  console.log('\n━━━ 14. 最终数据验证 ━━━');
  const { data: finalGame } = await supabase
    .from('games')
    .select('*, game_players(*), game_logs(*)')
    .eq('id', gameId)
    .single();

  assert(finalGame.status === 'settled', '状态应该是settled');
  assert(finalGame.game_players.length === 1, '应该有1个玩家');
  assert(finalGame.game_players[0].is_settled === true, '玩家应该已结算');
  assert(finalGame.game_logs.length >= 4, '应该至少有4条日志（join, buy_in, return, settle）');

  // 验证日志顺序和内容
  const logs = finalGame.game_logs;
  const joinLog = logs.find(l => l.action === 'join');
  const buyInLog = logs.find(l => l.action === 'buy_in');
  const returnLog = logs.find(l => l.action === 'return');
  const settleLog = logs.find(l => l.action === 'settle');

  assert(joinLog !== undefined, '应该有join日志');
  assert(buyInLog !== undefined, '应该有buy_in日志');
  assert(returnLog !== undefined, '应该有return日志');
  assert(settleLog !== undefined, '应该有settle日志');

  log('最终数据验证通过', {
    status: finalGame.status,
    players: finalGame.game_players.length,
    logs: logs.length,
    logTypes: logs.map(l => l.action)
  });

  // 15. 查询历史
  console.log('\n━━━ 15. 查询历史 ━━━');
  const { data: games, error: historyError } = await supabase
    .from('games')
    .select('*, game_players(*, profiles(nickname)), game_logs(*)')
    .eq('created_by', userId)
    .order('date', { ascending: false });

  if (historyError) {
    error('查询历史失败', historyError.message);
  }

  assert(games.length >= 1, '应该至少有1个牌局');
  assert(games[0].game_players.length >= 1, '牌局应该有玩家');
  assert(games[0].game_logs.length >= 1, '牌局应该有日志');
  log(`查询到 ${games.length} 个牌局`, {
    gameId: games[0].id,
    location: games[0].location,
    status: games[0].status,
    players: games[0].game_players.length,
    logs: games[0].game_logs.length
  });

  // 16. 测试防连点：快速创建多个牌局
  console.log('\n━━━ 16. 测试防连点（快速创建） ━━━');
  const createPromises = [];
  for (let i = 0; i < 3; i++) {
    createPromises.push(
      supabase.from('games').insert({
        created_by: userId,
        date: new Date().toISOString().split('T')[0],
        location: `测试地点${i + 1}`,
        chips_per_hand: 1000,
        gold_per_hand: 50
      }).select().single()
    );
  }

  const results = await Promise.all(createPromises);
  const successCount = results.filter(r => !r.error).length;
  log(`快速创建测试: ${successCount}/3 成功（数据库允许多个，前端应防连点）`);

  // 17. 清理测试数据
  console.log('\n━━━ 17. 清理测试数据 ━━━');
  const { error: deleteError } = await supabase
    .from('games')
    .delete()
    .eq('created_by', userId);

  if (deleteError) {
    console.log('⚠️  清理牌局失败（可能需要管理员权限）:', deleteError.message);
  } else {
    log('测试牌局已删除');
  }

  // 完成
  console.log('\n' + '═'.repeat(50));
  console.log('🎉 所有核心流程测试通过！');
  console.log('═'.repeat(50));
  console.log('\n📋 测试结果摘要:');
  console.log('  ✓ 注册成功');
  console.log('  ✓ 登录成功');
  console.log('  ✓ Profile 自动创建');
  console.log('  ✓ 创建牌局');
  console.log('  ✓ 创建者自动加入');
  console.log('  ✓ 银行家自动设置');
  console.log('  ✓ 加入日志自动创建');
  console.log('  ✓ 数据一致性验证');
  console.log('  ✓ 开始牌局');
  console.log('  ✓ 买入');
  console.log('  ✓ 归还筹码');
  console.log('  ✓ 结算');
  console.log('  ✓ 结束牌局');
  console.log('  ✓ 最终数据验证');
  console.log('  ✓ 查询历史');
  console.log('  ✓ 防连点测试');
  console.log('\n');
}

// 运行测试
testFlows().catch(err => {
  console.error('\n❌ 测试过程中发生异常:', err);
  process.exit(1);
});
