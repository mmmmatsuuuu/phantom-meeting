-- =====================
-- quiz_attempts（小テスト提出記録）
-- =====================

create table public.quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  quiz_id      uuid not null references public.quizzes(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  score        int not null,
  max_score    int not null,
  submitted_at timestamptz not null default now()
);

alter table public.quiz_attempts enable row level security;

-- 自分の記録のみ読み書き可
create policy "quiz_attempts_select_own" on public.quiz_attempts
  for select using (auth.uid() = user_id);

create policy "quiz_attempts_insert_own" on public.quiz_attempts
  for insert with check (auth.uid() = user_id);

-- teacher/admin は全件読み取り可
create policy "quiz_attempts_select_teacher" on public.quiz_attempts
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('teacher', 'admin')
    )
  );
