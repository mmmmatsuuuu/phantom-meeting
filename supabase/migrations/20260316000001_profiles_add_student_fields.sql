-- profiles テーブルに学籍番号・備考を追加
alter table public.profiles
  add column student_number integer,
  add column note text;
