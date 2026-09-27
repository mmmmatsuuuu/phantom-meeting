-- 単元の CSV エクスポート（/teacher/data-export）用の集計を DB 側で行う
--
-- 従来はアプリ側で学年全員の受験記録・回答・メモを取得して JS で集計していたが、
-- - 受験記録の取得で学年全員の ID を URL に並べるため、約200人を超えると URL 長の上限（HTTP 414）で失敗していた
-- - PostgREST の max_rows（1000行）で受験記録・メモが打ち切られうる
-- - 回答・メモを100件・100人ごとに分割取得しており、リクエスト数が多い
-- ため、設問ごと・抽出した生徒ごとの小さな結果だけを返す関数にした。

-- ─── tiptap の doc JSON からプレーンテキストを取り出す ─────────────────
-- アプリ側の tiptapDocToText（src/lib/tiptap-utils.ts）と同じ規則：
-- type が "text" のノードの text を文書順に空白でつなぎ、連続する空白を1つにまとめて前後を削る。
-- 空白は JS の \s と同じ範囲（全角スペース等を含む）を対象にする。
create or replace function public.tiptap_to_text(doc jsonb)
returns text
language sql
immutable
set search_path = public
as $$
  select btrim(
    regexp_replace(
      coalesce(string_agg(t #>> '{}', ' '), ''),
      '[\s   -     　﻿]+',
      ' ',
      'g'
    )
  )
  from jsonb_path_query(doc, 'strict $.** ? (@.type == "text").text') as t
$$;

-- ─── 小テスト結果：設問ごとの集計 ─────────────────────────────────────
-- 対象：単元内の小テスト × 学籍番号が [p_min_student_number, p_max_student_number] の生徒の最新受験
-- 返す列：
-- - class_stats：クラス番号 → [正答数, 回答数]（記述式を除く）。全体はアプリ側で合計する
-- - answer_counts：選択式の、選ばれた選択肢のテキスト → 回答数
-- - short_answer_samples：記述式の回答（空欄を除く）からランダムに最大3件
create or replace function public.unit_quiz_export_stats(
  p_unit_id uuid,
  p_min_student_number int,
  p_max_student_number int
)
returns table (
  question_id uuid,
  class_stats jsonb,
  answer_counts jsonb,
  short_answer_samples text[]
)
language sql
stable
security invoker
set search_path = public
as $$
  with students as (
    select p.id, (p.student_number % 1000) / 100 as class_num
    from profiles p
    where p.role = 'student'
      and p.student_number between p_min_student_number and p_max_student_number
  ),
  latest as (
    select distinct on (a.user_id, a.quiz_id) a.id, s.class_num
    from quiz_attempts a
    join students s on s.id = a.user_id
    join quizzes q on q.id = a.quiz_id
    join lessons l on l.id = q.lesson_id
    where l.unit_id = p_unit_id
    order by a.user_id, a.quiz_id, a.submitted_at desc
  ),
  answers as (
    select ans.question_id, qq.type, ans.answer, ans.is_correct, latest.class_num
    from quiz_attempt_answers ans
    join latest on latest.id = ans.attempt_id
    join quiz_questions qq on qq.id = ans.question_id
  ),
  class_stats as (
    select x.question_id, jsonb_object_agg(x.class_num, jsonb_build_array(x.correct, x.total)) as stats
    from (
      select a.question_id, a.class_num,
             count(*) filter (where a.is_correct) as correct,
             count(*) as total
      from answers a
      where a.type <> 'short_answer'
      group by a.question_id, a.class_num
    ) x
    group by x.question_id
  ),
  answer_counts as (
    select x.question_id, jsonb_object_agg(x.selected, x.n) as counts
    from (
      select a.question_id, a.answer ->> 'selectedText' as selected, count(*) as n
      from answers a
      where a.type = 'multiple_choice'
        and coalesce(a.answer ->> 'selectedText', '') <> ''
      group by a.question_id, a.answer ->> 'selectedText'
    ) x
    group by x.question_id
  ),
  short_answer_samples as (
    select z.question_id, array_agg(z.txt) as samples
    from (
      select y.question_id, y.txt,
             row_number() over (partition by y.question_id order by random()) as rn
      from (
        select a.question_id,
               regexp_replace(
                 coalesce(a.answer ->> 'text', ''),
                 '^[\s   -     　﻿]+|[\s   -     　﻿]+$',
                 '',
                 'g'
               ) as txt
        from answers a
        where a.type = 'short_answer'
      ) y
      where y.txt <> ''
    ) z
    where z.rn <= 3
    group by z.question_id
  )
  select
    q.question_id,
    coalesce(cs.stats, '{}'::jsonb),
    coalesce(ac.counts, '{}'::jsonb),
    coalesce(sa.samples, '{}'::text[])
  from (select distinct a.question_id from answers a) q
  left join class_stats cs on cs.question_id = q.question_id
  left join answer_counts ac on ac.question_id = q.question_id
  left join short_answer_samples sa on sa.question_id = q.question_id
$$;

-- ─── メモ：レッスンごとに生徒を抽出し、1人分のメモをつないで返す ─────────
-- 対象：単元内のレッスン × 学籍番号が [p_min_student_number, p_max_student_number] の生徒
-- 抽出：テキストが空でないメモを書いた生徒から、各クラス2名ずつ（2名未満のクラスはいる人数だけ）。
--       合計が10名に満たない場合は、残りの生徒から10名になるまでランダムに追加する。
-- memo_text：1人分のメモのテキストを作成日時順に「／」でつないだもの（文字数の切り詰めはアプリ側）
-- 学籍番号・氏名は返さない
create or replace function public.unit_memo_export_samples(
  p_unit_id uuid,
  p_min_student_number int,
  p_max_student_number int
)
returns table (lesson_id uuid, memo_text text)
language sql
volatile
security invoker
set search_path = public
as $$
  with students as (
    select p.id, (p.student_number % 1000) / 100 as class_num
    from profiles p
    where p.role = 'student'
      and p.student_number between p_min_student_number and p_max_student_number
  ),
  user_texts as (
    select m.lesson_id, m.user_id, s.class_num,
           string_agg(t.txt, '／' order by m.created_at) as merged
    from memos m
    join students s on s.id = m.user_id
    join lessons l on l.id = m.lesson_id
    cross join lateral (select public.tiptap_to_text(m.content) as txt) t
    where l.unit_id = p_unit_id
      and t.txt <> ''
    group by m.lesson_id, m.user_id, s.class_num
  ),
  ranked as (
    select u.*,
           row_number() over (partition by u.lesson_id, u.class_num order by random()) <= 2 as by_class,
           random() as r
    from user_texts u
  ),
  ordered as (
    -- クラスごとの2名を先頭に、残りをランダム順に並べる
    select r.*,
           row_number() over (partition by r.lesson_id order by (not r.by_class), r.r) as overall_rank
    from ranked r
  )
  select o.lesson_id, o.merged
  from ordered o
  where o.by_class or o.overall_rank <= 10
  order by o.lesson_id, o.overall_rank
$$;

-- 未ログイン（anon）からは呼べないようにする
revoke execute on function public.unit_quiz_export_stats(uuid, int, int) from public, anon;
grant execute on function public.unit_quiz_export_stats(uuid, int, int) to authenticated;
revoke execute on function public.unit_memo_export_samples(uuid, int, int) from public, anon;
grant execute on function public.unit_memo_export_samples(uuid, int, int) to authenticated;
