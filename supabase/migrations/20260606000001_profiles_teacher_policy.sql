-- teacher は student ロールのプロフィールのみ閲覧・更新可
CREATE POLICY "profiles: teacher は student のみ閲覧可"
  ON public.profiles FOR SELECT
  USING (
    public.my_role() = 'teacher'
    AND role = 'student'
  );

CREATE POLICY "profiles: teacher は student のみ更新可"
  ON public.profiles FOR UPDATE
  USING (
    public.my_role() = 'teacher'
    AND role = 'student'
  );
