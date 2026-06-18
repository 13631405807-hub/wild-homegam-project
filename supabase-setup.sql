-- ============================================
-- 狂野HomeGame - Supabase 数据库初始化
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================

-- 启用 realtime
-- (在 Supabase Dashboard > Database > Replication 中也可以手动启用)

-- ============================================
-- 用户资料表
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  nickname TEXT NOT NULL,
  avatar TEXT,
  is_admin BOOLEAN DEFAULT false,
  is_protected BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================
-- 游戏表
-- ============================================
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL DEFAULT current_date,
  location TEXT DEFAULT '',
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'settled')),
  banker_id UUID REFERENCES profiles(id),
  chips_per_hand INTEGER DEFAULT 1000,
  gold_per_hand INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================
-- 游戏玩家表
-- ============================================
CREATE TABLE IF NOT EXISTS game_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  is_banker BOOLEAN DEFAULT false,
  buy_in_hands INTEGER DEFAULT 0,
  buy_in_amount INTEGER DEFAULT 0,
  rebuy_amount INTEGER DEFAULT 0,
  remaining_chips INTEGER,
  settled_amount NUMERIC,
  is_settled BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(game_id, user_id)
);

-- ============================================
-- 交易记录表
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  type TEXT CHECK (type IN ('buy_in', 'rebuy', 'settle')),
  chips INTEGER NOT NULL,
  hands INTEGER,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================
-- 行级安全策略 (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Profiles: 所有人可读，用户只能编辑自己的，管理员可更新所有人
CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Games: 登录用户可读，创建者可创建，登录用户可更新，管理员可删除
CREATE POLICY "Authenticated read games" ON games
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated create games" ON games
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated update games" ON games
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete games" ON games
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Game players: 登录用户可读写
CREATE POLICY "Authenticated read players" ON game_players
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert players" ON game_players
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update players" ON game_players
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Transactions: 登录用户可读写
CREATE POLICY "Authenticated read transactions" ON transactions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated create transactions" ON transactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 启用 Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- ============================================
-- 创建新用户时自动创建 profile 的触发器
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname, is_admin, is_protected)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'is_protected')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 如果是已有数据库升级，在这里执行迁移
-- ============================================
-- 1. 添加新列到 profiles 表
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
-- 1. 添加新列到 profiles 表
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_protected BOOLEAN DEFAULT false;

-- 2. 删除旧策略并重建（避免重复创建报错）
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can delete games" ON games;
CREATE POLICY "Admins can delete games" ON games
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 3. 更新触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname, is_admin, is_protected)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'is_protected')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 回填现有用户的邮箱
UPDATE profiles SET email = auth.users.email
FROM auth.users
WHERE profiles.id = auth.users.id AND profiles.email IS NULL;

-- 5. 将你的第一个管理员账号设为管理员和受保护（替换邮箱后执行）
-- UPDATE profiles SET is_admin = true, is_protected = true
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@wild.game');
