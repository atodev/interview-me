-- Interview Me — Initial Schema
-- Run via: supabase db push

-- Users (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  tier text not null default 'free' check (tier in ('free', 'pro', 'premium')),
  streak int not null default 0,
  last_interview_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Interviews
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_title text not null,
  company text,
  seniority text,
  job_listing_raw text,
  job_listing_parsed jsonb,
  interview_style text not null default 'general',
  overall_score int,
  report jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.interviews enable row level security;
create policy "Users can read own interviews" on public.interviews
  for select using (auth.uid() = user_id);
create policy "Users can insert own interviews" on public.interviews
  for insert with check (auth.uid() = user_id);
create policy "Users can update own interviews" on public.interviews
  for update using (auth.uid() = user_id);

create index idx_interviews_user on public.interviews(user_id);
create index idx_interviews_created on public.interviews(created_at desc);

-- Questions & Answers
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  question_index int not null,
  question_text text not null,
  question_type text not null,
  answer_text text not null,
  score int,
  evaluation jsonb,
  created_at timestamptz not null default now()
);

alter table public.answers enable row level security;
create policy "Users can read own answers" on public.answers
  for select using (
    auth.uid() = (select user_id from public.interviews where id = interview_id)
  );
create policy "Users can insert own answers" on public.answers
  for insert with check (
    auth.uid() = (select user_id from public.interviews where id = interview_id)
  );

create index idx_answers_interview on public.answers(interview_id);

-- Daily Usage Tracking (for cost safeguards)
create table public.daily_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  ai_tokens_used int not null default 0,
  tts_chars_used int not null default 0,
  stt_minutes_used numeric(6,2) not null default 0,
  interviews_started int not null default 0,
  interviews_completed int not null default 0,
  unique(user_id, date)
);

alter table public.daily_usage enable row level security;
create policy "Users can read own usage" on public.daily_usage
  for select using (auth.uid() = user_id);

create index idx_usage_user_date on public.daily_usage(user_id, date desc);

-- Monthly aggregation view for cost monitoring
create or replace view public.monthly_cost_summary as
select
  date_trunc('month', date) as month,
  count(distinct user_id) as active_users,
  sum(ai_tokens_used) as total_ai_tokens,
  sum(tts_chars_used) as total_tts_chars,
  sum(stt_minutes_used) as total_stt_minutes,
  sum(interviews_completed) as total_interviews,
  -- Approximate cost
  round((sum(ai_tokens_used) * 0.000003)::numeric, 2) as est_ai_cost,
  round((sum(tts_chars_used) * 0.000018)::numeric, 2) as est_tts_cost,
  round((sum(stt_minutes_used) * 0.006)::numeric, 2) as est_stt_cost
from public.daily_usage
group by date_trunc('month', date)
order by month desc;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
