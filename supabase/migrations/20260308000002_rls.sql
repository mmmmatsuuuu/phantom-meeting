-- =====================
-- RLS 有効化
-- =====================

alter table public.profiles      enable row level security;
alter table public.subjects       enable row level security;
alter table public.units          enable row level security;
alter table public.lessons        enable row level security;
alter table public.questions      enable row level security;
alter table public.memos          enable row level security;
alter table public.posts          enable row level security;
alter table public.quizzes        enable row level security;
alter table public.quiz_questions enable row level security;

-- =====================
-- ヘルパー関数
-- =====================

-- 自分のロールを取得
create or replace function public.my_role()
returns public.role
language sql
stable
security definer
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- =====================
-- profiles
-- =====================

-- 自分自身のみ閲覧・更新可
create policy "profiles: 本人のみ閲覧"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: 本人のみ更新"
  on public.profiles for update
  using (id = auth.uid());

-- =====================
-- subjects / units / lessons / questions
-- =====================

-- 全認証ユーザーが閲覧可
create policy "subjects: 認証ユーザーは閲覧可"
  on public.subjects for select
  using (auth.uid() is not null);

create policy "units: 認証ユーザーは閲覧可"
  on public.units for select
  using (auth.uid() is not null);

create policy "lessons: 認証ユーザーは閲覧可"
  on public.lessons for select
  using (auth.uid() is not null);

create policy "questions: 認証ユーザーは閲覧可"
  on public.questions for select
  using (auth.uid() is not null);

-- teacher / admin のみ作成・更新・削除可
create policy "subjects: teacher/admin のみ作成"
  on public.subjects for insert
  with check (public.my_role() in ('teacher', 'admin'));

create policy "subjects: teacher/admin のみ更新"
  on public.subjects for update
  using (public.my_role() in ('teacher', 'admin'));

create policy "subjects: teacher/admin のみ削除"
  on public.subjects for delete
  using (public.my_role() in ('teacher', 'admin'));

create policy "units: teacher/admin のみ作成"
  on public.units for insert
  with check (public.my_role() in ('teacher', 'admin'));

create policy "units: teacher/admin のみ更新"
  on public.units for update
  using (public.my_role() in ('teacher', 'admin'));

create policy "units: teacher/admin のみ削除"
  on public.units for delete
  using (public.my_role() in ('teacher', 'admin'));

create policy "lessons: teacher/admin のみ作成"
  on public.lessons for insert
  with check (public.my_role() in ('teacher', 'admin'));

create policy "lessons: teacher/admin のみ更新"
  on public.lessons for update
  using (public.my_role() in ('teacher', 'admin'));

create policy "lessons: teacher/admin のみ削除"
  on public.lessons for delete
  using (public.my_role() in ('teacher', 'admin'));

create policy "questions: teacher/admin のみ作成"
  on public.questions for insert
  with check (public.my_role() in ('teacher', 'admin'));

create policy "questions: teacher/admin のみ更新"
  on public.questions for update
  using (public.my_role() in ('teacher', 'admin'));

create policy "questions: teacher/admin のみ削除"
  on public.questions for delete
  using (public.my_role() in ('teacher', 'admin'));

-- =====================
-- memos（プライベート：本人のみ）
-- =====================

create policy "memos: 本人のみ閲覧"
  on public.memos for select
  using (user_id = auth.uid());

create policy "memos: 本人のみ作成"
  on public.memos for insert
  with check (user_id = auth.uid());

create policy "memos: 本人のみ更新"
  on public.memos for update
  using (user_id = auth.uid());

create policy "memos: 本人のみ削除"
  on public.memos for delete
  using (user_id = auth.uid());

-- =====================
-- posts（全員閲覧可、本人のみ作成）
-- =====================

create policy "posts: 認証ユーザーは閲覧可"
  on public.posts for select
  using (auth.uid() is not null);

-- 投稿は自分のメモからのみ作成可（memo の user_id を確認）
create policy "posts: 本人のメモからのみ作成"
  on public.posts for insert
  with check (
    exists (
      select 1 from public.memos
      where id = memo_id and user_id = auth.uid()
    )
  );

-- =====================
-- quizzes / quiz_questions
-- =====================

create policy "quizzes: 認証ユーザーは閲覧可"
  on public.quizzes for select
  using (auth.uid() is not null);

create policy "quiz_questions: 認証ユーザーは閲覧可"
  on public.quiz_questions for select
  using (auth.uid() is not null);

create policy "quizzes: teacher/admin のみ作成"
  on public.quizzes for insert
  with check (public.my_role() in ('teacher', 'admin'));

create policy "quizzes: teacher/admin のみ更新"
  on public.quizzes for update
  using (public.my_role() in ('teacher', 'admin'));

create policy "quizzes: teacher/admin のみ削除"
  on public.quizzes for delete
  using (public.my_role() in ('teacher', 'admin'));

create policy "quiz_questions: teacher/admin のみ作成"
  on public.quiz_questions for insert
  with check (public.my_role() in ('teacher', 'admin'));

create policy "quiz_questions: teacher/admin のみ更新"
  on public.quiz_questions for update
  using (public.my_role() in ('teacher', 'admin'));

create policy "quiz_questions: teacher/admin のみ削除"
  on public.quiz_questions for delete
  using (public.my_role() in ('teacher', 'admin'));
