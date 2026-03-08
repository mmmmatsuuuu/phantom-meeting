-- posts: 本人のみ削除可
CREATE POLICY "posts: 本人のみ削除"
  ON public.posts FOR DELETE
  USING (user_id = auth.uid());
