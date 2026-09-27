-- 本人による profiles 更新で role を変更できないようにする
--
-- 従来の「本人のみ更新」は with check を省略しており、using（id = auth.uid()）が
-- そのまま更新後の行の条件になっていた。このため本人が自分の role を任意の値に
-- 書き換えられた（Supabase の REST API を直接呼べば、アプリの API Route を経由しなくても可能）。
--
-- 更新後の role が現在の role と一致することを条件に加える。
-- my_role() は stable 関数のため、呼び出し元の UPDATE 文開始時点のスナップショット、
-- つまり更新前の role を返す。
--
-- 他のポリシーへの影響:
-- - 「teacher は student のみ更新可」は using（= with check）に role = 'student' を含むため、
--   教師が生徒の role を変更することはもともとできない
-- - 「admin は全件更新可」は変更しない（管理者は role を変更できる）
drop policy "profiles: 本人のみ更新" on public.profiles;

create policy "profiles: 本人のみ更新"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = public.my_role()
  );
