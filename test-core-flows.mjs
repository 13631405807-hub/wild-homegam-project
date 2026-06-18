/**
 * 狂野HomeGame - 核心流程测试脚本
 *
 * 使用方法：
 * 1. 确保已配置 .env 文件（VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY）
 * 2. 运行：node test-core-flows.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
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
  log('Profile 已创建', { nickname: profile.nickname, is_admin: profile.is_admin });

  // 4. 创建牌局
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

  // 5. 加入牌局
  console.log('\n━━━ 5. 加入牌局 ━━━');
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
  log('加入牌局成功');

  // 6. 开始牌局
  console.log('\n━━━ 6. 开始牌局 ━━━');
  const { error: startError } = await supabase
    .from('games')
    .update({
      status: 'playing',
      started_at: new Date().toISOString(),
      banker_id: userId
    })
    .eq('id', gameId);

  if (startError) {
    error('开始牌局失败', startError.message);
  }
  log('牌局已开始');

  // 7. 买入
  console.log('\n━━━ 7. 买入 ━━━');
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
  log(`买入成功: ${buyInHands}手, ${buyInChips}筹码`);

  // 8. 归还筹码
  console.log('\n━━━ 8. 归还筹码 ━━━');
  const returnHands = 2;
  const returnChips = returnHands * 1000;
  const { error: returnError } = await supabase
    .from('game_players')
    .update({
      buy_in_hands: buyInHands - returnHands,
      buy_in_amount: buyInChips - returnChips,
      total_chips: buyInChips - returnChips
    })
    .eq('game_id', gameId)
    .eq('user_id', userId);

  if (returnError) {
    error('归还筹码失败', returnError.message);
  }
  log(`归还成功: ${returnHands}手, 减少${returnChips}筹码`);

  // 9. 结算
  console.log('\n━━━ 9. 结算 ━━━');
  const remainingChips = 2500; // 剩余筹码
  const settledGold = Math.round((remainingChips - (buyInChips - returnChips)) / 1000 * 50);
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
  log(`结算成功: 剩余${remainingChips}筹码, 盈亏${settledGold}金币`);

  // 10. 结束牌局
  console.log('\n━━━ 10. 结束牌局 ━━━');
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

  // 11. 查询历史
  console.log('\n━━━ 11. 查询历史 ━━━');
  const { data: games, error: historyError } = await supabase
    .from('games')
    .select('*, game_players(*, profiles(nickname))')
    .eq('created_by', userId)
    .order('date', { ascending: false });

  if (historyError) {
    error('查询历史失败', historyError.message);
  }
  log(`查询到 ${games.length} 个牌局`, {
    gameId: games[0].id,
    location: games[0].location,
    status: games[0].status,
    players: games[0].game_players.length
  });

  // 12. 清理测试数据（可选）
  console.log('\n━━━ 12. 清理测试数据 ━━━');
  const { error: deleteError } = await supabase
    .from('games')
    .delete()
    .eq('id', gameId);

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
  console.log('  ✓ 加入牌局');
  console.log('  ✓ 开始牌局');
  console.log('  ✓ 买入');
  console.log('  ✓ 归还筹码');
  console.log('  ✓ 结算');
  console.log('  ✓ 结束牌局');
  console.log('  ✓ 查询历史');
  console.log('\n');
}

// 运行测试
testFlows().catch(err => {
  console.error('\n❌ 测试过程中发生异常:', err);
  process.exit(1);
});
