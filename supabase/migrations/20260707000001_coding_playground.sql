-- =====================
-- コーディングプレイグラウンド（Phase 21）
-- =====================

-- lessons にプレイグラウンド有効/無効フラグを追加
-- NOT NULL DEFAULT false のため既存レッスンはすべて無効のまま自動移行される
alter table public.lessons
  add column enable_playground boolean not null default false;

-- =====================
-- code_snippets（教師が登録する初期コード）
-- =====================

create type public.code_language as enum ('python', 'javascript');

create table public.code_snippets (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  title         text not null,
  language      public.code_language not null,
  initial_code  text not null,
  "order"       int not null,
  created_at    timestamptz not null default now()
);

alter table public.code_snippets enable row level security;

-- 認証ユーザーは閲覧可（レッスン内容の一部のため questions と同様の扱い）
create policy "code_snippets: 認証ユーザーは閲覧可"
  on public.code_snippets for select
  using (auth.uid() is not null);

-- teacher/admin のみ作成・更新・削除可
create policy "code_snippets: teacher/admin のみ作成"
  on public.code_snippets for insert
  with check (public.my_role() in ('teacher', 'admin'));

create policy "code_snippets: teacher/admin のみ更新"
  on public.code_snippets for update
  using (public.my_role() in ('teacher', 'admin'));

create policy "code_snippets: teacher/admin のみ削除"
  on public.code_snippets for delete
  using (public.my_role() in ('teacher', 'admin'));

create index on public.code_snippets (lesson_id);

-- =====================
-- student_code_states（生徒ごとの編集内容の保存）
-- =====================

create table public.student_code_states (
  id          uuid primary key default gen_random_uuid(),
  snippet_id  uuid not null references public.code_snippets(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  code        text not null,
  updated_at  timestamptz not null default now(),
  unique (snippet_id, user_id)
);

alter table public.student_code_states enable row level security;

-- 本人のみ読み書き可
create policy "student_code_states: 本人のみ閲覧"
  on public.student_code_states for select
  using (user_id = auth.uid());

create policy "student_code_states: 本人のみ作成"
  on public.student_code_states for insert
  with check (user_id = auth.uid());

create policy "student_code_states: 本人のみ更新"
  on public.student_code_states for update
  using (user_id = auth.uid());

create index on public.student_code_states (snippet_id);
