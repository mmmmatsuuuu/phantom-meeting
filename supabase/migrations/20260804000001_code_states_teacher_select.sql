-- teacher/admin が生徒のコード実行状況を確認できるよう、code_states に閲覧ポリシーを追加する。
-- 既存の「本人のみ閲覧」ポリシーはそのまま残し、SELECTに関して additive に許可を広げる
-- （Postgresの同一操作に対する複数のpermissiveポリシーはOR結合されるため、本人アクセスは維持される）。
create policy "code_states: teacher/adminも閲覧可"
  on public.code_states for select
  using (public.my_role() in ('teacher', 'admin'));
