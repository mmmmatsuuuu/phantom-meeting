-- =====================
-- quiz_attempt_answers（小テスト回答詳細）
-- =====================

create table public.quiz_attempt_answers (
  id          uuid primary key default gen_random_uuid(),
  attempt_id  uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  answer      jsonb not null,
  is_correct  boolean
);

alter table public.quiz_attempt_answers enable row level security;

-- 自分の回答のみ読み取り可（attempt_id 経由で user_id を確認）
create policy "quiz_attempt_answers_select_own" on public.quiz_attempt_answers
  for select using (
    exists (
      select 1 from public.quiz_attempts
      where id = attempt_id and user_id = auth.uid()
    )
  );

-- 自分の受験記録への書き込みのみ可
create policy "quiz_attempt_answers_insert_own" on public.quiz_attempt_answers
  for insert with check (
    exists (
      select 1 from public.quiz_attempts
      where id = attempt_id and user_id = auth.uid()
    )
  );

-- teacher/admin は全件読み取り可
create policy "quiz_attempt_answers_select_teacher" on public.quiz_attempt_answers
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('teacher', 'admin')
    )
  );

-- 検索パフォーマンス向上のためインデックスを追加
create index on public.quiz_attempt_answers (attempt_id);
create index on public.quiz_attempt_answers (question_id);
