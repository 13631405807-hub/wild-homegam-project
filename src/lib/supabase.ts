import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = !!supabase;

// Supabase SQL for initial setup (run in Supabase SQL Editor):
/*
-- Enable realtime
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table game_players;
alter publication supabase_realtime add table transactions;

-- Profiles table (extends auth.users)
create table profiles (
  id uuid references auth.users primary key,
  nickname text not null,
  avatar text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Games table
create table games (
  id uuid default gen_random_uuid() primary key,
  created_by uuid references profiles(id) not null,
  date date not null default current_date,
  location text default '',
  status text default 'waiting' check (status in ('waiting', 'playing', 'settled')),
  banker_id uuid references profiles(id),
  chips_per_hand integer default 1000,
  gold_per_hand integer default 50,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Game players table
create table game_players (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references games(id) on delete cascade,
  user_id uuid references profiles(id),
  is_banker boolean default false,
  buy_in_hands integer default 0,
  buy_in_amount integer default 0,
  rebuy_amount integer default 0,
  remaining_chips integer,
  settled_amount numeric,
  is_settled boolean default false,
  joined_at timestamp with time zone default timezone('utc'::text, now()),
  unique(game_id, user_id)
);

-- Transactions table
create table transactions (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references games(id) on delete cascade,
  user_id uuid references profiles(id),
  type text check (type in ('buy_in', 'rebuy', 'settle')),
  chips integer not null,
  hands integer,
  created_by uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Row Level Security
alter table profiles enable row level security;
alter table games enable row level security;
alter table game_players enable row level security;
alter table transactions enable row level security;

-- Profiles: everyone can read, users can update their own
create policy "Public profiles" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Games: authenticated users can read all, create, and update
create policy "Authenticated read games" on games for select using (auth.role() = 'authenticated');
create policy "Authenticated create games" on games for insert with check (auth.uid() = created_by);
create policy "Game members can update" on games for update using (auth.role() = 'authenticated');

-- Game players: authenticated users can manage
create policy "Authenticated read players" on game_players for select using (auth.role() = 'authenticated');
create policy "Authenticated insert players" on game_players for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update players" on game_players for update using (auth.role() = 'authenticated');

-- Transactions: authenticated users can read and create
create policy "Authenticated read transactions" on transactions for select using (auth.role() = 'authenticated');
create policy "Authenticated create transactions" on transactions for insert with check (auth.role() = 'authenticated');
*/
