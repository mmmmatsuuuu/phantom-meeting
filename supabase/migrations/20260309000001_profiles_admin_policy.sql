-- admin は全プロフィールを閲覧・更新可
create policy "profiles: admin は全件閲覧可"
  on public.profiles for select
  using (public.my_role() = 'admin');

create policy "profiles: admin は全件更新可"
  on public.profiles for update
  using (public.my_role() = 'admin');
