
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. PROFILES & USERS
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  avatar_url text,
  role text default 'user' check (role in ('admin', 'user')),
  xp integer default 0,
  game_points integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid error on recreation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. APP SETTINGS
-- -----------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamp with time zone default now()
);

-- Seed default settings
insert into public.app_settings (key, value, description)
values 
  ('maintenance_mode', 'false'::jsonb, 'Toggle maintenance mode for the application'),
  ('global_offer', 'null'::jsonb, 'Current global store offer')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- 3. CHAT SYSTEM
-- -----------------------------------------------------------------------------
create table if not exists public.channels (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone default now()
);

create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.channels(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  content text not null,
  created_at timestamp with time zone default now()
);

-- -----------------------------------------------------------------------------
-- 4. TASKS & SUBMISSIONS
-- -----------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id), -- Null means common task
  assigned_by uuid references public.profiles(id),
  status text default 'pending' check (status in ('pending', 'completed', 'waiting_for_approval', 'rejected', 'late_completed', 'failed')),
  due_date timestamp with time zone,
  is_common_task boolean default false,
  marks_awarded integer,
  xp_awarded_manual integer,
  task_type text default 'standard' check (task_type in ('standard', 'typer')),
  related_typing_text_id uuid, -- Link to typer_texts if needed
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  completed_at timestamp with time zone
);

create table if not exists public.submissions (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text,
  file_url text,
  submitted_at timestamp with time zone default now()
);

-- -----------------------------------------------------------------------------
-- 5. NOTES
-- -----------------------------------------------------------------------------
create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text,
  is_pinned boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- -----------------------------------------------------------------------------
-- 6. STORE & INVENTORY
-- -----------------------------------------------------------------------------
create table if not exists public.store_sections (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  position integer default 0
);

create table if not exists public.store_items (
  id uuid default gen_random_uuid() primary key,
  section_id uuid references public.store_sections(id),
  name text not null,
  description text,
  price integer not null,
  quantity integer default -1, -- -1 means infinite
  item_type text not null check (item_type in ('power_up', 'xp_pack', 'mystery_box', 'power_box')),
  is_active boolean default true,
  power_up_type text, -- '2x_boost', 'shield', etc.
  xp_amount integer,
  box_contents jsonb, -- For mystery boxes
  duration_hours integer,
  effect_value integer,
  uses integer,
  position integer default 0,
  discount_percentage integer default 0,
  offer_start_time timestamp with time zone,
  offer_end_time timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.user_power_ups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  item_id uuid references public.store_items(id),
  power_up_type text not null,
  is_used boolean default false,
  used_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- -----------------------------------------------------------------------------
-- 7. AUCTION SYSTEM
-- -----------------------------------------------------------------------------
create table if not exists public.auction_items (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  starting_price integer not null,
  is_mystery_box boolean default false,
  mystery_box_contents jsonb,
  is_power_box boolean default false,
  power_box_contents jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

create table if not exists public.auctions (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references public.auction_items(id) on delete cascade not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  current_price integer not null,
  current_highest_bidder uuid references public.profiles(id),
  status text default 'scheduled' check (status in ('scheduled', 'active', 'ended', 'cancelled')),
  is_claimed boolean default false,
  claimed_prize jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.bids (
  id uuid default gen_random_uuid() primary key,
  auction_id uuid references public.auctions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  bid_amount integer not null,
  created_at timestamp with time zone default now()
);

-- -----------------------------------------------------------------------------
-- 8. QUIZ SYSTEM
-- -----------------------------------------------------------------------------
create table if not exists public.quiz_sets (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  status text default 'draft' check (status in ('draft', 'published', 'inactive')),
  reward_type text default 'gp' check (reward_type in ('gp', 'xp')),
  points_per_question integer default 10,
  time_limit_minutes integer,
  enrollment_deadline timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.quiz_questions (
  id uuid default gen_random_uuid() primary key,
  quiz_set_id uuid references public.quiz_sets(id) on delete cascade not null,
  question text not null,
  options jsonb not null, -- Array of strings
  correct_option_index integer not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.quiz_submissions (
  id uuid default gen_random_uuid() primary key,
  quiz_set_id uuid references public.quiz_sets(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  score integer not null,
  answers jsonb, -- Record of user answers
  completed_at timestamp with time zone default now()
);

-- -----------------------------------------------------------------------------
-- 9. BUDDIES
-- -----------------------------------------------------------------------------
create table if not exists public.buddies (
  id uuid default gen_random_uuid() primary key,
  user1_id uuid references public.profiles(id) not null,
  user2_id uuid references public.profiles(id) not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamp with time zone default now(),
  constraint unique_buddy_pair unique (user1_id, user2_id)
);

-- -----------------------------------------------------------------------------
-- 10. TYPER
-- -----------------------------------------------------------------------------
create table if not exists public.typer_texts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  difficulty text default 'medium',
  created_at timestamp with time zone default now()
);

create table if not exists public.typer_scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  text_id uuid references public.typer_texts(id),
  wpm integer not null,
  accuracy integer not null,
  created_at timestamp with time zone default now()
);

-- -----------------------------------------------------------------------------
-- 11. SPACE BOSS BATTLE (Integrated)
-- -----------------------------------------------------------------------------
-- Create types safely
DO $$ BEGIN
    CREATE TYPE public.game_mode AS ENUM ('programming', 'software', 'learning');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.battle_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.difficulty_level AS ENUM ('easy', 'medium', 'hard', 'insane');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

create table if not exists public.space_questions (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  mode public.game_mode not null,
  difficulty public.difficulty_level default 'medium',
  content jsonb not null,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

create table if not exists public.space_battles (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  status public.battle_status default 'scheduled',
  mode public.game_mode not null,
  difficulty public.difficulty_level default 'medium',
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  base_hp integer default 1000,
  current_hp integer default 1000,
  is_global_event boolean default false,
  question_set_id uuid references public.space_questions(id),
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

create table if not exists public.space_battle_participants (
  id uuid default gen_random_uuid() primary key,
  battle_id uuid references public.space_battles(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  score integer default 0,
  damage_dealt integer default 0,
  joined_at timestamp with time zone default now(),
  constraint unique_battle_participant unique (battle_id, user_id)
);

create table if not exists public.space_battle_logs (
  id uuid default gen_random_uuid() primary key,
  battle_id uuid references public.space_battles(id) on delete cascade not null,
  user_id uuid references public.profiles(id),
  action_type text not null,
  damage integer default 0,
  message text,
  created_at timestamp with time zone default now()
);

-- -----------------------------------------------------------------------------
-- 12. FUN SPACE (2D Builder, etc)
-- -----------------------------------------------------------------------------
create table if not exists public.saved_2d_builds (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  data jsonb not null, -- The canvas data
  is_public boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- -----------------------------------------------------------------------------
-- 13. NOTIFICATIONS
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  is_read boolean default false,
  link_to text,
  gift_payload jsonb, -- Stores GiftPayload or RequestPayload
  created_at timestamp with time zone default now()
);

-- -----------------------------------------------------------------------------
-- RLS POLICIES (Basic Setup)
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Drop policies if they exist to avoid errors on recreation
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Realtime Publication
-- Add tables to publication if not already added (idempotent via 'alter publication ... add table' usually throws if exists, so we can ignore or wrap)
-- Supabase realtime publication usually handles this gracefully or we can just run it. 
-- However, 'alter publication' might fail if table is already in it.
-- A safe way is to just let it fail or check. For simplicity in this script, we'll assume it might error if added twice, 
-- but usually it's fine to re-run or we can leave it as is. 
-- Actually, 'alter publication ... add table' throws if table is already part of publication.
-- We'll wrap in DO block to be safe.

DO $$
BEGIN
  BEGIN alter publication supabase_realtime add table public.messages; EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.space_battles; EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.space_battle_participants; EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.space_battle_logs; EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.auctions; EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table public.bids; EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;
