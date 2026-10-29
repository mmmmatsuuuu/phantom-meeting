-- 授業開始時の同時アクセスで DB が応答しなくなる問題への対策
--
-- 症状：授業中に statement timeout が多発し、Auth（内部で同じ Postgres を使う）の
-- トークン更新・ログインまでタイムアウトして生徒がアクセスできなくなった。
-- 原因は次の2つが重なり、生徒数 × 全行数の処理が授業開始時に集中していたこと。
-- 1. 検索条件に使う列（外部キー等）にインデックスがなく、毎回テーブル全体を読んでいた
-- 2. RLS ポリシー内の auth.uid() / my_role() が行ごとに評価されていた
--    （(select ...) で囲むと、1クエリにつき1回だけ評価される initPlan になる）
--
-- ポリシーは alter policy で式だけを書き換える。名前・対象操作・許可範囲は変えない。

-- ─── 1. インデックス ─────────────────────────────────────────────

-- memos：自分のメモ一覧（user_id）、レッスン内の自分のメモ（user_id + lesson_id）、教師のレッスン別閲覧（lesson_id）
create index if not exists memos_user_lesson_created_idx
  on public.memos (user_id, lesson_id, created_at);
create index if not exists memos_lesson_id_idx
  on public.memos (lesson_id);

-- posts：レッスン内の投稿一覧（新しい順）、メモからの投稿の検索・メモ削除時の連鎖削除
create index if not exists posts_lesson_created_idx
  on public.posts (lesson_id, created_at desc);
create index if not exists posts_memo_id_idx
  on public.posts (memo_id);

-- quiz_attempts：自分の受験記録（新しい順）
-- 既存の (quiz_id, user_id, submitted_at desc) は quiz_id が先頭のため user_id だけの検索には使えない
create index if not exists quiz_attempts_user_submitted_idx
  on public.quiz_attempts (user_id, submitted_at desc);

-- code_states：自分のコード保存状態（snippet_id 先頭の一意制約は user_id だけの検索には使えない）
create index if not exists code_states_user_id_idx
  on public.code_states (user_id);

-- コンテンツの親子関係（埋め込み select・連鎖削除で使う外部キー）
create index if not exists units_subject_id_idx
  on public.units (subject_id);
create index if not exists lessons_unit_id_idx
  on public.lessons (unit_id);
create index if not exists questions_lesson_id_idx
  on public.questions (lesson_id);
create index if not exists quizzes_lesson_id_idx
  on public.quizzes (lesson_id);
create index if not exists quiz_questions_quiz_id_idx
  on public.quiz_questions (quiz_id);

-- ─── 2. RLS ポリシー：auth.uid() / my_role() を (select ...) で囲む ─────────
-- teacher/admin 判定の exists (select 1 from profiles where id = auth.uid() and role in (...)) は
-- my_role() と同じ意味（プロフィールがなければどちらも偽）のため、(select public.my_role()) にそろえる

-- profiles
alter policy "profiles: 本人のみ閲覧" on public.profiles
  using (id = (select auth.uid()));
alter policy "profiles: 本人のみ更新" on public.profiles
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = (select public.my_role())
  );
alter policy "profiles: admin は全件閲覧可" on public.profiles
  using ((select public.my_role()) = 'admin');
alter policy "profiles: admin は全件更新可" on public.profiles
  using ((select public.my_role()) = 'admin');
alter policy "profiles: teacher は student のみ閲覧可" on public.profiles
  using ((select public.my_role()) = 'teacher' and role = 'student');
alter policy "profiles: teacher は student のみ更新可" on public.profiles
  using ((select public.my_role()) = 'teacher' and role = 'student');

-- subjects
alter policy "subjects: 認証ユーザーは閲覧可" on public.subjects
  using ((select auth.uid()) is not null);
alter policy "subjects: teacher/admin のみ作成" on public.subjects
  with check ((select public.my_role()) in ('teacher', 'admin'));
alter policy "subjects: teacher/admin のみ更新" on public.subjects
  using ((select public.my_role()) in ('teacher', 'admin'));
alter policy "subjects: teacher/admin のみ削除" on public.subjects
  using ((select public.my_role()) in ('teacher', 'admin'));

-- units
alter policy "units: 認証ユーザーは閲覧可" on public.units
  using ((select auth.uid()) is not null);
alter policy "units: teacher/admin のみ作成" on public.units
  with check ((select public.my_role()) in ('teacher', 'admin'));
alter policy "units: teacher/admin のみ更新" on public.units
  using ((select public.my_role()) in ('teacher', 'admin'));
alter policy "units: teacher/admin のみ削除" on public.units
  using ((select public.my_role()) in ('teacher', 'admin'));

-- lessons
alter policy "lessons: 認証ユーザーは閲覧可" on public.lessons
  using ((select auth.uid()) is not null);
alter policy "lessons: teacher/admin のみ作成" on public.lessons
  with check ((select public.my_role()) in ('teacher', 'admin'));
alter policy "lessons: teacher/admin のみ更新" on public.lessons
  using ((select public.my_role()) in ('teacher', 'admin'));
alter policy "lessons: teacher/admin のみ削除" on public.lessons
  using ((select public.my_role()) in ('teacher', 'admin'));

-- questions
alter policy "questions: 認証ユーザーは閲覧可" on public.questions
  using ((select auth.uid()) is not null);
alter policy "questions: teacher/admin のみ作成" on public.questions
  with check ((select public.my_role()) in ('teacher', 'admin'));
alter policy "questions: teacher/admin のみ更新" on public.questions
  using ((select public.my_role()) in ('teacher', 'admin'));
alter policy "questions: teacher/admin のみ削除" on public.questions
  using ((select public.my_role()) in ('teacher', 'admin'));

-- memos
alter policy "memos: 本人のみ閲覧" on public.memos
  using (user_id = (select auth.uid()));
alter policy "memos: 本人のみ作成" on public.memos
  with check (user_id = (select auth.uid()));
alter policy "memos: 本人のみ更新" on public.memos
  using (user_id = (select auth.uid()));
alter policy "memos: 本人のみ削除" on public.memos
  using (user_id = (select auth.uid()));
alter policy "memos: teacher/admin 全件読み取り" on public.memos
  using ((select public.my_role()) in ('teacher', 'admin'));

-- posts
alter policy "posts: 認証ユーザーは閲覧可" on public.posts
  using ((select auth.uid()) is not null);
alter policy "posts: 本人のメモからのみ作成" on public.posts
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.memos
      where id = memo_id and user_id = (select auth.uid())
    )
  );
alter policy "posts: 本人のみ削除" on public.posts
  using (user_id = (select auth.uid()));
alter policy "posts: teacher/admin 全件削除" on public.posts
  using ((select public.my_role()) in ('teacher', 'admin'));

-- quizzes
alter policy "quizzes: 認証ユーザーは閲覧可" on public.quizzes
  using ((select auth.uid()) is not null);
alter policy "quizzes: teacher/admin のみ作成" on public.quizzes
  with check ((select public.my_role()) in ('teacher', 'admin'));
alter policy "quizzes: teacher/admin のみ更新" on public.quizzes
  using ((select public.my_role()) in ('teacher', 'admin'));
alter policy "quizzes: teacher/admin のみ削除" on public.quizzes
  using ((select public.my_role()) in ('teacher', 'admin'));

-- quiz_questions
alter policy "quiz_questions: 認証ユーザーは閲覧可" on public.quiz_questions
  using ((select auth.uid()) is not null);
alter policy "quiz_questions: teacher/admin のみ作成" on public.quiz_questions
  with check ((select public.my_role()) in ('teacher', 'admin'));
alter policy "quiz_questions: teacher/admin のみ更新" on public.quiz_questions
  using ((select public.my_role()) in ('teacher', 'admin'));
alter policy "quiz_questions: teacher/admin のみ削除" on public.quiz_questions
  using ((select public.my_role()) in ('teacher', 'admin'));

-- quiz_attempts
alter policy "quiz_attempts_select_own" on public.quiz_attempts
  using ((select auth.uid()) = user_id);
alter policy "quiz_attempts_insert_own" on public.quiz_attempts
  with check ((select auth.uid()) = user_id);
alter policy "quiz_attempts_select_teacher" on public.quiz_attempts
  using ((select public.my_role()) in ('teacher', 'admin'));

-- quiz_attempt_answers
alter policy "quiz_attempt_answers_select_own" on public.quiz_attempt_answers
  using (
    exists (
      select 1 from public.quiz_attempts
      where id = attempt_id and user_id = (select auth.uid())
    )
  );
alter policy "quiz_attempt_answers_insert_own" on public.quiz_attempt_answers
  with check (
    exists (
      select 1 from public.quiz_attempts
      where id = attempt_id and user_id = (select auth.uid())
    )
  );
alter policy "quiz_attempt_answers_select_teacher" on public.quiz_attempt_answers
  using ((select public.my_role()) in ('teacher', 'admin'));

-- code_snippets
alter policy "code_snippets: 認証ユーザーは閲覧可" on public.code_snippets
  using ((select auth.uid()) is not null);
alter policy "code_snippets: teacher/admin のみ作成" on public.code_snippets
  with check ((select public.my_role()) in ('teacher', 'admin'));
alter policy "code_snippets: teacher/admin のみ更新" on public.code_snippets
  using ((select public.my_role()) in ('teacher', 'admin'));
alter policy "code_snippets: teacher/admin のみ削除" on public.code_snippets
  using ((select public.my_role()) in ('teacher', 'admin'));

-- code_states（テーブルを student_code_states からリネームしたため、ポリシー名は旧名のまま）
alter policy "student_code_states: 本人のみ閲覧" on public.code_states
  using (user_id = (select auth.uid()));
alter policy "student_code_states: 本人のみ作成" on public.code_states
  with check (user_id = (select auth.uid()));
alter policy "student_code_states: 本人のみ更新" on public.code_states
  using (user_id = (select auth.uid()));
alter policy "code_states: teacher/adminも閲覧可" on public.code_states
  using ((select public.my_role()) in ('teacher', 'admin'));
