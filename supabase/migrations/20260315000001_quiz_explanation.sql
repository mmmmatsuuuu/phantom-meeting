-- quiz_questions に解説フィールドを追加
alter table public.quiz_questions add column explanation jsonb;
