-- Coaching Programs — 5-day prep linked to a saved job listing
create table public.coaching_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  interview_id uuid not null references public.interviews(id) on delete cascade,
  current_day int not null default 1,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.coaching_programs enable row level security;
create policy "Users can read own programs" on public.coaching_programs
  for select using (auth.uid() = user_id);
create policy "Users can insert own programs" on public.coaching_programs
  for insert with check (auth.uid() = user_id);
create policy "Users can update own programs" on public.coaching_programs
  for update using (auth.uid() = user_id);

create index idx_coaching_programs_user on public.coaching_programs(user_id);

-- Coaching Days — 5 per program, each with its own question set
create table public.coaching_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.coaching_programs(id) on delete cascade,
  day_number int not null,
  questions jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  started_at timestamptz,
  completed_at timestamptz
);

alter table public.coaching_days enable row level security;
create policy "Users can read own days" on public.coaching_days
  for select using (
    exists (select 1 from public.coaching_programs where id = program_id and user_id = auth.uid())
  );
create policy "Users can insert own days" on public.coaching_days
  for insert with check (
    exists (select 1 from public.coaching_programs where id = program_id and user_id = auth.uid())
  );
create policy "Users can update own days" on public.coaching_days
  for update using (
    exists (select 1 from public.coaching_programs where id = program_id and user_id = auth.uid())
  );

create index idx_coaching_days_program on public.coaching_days(program_id);

-- Coaching Attempts — up to 3 per question per day
create table public.coaching_attempts (
  id uuid primary key default gen_random_uuid(),
  coaching_day_id uuid not null references public.coaching_days(id) on delete cascade,
  question_index int not null,
  attempt_number int not null,
  answer_text text not null,
  evaluation jsonb,
  created_at timestamptz not null default now()
);

alter table public.coaching_attempts enable row level security;
create policy "Users can read own attempts" on public.coaching_attempts
  for select using (
    exists (
      select 1 from public.coaching_days cd
      join public.coaching_programs cp on cp.id = cd.program_id
      where cd.id = coaching_day_id and cp.user_id = auth.uid()
    )
  );
create policy "Users can insert own attempts" on public.coaching_attempts
  for insert with check (
    exists (
      select 1 from public.coaching_days cd
      join public.coaching_programs cp on cp.id = cd.program_id
      where cd.id = coaching_day_id and cp.user_id = auth.uid()
    )
  );

create index idx_coaching_attempts_day on public.coaching_attempts(coaching_day_id);
