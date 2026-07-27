-- =====================================================================
-- ローカル開発用ダミーデータ
-- =====================================================================
-- このファイルは `supabase db reset` のたびに自動で再投入される。
-- 開発者自身のアカウント（Googleログイン）は auth.users ごと消えるため、
-- reset 後は改めてログイン→ Supabase Studio で role を teacher/admin に
-- 変更すること。ここで作るのはそれ以外の周辺データ（テスト用の教師・
-- 生徒・コンテンツ・小テスト結果等）。
--
-- 生徒は 2学年 × 2組 × 8名 = 32名。学籍番号は「学年+組+出席番号」の
-- 4桁（例: 1101 = 1年1組1番）で、既存の集計ロジック（student_number の
-- 桁構造を利用したクラス絞り込み）とそのまま整合する。
--
-- 実装メモ: `supabase db reset` のシード投入は各文を別接続/別バッチで
-- 実行することがあり、一時テーブル（セッションスコープ）は文をまたいで
-- 参照できない。そのため生徒のUUIDは temp table を使わず、学籍番号から
-- 決定的に導出する（'00000000-0000-0000-0000-' || 学籍番号を12桁ゼロ埋め）。
-- どの文からも同じ生徒IDを独立に再計算できる。
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. auth.users への投入（トリガーで public.profiles に自動反映される）
-- ---------------------------------------------------------------------

-- 教師（固定UUID。科目・単元の作成者にも使う）
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated',
  'seed-teacher1@example.com', 'seed-not-a-real-password',
  now(), '{"provider":"seed"}', '{"full_name":"テスト教師1"}', now(), now()
);

update public.profiles set role = 'teacher' where id = '00000000-0000-0000-0000-000000000001';

-- 生徒32名（学年1-2 × 組1-2 × 出席番号1-8）
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000',
  ('00000000-0000-0000-0000-' || lpad((g * 1000 + c * 100 + n)::text, 12, '0'))::uuid,
  'authenticated', 'authenticated',
  'seed-student' || (g * 1000 + c * 100 + n) || '@example.com',
  'seed-not-a-real-password',
  now(), '{"provider":"seed"}',
  jsonb_build_object('full_name', 'テスト生徒' || (g * 1000 + c * 100 + n)::text),
  now(), now()
from generate_series(1, 2) as g
cross join generate_series(1, 2) as c
cross join generate_series(1, 8) as n;

update public.profiles p
set student_number = sub.student_number
from (
  select
    ('00000000-0000-0000-0000-' || lpad((g * 1000 + c * 100 + n)::text, 12, '0'))::uuid as user_id,
    g * 1000 + c * 100 + n as student_number
  from generate_series(1, 2) as g
  cross join generate_series(1, 2) as c
  cross join generate_series(1, 8) as n
) sub
where p.id = sub.user_id;

-- ---------------------------------------------------------------------
-- 2. 科目・単元・レッスン・発問
-- ---------------------------------------------------------------------

insert into public.subjects (id, name, "order", created_by) values
  ('00000000-0000-0000-0000-000000001001', '情報Ⅰ', 0, '00000000-0000-0000-0000-000000000001');

insert into public.units (id, subject_id, name, "order") values
  ('00000000-0000-0000-0000-000000001101', '00000000-0000-0000-0000-000000001001', 'コンピュータの仕組み', 0),
  ('00000000-0000-0000-0000-000000001102', '00000000-0000-0000-0000-000000001001', 'プログラミング入門', 1);

insert into public.lessons (id, unit_id, title, youtube_url, "order", enable_playground) values
  ('00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000001101', 'CPUとメモリの役割', 'https://www.youtube.com/watch?v=jNQXAC9IVRw', 0, false),
  ('00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000001101', '2進数と情報量',     'https://www.youtube.com/watch?v=jNQXAC9IVRw', 1, false),
  ('00000000-0000-0000-0000-000000002003', '00000000-0000-0000-0000-000000001102', '変数と出力',         'https://www.youtube.com/watch?v=jNQXAC9IVRw', 0, true),
  ('00000000-0000-0000-0000-000000002004', '00000000-0000-0000-0000-000000001102', '条件分岐',           'https://www.youtube.com/watch?v=jNQXAC9IVRw', 1, true),
  ('00000000-0000-0000-0000-000000002005', '00000000-0000-0000-0000-000000001102', '繰り返し処理',       'https://www.youtube.com/watch?v=jNQXAC9IVRw', 2, true);

insert into public.questions (lesson_id, content, "order") values
  ('00000000-0000-0000-0000-000000002001', 'CPUとメモリ、それぞれの役割を自分の言葉で説明してみましょう。', 0),
  ('00000000-0000-0000-0000-000000002001', '身の回りの機器でCPUとメモリが使われている例を考えてみましょう。', 1),
  ('00000000-0000-0000-0000-000000002002', 'コンピュータが2進数を使う理由を考えてみましょう。', 0),
  ('00000000-0000-0000-0000-000000002003', '変数に名前をつけるときに気をつけるとよいことは何でしょうか。', 0),
  ('00000000-0000-0000-0000-000000002004', '身の回りの「もし〜なら」で考える場面を挙げてみましょう。', 0),
  ('00000000-0000-0000-0000-000000002005', '同じ作業を繰り返すとき、手作業とプログラムでは何が違うでしょうか。', 0);

-- ---------------------------------------------------------------------
-- 3. 小テスト（各レッスンに1つ、選択式2・記述式1・並び替え1の構成で統一）
-- ---------------------------------------------------------------------

insert into public.quizzes (id, lesson_id, title) values
  ('00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000002001', '確認テスト：CPUとメモリの役割'),
  ('00000000-0000-0000-0000-000000003002', '00000000-0000-0000-0000-000000002002', '確認テスト：2進数と情報量'),
  ('00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000002003', '確認テスト：変数と出力'),
  ('00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000002004', '確認テスト：条件分岐'),
  ('00000000-0000-0000-0000-000000003005', '00000000-0000-0000-0000-000000002005', '確認テスト：繰り返し処理');

-- クイズ1：CPUとメモリの役割
insert into public.quiz_questions (id, quiz_id, type, content, correct_answer, options, "order") values
  ('00000000-0000-0000-0000-000000004011', '00000000-0000-0000-0000-000000003001', 'multiple_choice',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"CPUの役割として最も適切なものはどれか。"}]}]}'::jsonb,
    '{"index":1}'::jsonb,
    '["データを長期的に保存する","命令を実行し計算を行う","画面に映像を出力する","キーボードからの入力を受け取る"]'::jsonb,
    0),
  ('00000000-0000-0000-0000-000000004012', '00000000-0000-0000-0000-000000003001', 'multiple_choice',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"メインメモリ（RAM）の特徴として正しいものはどれか。"}]}]}'::jsonb,
    '{"index":2}'::jsonb,
    '["電源を切っても内容が保持される","CPUより処理速度が遅いがハードディスクより速い","処理中のデータを一時的に記憶する","データを半永久的に保存するための装置である"]'::jsonb,
    1),
  ('00000000-0000-0000-0000-000000004013', '00000000-0000-0000-0000-000000003001', 'short_answer',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"CPUとメモリの違いを自分の言葉で説明してください。"}]}]}'::jsonb,
    '{"text":"CPUは計算や命令の実行を行う装置で、メモリは処理中のデータを一時的に記憶しておく装置である。"}'::jsonb,
    null,
    2),
  ('00000000-0000-0000-0000-000000004014', '00000000-0000-0000-0000-000000003001', 'ordering',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"データが処理される一般的な流れを正しい順に並べ替えなさい。"}]}]}'::jsonb,
    '["入力装置からデータが入力される","メモリに一時的に記憶される","CPUが計算・処理を行う","出力装置に結果が表示される"]'::jsonb,
    '["入力装置からデータが入力される","メモリに一時的に記憶される","CPUが計算・処理を行う","出力装置に結果が表示される"]'::jsonb,
    3);

-- クイズ2：2進数と情報量
insert into public.quiz_questions (id, quiz_id, type, content, correct_answer, options, "order") values
  ('00000000-0000-0000-0000-000000004021', '00000000-0000-0000-0000-000000003002', 'multiple_choice',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"2進数の「1010」を10進数に変換するといくつか。"}]}]}'::jsonb,
    '{"index":2}'::jsonb,
    '["8","9","10","12"]'::jsonb,
    0),
  ('00000000-0000-0000-0000-000000004022', '00000000-0000-0000-0000-000000003002', 'multiple_choice',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"1バイトは何ビットか。"}]}]}'::jsonb,
    '{"index":1}'::jsonb,
    '["4ビット","8ビット","16ビット","32ビット"]'::jsonb,
    1),
  ('00000000-0000-0000-0000-000000004023', '00000000-0000-0000-0000-000000003002', 'short_answer',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"コンピュータが情報を2進数で扱う理由を説明してください。"}]}]}'::jsonb,
    '{"text":"コンピュータの回路は電気信号のON/OFFの2状態しか区別できないため、それに対応する2進数で情報を表現している。"}'::jsonb,
    null,
    2),
  ('00000000-0000-0000-0000-000000004024', '00000000-0000-0000-0000-000000003002', 'ordering',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"情報量の単位を小さい順に並べ替えなさい。"}]}]}'::jsonb,
    '["ビット","バイト","キロバイト","メガバイト"]'::jsonb,
    '["ビット","バイト","キロバイト","メガバイト"]'::jsonb,
    3);

-- クイズ3：変数と出力
insert into public.quiz_questions (id, quiz_id, type, content, correct_answer, options, "order") values
  ('00000000-0000-0000-0000-000000004031', '00000000-0000-0000-0000-000000003003', 'multiple_choice',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Pythonで変数に文字列を代入する正しい書き方はどれか。"}]}]}'::jsonb,
    '{"index":1}'::jsonb,
    '["name = 情報太郎","name = ''情報太郎''","name := ''情報太郎''","string name = ''情報太郎''"]'::jsonb,
    0),
  ('00000000-0000-0000-0000-000000004032', '00000000-0000-0000-0000-000000003003', 'multiple_choice',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"print(1, 2, 3) の実行結果として正しいものはどれか。"}]}]}'::jsonb,
    '{"index":1}'::jsonb,
    '["123","1 2 3","1,2,3","エラーになる"]'::jsonb,
    1),
  ('00000000-0000-0000-0000-000000004033', '00000000-0000-0000-0000-000000003003', 'short_answer',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"変数を使うことのメリットを1つ挙げてください。"}]}]}'::jsonb,
    '{"text":"同じ値を何度も書き直さずに、名前をつけて使い回せる点。"}'::jsonb,
    null,
    2),
  ('00000000-0000-0000-0000-000000004034', '00000000-0000-0000-0000-000000003003', 'ordering',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"次の処理を実行される順に並べ替えなさい。"}]}]}'::jsonb,
    '["変数に値を代入する","変数の値を演算する","結果を別の変数に代入する","print()で出力する"]'::jsonb,
    '["変数に値を代入する","変数の値を演算する","結果を別の変数に代入する","print()で出力する"]'::jsonb,
    3);

-- クイズ4：条件分岐
insert into public.quiz_questions (id, quiz_id, type, content, correct_answer, options, "order") values
  ('00000000-0000-0000-0000-000000004041', '00000000-0000-0000-0000-000000003004', 'multiple_choice',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"if文の条件が偽（False）のときに実行される部分はどれか。"}]}]}'::jsonb,
    '{"index":2}'::jsonb,
    '["if","elif","else","for"]'::jsonb,
    0),
  ('00000000-0000-0000-0000-000000004042', '00000000-0000-0000-0000-000000003004', 'multiple_choice',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"「age >= 18」が真になるのはどのような場合か。"}]}]}'::jsonb,
    '{"index":1}'::jsonb,
    '["ageが18より小さい場合","ageが18以上の場合","ageが18と等しくない場合","常に真になる"]'::jsonb,
    1),
  ('00000000-0000-0000-0000-000000004043', '00000000-0000-0000-0000-000000003004', 'short_answer',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"if文を使う目的を説明してください。"}]}]}'::jsonb,
    '{"text":"条件によって処理の流れを分岐させ、状況に応じた異なる動作をさせるため。"}'::jsonb,
    null,
    2),
  ('00000000-0000-0000-0000-000000004044', '00000000-0000-0000-0000-000000003004', 'ordering',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"if-elif-elseの評価の流れとして正しい順に並べ替えなさい。"}]}]}'::jsonb,
    '["ifの条件を評価する","条件が真ならその処理を実行する","偽ならelifの条件を評価する","どれも真でなければelseを実行する"]'::jsonb,
    '["ifの条件を評価する","条件が真ならその処理を実行する","偽ならelifの条件を評価する","どれも真でなければelseを実行する"]'::jsonb,
    3);

-- クイズ5：繰り返し処理
insert into public.quiz_questions (id, quiz_id, type, content, correct_answer, options, "order") values
  ('00000000-0000-0000-0000-000000004051', '00000000-0000-0000-0000-000000003005', 'multiple_choice',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"for文が使われる目的として正しいものはどれか。"}]}]}'::jsonb,
    '{"index":1}'::jsonb,
    '["条件分岐を行うため","同じ処理を繰り返すため","ファイルを保存するため","エラーを処理するため"]'::jsonb,
    0),
  ('00000000-0000-0000-0000-000000004052', '00000000-0000-0000-0000-000000003005', 'multiple_choice',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"JavaScriptで0から4まで繰り返すfor文の条件式はどれか。"}]}]}'::jsonb,
    '{"index":0}'::jsonb,
    '["i < 5","i > 5","i == 5","i <= 0"]'::jsonb,
    1),
  ('00000000-0000-0000-0000-000000004053', '00000000-0000-0000-0000-000000003005', 'short_answer',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"繰り返し処理を使うことでどのようなメリットがありますか。"}]}]}'::jsonb,
    '{"text":"同じコードを何度も書かずに済み、処理を簡潔に記述できる。"}'::jsonb,
    null,
    2),
  ('00000000-0000-0000-0000-000000004054', '00000000-0000-0000-0000-000000003005', 'ordering',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"for文の実行の流れとして正しい順に並べ替えなさい。"}]}]}'::jsonb,
    '["初期化式が実行される","条件式が評価される","条件が真ならブロック内の処理を実行する","更新式が実行され再び条件式に戻る"]'::jsonb,
    '["初期化式が実行される","条件式が評価される","条件が真ならブロック内の処理を実行する","更新式が実行され再び条件式に戻る"]'::jsonb,
    3);

-- ---------------------------------------------------------------------
-- 4. コーディングプレイグラウンドの初期コード（Phase 21 確認用）
-- ---------------------------------------------------------------------

insert into public.code_snippets (id, lesson_id, title, language, initial_code, "order") values
  ('00000000-0000-0000-0000-000000005001', '00000000-0000-0000-0000-000000002003', '例1: 変数を表示する（Python）', 'python',
$py$name = "情報太郎"
age = 16
print(name, "さんは", age, "歳です")
$py$, 0),
  ('00000000-0000-0000-0000-000000005002', '00000000-0000-0000-0000-000000002003', '例1: 変数を表示する（JavaScript）', 'javascript',
$js$const name = "情報太郎";
const age = 16;
console.log(name + "さんは" + age + "歳です");
$js$, 1),
  ('00000000-0000-0000-0000-000000005003', '00000000-0000-0000-0000-000000002004', '例1: 条件分岐（input()を使う）', 'python',
$py$age = int(input("年齢を入力してください: "))
if age >= 18:
    print("成人です")
else:
    print("未成年です")
$py$, 0),
  ('00000000-0000-0000-0000-000000005004', '00000000-0000-0000-0000-000000002005', '例1: 繰り返し処理（prompt()を使う）', 'javascript',
$js$const name = prompt("お名前を入力してください");
for (let i = 1; i <= 3; i++) {
  console.log(i + "回目: " + name + "さん、こんにちは！");
}
$js$, 0);

-- ---------------------------------------------------------------------
-- 5. 小テスト受験記録（学籍番号から決定的に算出。何度リセットしても同じ結果になる）
-- ---------------------------------------------------------------------
-- ability: 生徒ごとの「実力」を 0-99 で表す固定値（同じ生徒は全レッスンで
--          一貫して得意/苦手の傾向を示す）
-- roll:    設問ごとの判定用の疑似乱数（0-99）。roll < ability で正解とする
-- 未受験:  (student_number + qi) % 9 = 0 の組み合わせは意図的に未受験のまま
-- 再受験:  quiz1 に限り、student_number % 8 = 0 の生徒は後日に2回目の受験
--          をする（最新の受験のみが集計されることの確認用）
-- ---------------------------------------------------------------------

do $$
declare
  quiz_ids uuid[] := array[
    '00000000-0000-0000-0000-000000003001',
    '00000000-0000-0000-0000-000000003002',
    '00000000-0000-0000-0000-000000003003',
    '00000000-0000-0000-0000-000000003004',
    '00000000-0000-0000-0000-000000003005'
  ]::uuid[];
  student_number int;
  student_user_id uuid;
  qi        int;
  v_quiz_id uuid;
  q         record;
  ability   int;
  roll      int;
  is_correct boolean;
  correct_idx int;
  wrong_idx int;
  opts      text[];
  correct_items text[];
  chosen_items  text[];
  answer_json jsonb;
  new_attempt_id uuid;
  running_score int;
  max_score int;
  submitted_ts timestamptz;
  short_answer_texts text[] := array[
    'まだよくわかっていない部分があるので復習したいです。',
    'だいたい理解できました。具体例を考えると分かりやすかったです。',
    '思っていたより簡単でした。もっと発展的な内容も知りたいです。'
  ];
begin
  for student_number in
    select g * 1000 + c * 100 + n
    from generate_series(1, 2) as g
    cross join generate_series(1, 2) as c
    cross join generate_series(1, 8) as n
    order by 1
  loop
    student_user_id := ('00000000-0000-0000-0000-' || lpad(student_number::text, 12, '0'))::uuid;
    ability := (student_number * 37) % 100;

    for qi in 1..5 loop
      -- 未受験パターン
      if (student_number + qi) % 9 = 0 then
        continue;
      end if;

      v_quiz_id := quiz_ids[qi];
      select count(*) into max_score from public.quiz_questions
        where quiz_id = v_quiz_id and type <> 'short_answer';

      submitted_ts := now() - ((6 - qi) || ' days')::interval - (student_number || ' minutes')::interval;
      new_attempt_id := gen_random_uuid();

      insert into public.quiz_attempts (id, quiz_id, user_id, score, max_score, submitted_at)
      values (new_attempt_id, v_quiz_id, student_user_id, 0, max_score, submitted_ts);

      running_score := 0;
      for q in select * from public.quiz_questions where quiz_id = v_quiz_id order by "order" loop
        if q.type = 'short_answer' then
          answer_json := jsonb_build_object(
            'type', 'short_answer',
            'text', short_answer_texts[1 + (student_number + qi) % array_length(short_answer_texts, 1)]
          );
          insert into public.quiz_attempt_answers (attempt_id, question_id, answer, is_correct)
          values (new_attempt_id, q.id, answer_json, null);
          continue;
        end if;

        roll := (student_number * 13 + qi * 29 + q."order" * 53) % 100;
        is_correct := roll < ability;

        if q.type = 'multiple_choice' then
          opts := array(select jsonb_array_elements_text(q.options));
          correct_idx := (q.correct_answer->>'index')::int;
          if is_correct then
            answer_json := jsonb_build_object('type', 'multiple_choice', 'selectedText', opts[correct_idx + 1]);
          else
            wrong_idx := (correct_idx + 1) % array_length(opts, 1);
            answer_json := jsonb_build_object('type', 'multiple_choice', 'selectedText', opts[wrong_idx + 1]);
          end if;
        else -- ordering
          correct_items := array(select jsonb_array_elements_text(q.correct_answer));
          if is_correct then
            chosen_items := correct_items;
          else
            select array_agg(elem order by ord desc) into chosen_items
              from unnest(correct_items) with ordinality as t(elem, ord);
          end if;
          answer_json := jsonb_build_object('type', 'ordering', 'items', to_jsonb(chosen_items));
        end if;

        insert into public.quiz_attempt_answers (attempt_id, question_id, answer, is_correct)
        values (new_attempt_id, q.id, answer_json, is_correct);

        if is_correct then
          running_score := running_score + 1;
        end if;
      end loop;

      update public.quiz_attempts set score = running_score where id = new_attempt_id;

      -- クイズ1のみ、一部の生徒が後日「復習して」再受験する
      if qi = 1 and student_number % 8 = 0 then
        new_attempt_id := gen_random_uuid();
        submitted_ts := now() - interval '1 day';
        insert into public.quiz_attempts (id, quiz_id, user_id, score, max_score, submitted_at)
        values (new_attempt_id, v_quiz_id, student_user_id, 0, max_score, submitted_ts);

        running_score := 0;
        for q in select * from public.quiz_questions where quiz_id = v_quiz_id order by "order" loop
          if q.type = 'short_answer' then
            insert into public.quiz_attempt_answers (attempt_id, question_id, answer, is_correct)
            values (new_attempt_id, q.id,
              jsonb_build_object('type', 'short_answer', 'text', '再受験して理解が深まりました。'),
              null);
            continue;
          end if;

          -- 再受験は理解が進んだ想定でability+25（上限99）にして判定
          roll := (student_number * 13 + qi * 29 + q."order" * 53 + 7) % 100;
          is_correct := roll < least(ability + 25, 99);

          if q.type = 'multiple_choice' then
            opts := array(select jsonb_array_elements_text(q.options));
            correct_idx := (q.correct_answer->>'index')::int;
            if is_correct then
              answer_json := jsonb_build_object('type', 'multiple_choice', 'selectedText', opts[correct_idx + 1]);
            else
              wrong_idx := (correct_idx + 1) % array_length(opts, 1);
              answer_json := jsonb_build_object('type', 'multiple_choice', 'selectedText', opts[wrong_idx + 1]);
            end if;
          else
            correct_items := array(select jsonb_array_elements_text(q.correct_answer));
            if is_correct then
              chosen_items := correct_items;
            else
              select array_agg(elem order by ord desc) into chosen_items
                from unnest(correct_items) with ordinality as t(elem, ord);
            end if;
            answer_json := jsonb_build_object('type', 'ordering', 'items', to_jsonb(chosen_items));
          end if;

          insert into public.quiz_attempt_answers (attempt_id, question_id, answer, is_correct)
          values (new_attempt_id, q.id, answer_json, is_correct);

          if is_correct then
            running_score := running_score + 1;
          end if;
        end loop;

        update public.quiz_attempts set score = running_score where id = new_attempt_id;
      end if;
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 6. メモ・共有投稿・プレイグラウンド編集内容（一部の生徒のみ）
-- ---------------------------------------------------------------------

do $$
declare
  s1 uuid := ('00000000-0000-0000-0000-' || lpad('1101', 12, '0'))::uuid;
  s2 uuid := ('00000000-0000-0000-0000-' || lpad('1102', 12, '0'))::uuid;
  s3 uuid := ('00000000-0000-0000-0000-' || lpad('1201', 12, '0'))::uuid;
  s4 uuid := ('00000000-0000-0000-0000-' || lpad('2101', 12, '0'))::uuid;
  memo1 uuid := gen_random_uuid();
  memo2 uuid := gen_random_uuid();
  memo3 uuid := gen_random_uuid();
begin
  insert into public.memos (id, lesson_id, user_id, content, timestamp_seconds) values
    (memo1, '00000000-0000-0000-0000-000000002001', s1,
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"CPUは頭脳、メモリは作業机のようなものだと理解した。"}]}]}'::jsonb,
      45),
    (memo2, '00000000-0000-0000-0000-000000002001', s2,
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"メモリの容量が大きいと同時にたくさんの作業ができる、という説明が分かりやすかった。"}]}]}'::jsonb,
      null),
    (memo3, '00000000-0000-0000-0000-000000002003', s3,
      '{"type":"doc","content":[{"type":"codeBlock","attrs":{"language":"python"},"content":[{"type":"text","text":"name = \"わたし\"\nprint(name, \"です\")"}]},{"type":"paragraph","content":[{"type":"text","text":"変数の中身をprintで確認できるのが便利。"}]}]}'::jsonb,
      12);

  insert into public.memos (lesson_id, user_id, content, timestamp_seconds) values
    ('00000000-0000-0000-0000-000000002004', s4,
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"if文のelseを忘れがちなので気をつけたい。"}]}]}'::jsonb,
      null);

  -- 一部のメモをクラスに共有投稿
  insert into public.posts (memo_id, lesson_id, user_id, content, timestamp_seconds) values
    (memo1, '00000000-0000-0000-0000-000000002001', s1,
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"CPUは頭脳、メモリは作業机のようなものだと理解した。"}]}]}'::jsonb,
      45),
    (memo3, '00000000-0000-0000-0000-000000002003', s3,
      '{"type":"doc","content":[{"type":"codeBlock","attrs":{"language":"python"},"content":[{"type":"text","text":"name = \"わたし\"\nprint(name, \"です\")"}]},{"type":"paragraph","content":[{"type":"text","text":"変数の中身をprintで確認できるのが便利。"}]}]}'::jsonb,
      12);

  -- プレイグラウンドの編集内容（保存済みコード・直近の実行結果）
  insert into public.code_states (snippet_id, user_id, code, last_output) values
    ('00000000-0000-0000-0000-000000005001', s1, $code$name = "わたしの名前"
age = 15
print(name, "さんは", age, "歳です")
print("よろしくお願いします")
$code$,
$out$わたしの名前さんは15歳です
よろしくお願いします
$out$),
    ('00000000-0000-0000-0000-000000005002', s2, $code$const name = "テスト太郎";
const age = 16;
console.log(name + "さんは" + age + "歳です");
console.log("プログラミング楽しい！");
$code$,
$out$テスト太郎さんは16歳です
プログラミング楽しい！
$out$);
end $$;
