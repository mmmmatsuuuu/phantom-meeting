-- student_code_states に直近の実行結果を保存する列を追加
-- 実行のたびに上書きされる（履歴は残さない）ため行数は増えない
alter table public.student_code_states
  add column last_output text;
