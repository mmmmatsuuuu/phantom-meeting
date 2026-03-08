-- =====================
-- ENUM 型
-- =====================

create type public.role as enum ('admin', 'teacher', 'student');
create type public.quiz_question_type as enum ('multiple_choice', 'short_answer', 'ordering');

-- =====================
-- profiles
-- =====================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        public.role not null default 'student',
  is_approved boolean not null default false,
  display_name text not null default '',
  created_at  timestamptz not null default now()
);

-- auth.users に登録されたら profiles に自動挿入するトリガー
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================
-- subjects
-- =====================

create table public.subjects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  "order"    int not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- =====================
-- units
-- =====================

create table public.units (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name       text not null,
  "order"    int not null default 0,
  created_at timestamptz not null default now()
);

-- =====================
-- lessons
-- =====================

create table public.lessons (
  id          uuid primary key default gen_random_uuid(),
  unit_id     uuid not null references public.units(id) on delete cascade,
  title       text not null,
  youtube_url text not null,
  "order"     int not null default 0,
  created_at  timestamptz not null default now()
);

-- =====================
-- questions（発問）
-- =====================

create table public.questions (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons(id) on delete cascade,
  content    text not null,
  "order"    int not null default 0,
  created_at timestamptz not null default now()
);

-- =====================
-- memos
-- =====================

create table public.memos (
  id                uuid primary key default gen_random_uuid(),
  lesson_id         uuid not null references public.lessons(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  content           jsonb not null default '{}',
  timestamp_seconds int,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- updated_at 自動更新トリガー
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger memos_set_updated_at
  before update on public.memos
  for each row execute procedure public.set_updated_at();

-- =====================
-- posts（共有投稿）
-- =====================

create table public.posts (
  id         uuid primary key default gen_random_uuid(),
  memo_id    uuid not null references public.memos(id) on delete cascade,
  lesson_id  uuid not null references public.lessons(id) on delete cascade,
  content    jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- =====================
-- quizzes
-- =====================

create table public.quizzes (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons(id) on delete cascade,
  title      text not null,
  created_at timestamptz not null default now()
);

-- =====================
-- quiz_questions
-- =====================

create table public.quiz_questions (
  id             uuid primary key default gen_random_uuid(),
  quiz_id        uuid not null references public.quizzes(id) on delete cascade,
  type           public.quiz_question_type not null,
  content        jsonb not null default '{}',
  correct_answer jsonb not null default '{}',
  options        jsonb,
  "order"        int not null default 0
);
