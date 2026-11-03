-- =====================
-- ノートのひな形（レッスンごとに 1 つ）
--
-- 穴埋めと発問を含むプリントのようなひな形を教師が用意し、生徒はノートに読み込んで書き換える。
-- 追加だけの変更のため、本番に先に適用しても現在のコードには影響しない。
-- 画面上の「ノート」は DB では memos（docs/design.md の「用語」）
-- =====================

create table public.memo_templates (
  lesson_id  uuid primary key references public.lessons(id) on delete cascade,
  -- tiptap の文書 JSON
  content    jsonb not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.memo_templates enable row level security;

-- 認証ユーザーは閲覧可（レッスン内容の一部のため code_snippets と同様の扱い）
create policy "memo_templates: 認証ユーザーは閲覧可"
  on public.memo_templates for select
  using ((select auth.uid()) is not null);

create policy "memo_templates: teacher/admin のみ作成"
  on public.memo_templates for insert
  with check ((select public.my_role()) in ('teacher', 'admin'));

create policy "memo_templates: teacher/admin のみ更新"
  on public.memo_templates for update
  using ((select public.my_role()) in ('teacher', 'admin'));

create policy "memo_templates: teacher/admin のみ削除"
  on public.memo_templates for delete
  using ((select public.my_role()) in ('teacher', 'admin'));
