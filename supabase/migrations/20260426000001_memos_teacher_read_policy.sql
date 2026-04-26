-- teacher/admin は全生徒のメモを読み取り可
CREATE POLICY "memos: teacher/admin 全件読み取り"
  ON public.memos FOR SELECT
  USING (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('teacher', 'admin')
    )
  );
