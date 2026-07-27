-- student_code_states → code_states にリネーム
-- RLSポリシー・データ・外部キー制約はテーブルリネームで自動的に引き継がれる。
-- 制約・インデックス名も揃えておく。
alter table public.student_code_states rename to code_states;

alter table public.code_states rename constraint student_code_states_pkey to code_states_pkey;
alter table public.code_states rename constraint student_code_states_snippet_id_fkey to code_states_snippet_id_fkey;
alter table public.code_states rename constraint student_code_states_user_id_fkey to code_states_user_id_fkey;
alter table public.code_states rename constraint student_code_states_snippet_id_user_id_key to code_states_snippet_id_user_id_key;

alter index public.student_code_states_snippet_id_idx rename to code_states_snippet_id_idx;
