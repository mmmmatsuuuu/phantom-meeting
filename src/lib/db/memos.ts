import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type Memo = Database["public"]["Tables"]["memos"]["Row"] & {
  content: TiptapContent;
};

export type TiptapText = {
  type: "text";
  text: string;
};

export type TiptapParagraph = {
  type: "paragraph";
  content?: TiptapText[];
};

export type TiptapContent = {
  type: "doc";
  content: TiptapParagraph[];
};

/**
 * ログインユーザーの指定レッスンのメモ一覧を取得する
 */
export async function getMemosByLessonId(lessonId: string): Promise<Memo[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("memos")
    .select("*")
    .eq("lesson_id", lessonId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Memo[];
}

/**
 * メモを新規作成する
 */
export async function createMemo(params: {
  lessonId: string;
  content: TiptapContent;
  timestampSeconds: number | null;
}): Promise<Memo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("memos")
    .insert({
      lesson_id: params.lessonId,
      user_id: user.id,
      content: params.content,
      timestamp_seconds: params.timestampSeconds,
    })
    .select()
    .single();

  if (error || !data) return null;
  return data as Memo;
}

/**
 * メモを削除する
 */
export async function deleteMemo(memoId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("memos").delete().eq("id", memoId);

  return !error;
}
