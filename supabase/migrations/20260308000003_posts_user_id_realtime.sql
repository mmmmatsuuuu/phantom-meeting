-- =====================
-- posts に user_id カラムを追加（投稿者識別のため）
-- =====================

ALTER TABLE public.posts
  ADD COLUMN user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE;

-- =====================
-- RLS ポリシーを更新（user_id も検証）
-- =====================

DROP POLICY "posts: 本人のメモからのみ作成" ON public.posts;

CREATE POLICY "posts: 本人のメモからのみ作成"
  ON public.posts FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.memos
      WHERE id = memo_id AND user_id = auth.uid()
    )
  );

-- =====================
-- Realtime を有効化
-- =====================

ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
