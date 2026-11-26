-- NutriFlow cross-device user routine, weight logs & body profile sync tables
create table if not exists public.user_body_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weight_kg numeric(5, 2),
  target_weight_kg numeric(5, 2),
  height_cm integer,
  age integer,
  sex text check (sex in ('m', 'f', '')),
  weekly_workout_goal integer not null default 4 check (weekly_workout_goal between 1 and 7),
  updated_at timestamptz not null default now()
);

create table if not exists public.body_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  weight_kg numeric(5, 2) not null check (weight_kg between 20 and 300),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  completed_ids text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

alter table public.user_body_profiles enable row level security;
alter table public.body_weight_logs enable row level security;
alter table public.habit_logs enable row level security;

drop policy if exists "Users manage their body profile" on public.user_body_profiles;
create policy "Users manage their body profile"
  on public.user_body_profiles for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users manage their weight logs" on public.body_weight_logs;
create policy "Users manage their weight logs"
  on public.body_weight_logs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users manage their habit logs" on public.habit_logs;
create policy "Users manage their habit logs"
  on public.habit_logs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
