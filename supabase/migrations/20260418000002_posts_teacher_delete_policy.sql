-- teacher/admin は全件削除可
CREATE POLICY "posts: teacher/admin 全件削除"
  ON public.posts FOR DELETE
  USING (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('teacher', 'admin')
    )
  );
