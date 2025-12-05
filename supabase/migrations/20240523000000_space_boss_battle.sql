
-- Create Enum for Game Modes
create type public.game_mode as enum ('programming', 'software', 'learning');

-- Create Enum for Battle Status
create type public.battle_status as enum ('scheduled', 'active', 'completed', 'cancelled');

-- Create Enum for Difficulty
create type public.difficulty_level as enum ('easy', 'medium', 'hard', 'insane');

-- Create Space Questions Table
create table public.space_questions (
  id uuid not null default gen_random_uuid(),
  title text not null,
  description text,
  mode public.game_mode not null,
  difficulty public.difficulty_level not null default 'medium',
  content jsonb not null, -- Stores the actual question data (MCQ options, coding problem, etc.)
  created_at timestamp with time zone not null default now(),
  created_by uuid references auth.users(id),
  
  constraint space_questions_pkey primary key (id)
);

-- Create Space Battles Table
create table public.space_battles (
  id uuid not null default gen_random_uuid(),
  title text not null,
  status public.battle_status not null default 'scheduled',
  mode public.game_mode not null,
  difficulty public.difficulty_level not null default 'medium',
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  base_hp integer not null default 1000,
  current_hp integer not null default 1000,
  is_global_event boolean default false,
  question_set_id uuid references public.space_questions(id),
  created_at timestamp with time zone not null default now(),
  created_by uuid references auth.users(id),
  
  constraint space_battles_pkey primary key (id)
);

-- Create Space Battle Participants Table
create table public.space_battle_participants (
  id uuid not null default gen_random_uuid(),
  battle_id uuid not null references public.space_battles(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  score integer default 0,
  damage_dealt integer default 0,
  joined_at timestamp with time zone default now(),
  
  constraint space_battle_participants_pkey primary key (id),
  constraint space_battle_participants_unique_user unique (battle_id, user_id)
);

-- Create Space Battle Logs Table (for feed)
create table public.space_battle_logs (
  id uuid not null default gen_random_uuid(),
  battle_id uuid not null references public.space_battles(id) on delete cascade,
  user_id uuid references auth.users(id),
  action_type text not null, -- 'hit', 'miss', 'join', 'defeat'
  damage integer default 0,
  message text,
  created_at timestamp with time zone default now(),
  
  constraint space_battle_logs_pkey primary key (id)
);

-- Enable RLS
alter table public.space_questions enable row level security;
alter table public.space_battles enable row level security;
alter table public.space_battle_participants enable row level security;
alter table public.space_battle_logs enable row level security;

-- Policies
-- Questions: Readable by everyone, Writable by admins
create policy "Questions are viewable by everyone" on public.space_questions for select using (true);
create policy "Questions are insertable by admins" on public.space_questions for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Questions are updatable by admins" on public.space_questions for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Battles: Readable by everyone, Writable by admins
create policy "Battles are viewable by everyone" on public.space_battles for select using (true);
create policy "Battles are insertable by admins" on public.space_battles for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Battles are updatable by admins" on public.space_battles for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Participants: Viewable by everyone, Insertable by authenticated users (joining)
create policy "Participants are viewable by everyone" on public.space_battle_participants for select using (true);
create policy "Users can join battles" on public.space_battle_participants for insert with check (auth.uid() = user_id);
create policy "System can update participants" on public.space_battle_participants for update using (true); -- Simplified for demo, ideally restricted

-- Logs: Viewable by everyone, Insertable by authenticated users (actions)
create policy "Logs are viewable by everyone" on public.space_battle_logs for select using (true);
create policy "Users can create logs" on public.space_battle_logs for insert with check (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table public.space_battles;
alter publication supabase_realtime add table public.space_battle_participants;
alter publication supabase_realtime add table public.space_battle_logs;
