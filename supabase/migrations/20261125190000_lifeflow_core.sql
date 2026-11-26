create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id text,
  workout_name text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id text,
  exercise_name text not null,
  set_number integer not null check (set_number > 0),
  reps integer not null check (reps > 0),
  weight_kg numeric(7, 2) not null check (weight_kg >= 0),
  completed_at timestamptz not null
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Focus',
  mode text not null check (mode in ('pomodoro', 'block')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.creatine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  amount_g numeric(5, 2) not null check (amount_g > 0),
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table if not exists public.life_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_name text not null,
  description text not null default '',
  calories integer not null default 0 check (calories >= 0),
  protein_g numeric(7, 2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(7, 2) not null default 0 check (carbs_g >= 0),
  fats_g numeric(7, 2) not null default 0 check (fats_g >= 0),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.creatine_logs enable row level security;
alter table public.life_events enable row level security;
alter table public.meal_logs enable row level security;

drop policy if exists "Users manage their workout sessions" on public.workout_sessions;
create policy "Users manage their workout sessions"
  on public.workout_sessions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users manage their workout sets" on public.workout_sets;
create policy "Users manage their workout sets"
  on public.workout_sets for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.workout_sessions session
      where session.id = session_id
        and session.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage their focus sessions" on public.focus_sessions;
create policy "Users manage their focus sessions"
  on public.focus_sessions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users manage their creatine logs" on public.creatine_logs;
create policy "Users manage their creatine logs"
  on public.creatine_logs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users manage their life events" on public.life_events;
create policy "Users manage their life events"
  on public.life_events for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users manage their meal logs" on public.meal_logs;
create policy "Users manage their meal logs"
  on public.meal_logs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace view public.latest_exercise_performance
with (security_invoker = true)
as
with all_sets as (
  select
    log.user_id,
    coalesce(log.workout_exercise_id::text, lower(btrim(log.exercise_name))) as exercise_key,
    log.workout_exercise_id::text as exercise_id,
    log.exercise_name,
    log.weight_kg::numeric as weight_kg,
    log.reps,
    log.created_at as performed_at
  from public.exercise_logs log
  where log.user_id is not null

  union all

  select
    set_log.user_id,
    coalesce(set_log.exercise_id, lower(btrim(set_log.exercise_name))) as exercise_key,
    set_log.exercise_id,
    set_log.exercise_name,
    set_log.weight_kg::numeric,
    set_log.reps,
    set_log.completed_at
  from public.workout_sets set_log
),
ranked_sets as (
  select
    all_sets.*,
    max(weight_kg) over (partition by user_id, exercise_key) as max_weight_kg,
    row_number() over (
      partition by user_id, exercise_key
      order by performed_at desc
    ) as row_num
  from all_sets
)
select
  user_id,
  exercise_key,
  exercise_id,
  exercise_name,
  weight_kg,
  reps,
  performed_at,
  max_weight_kg
from ranked_sets
where row_num = 1;

grant select on public.latest_exercise_performance to authenticated;
