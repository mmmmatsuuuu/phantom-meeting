-- 単元別分析（/teacher/analytics/units）用：科目内の設問ごとの正答数・回答数を集計する
--
-- 従来はアプリ側で受験記録・回答を全件取得して JS で集計していたが、
-- PostgREST の max_rows（1000行）で受験記録が打ち切られ、古い単元の結果が欠けていた。
-- 集計を DB 内で行い、設問数ぶんの行だけを返す。
--
-- - 対象：学籍番号が [p_min_student_number, p_max_student_number] の生徒
-- - 各生徒×各クイズの最新受験のみを集計する
-- - 記述式（is_correct が null）は集計に含めない
-- - security invoker：呼び出したユーザーの RLS が効く（教師は全生徒、生徒は自分の分のみ）
create or replace function public.quiz_question_stats(
  p_subject_id uuid,
  p_min_student_number int,
  p_max_student_number int
)
returns table (question_id uuid, correct_count int, total_count int)
language sql
stable
security invoker
set search_path = public
as $$
  with latest as (
    select distinct on (a.user_id, a.quiz_id) a.id
    from quiz_attempts a
    join quizzes q on q.id = a.quiz_id
    join lessons l on l.id = q.lesson_id
    join units u on u.id = l.unit_id
    join profiles p on p.id = a.user_id
    where u.subject_id = p_subject_id
      and p.role = 'student'
      and p.student_number between p_min_student_number and p_max_student_number
    order by a.user_id, a.quiz_id, a.submitted_at desc
  )
  select
    ans.question_id,
    (count(*) filter (where ans.is_correct))::int as correct_count,
    count(*)::int as total_count
  from quiz_attempt_answers ans
  join latest on latest.id = ans.attempt_id
  where ans.is_correct is not null
  group by ans.question_id
$$;

-- 未ログイン（anon）からは呼べないようにする
revoke execute on function public.quiz_question_stats(uuid, int, int) from public, anon;
grant execute on function public.quiz_question_stats(uuid, int, int) to authenticated;

-- 「生徒×クイズごとの最新受験」の特定用
create index quiz_attempts_quiz_user_submitted_idx
  on public.quiz_attempts (quiz_id, user_id, submitted_at desc);
