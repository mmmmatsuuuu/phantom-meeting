import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import {
  collectImageSrcs,
  findDisallowedImages,
  isTiptapDoc,
  isWithinNoteSize,
  type TiptapDoc,
} from "@/lib/tiptap-utils";

/**
 * 保存しようとしているノートの内容を確かめる。問題があればエラーの文言を返す。
 * 画像は、そのレッスンのひな形に入っているものだけを許可する（外部の画像や生徒のアップロードを入れさせない）
 */
export async function validateMemoContent(lessonId: string, content: unknown): Promise<string | null> {
  if (!isTiptapDoc(content)) return "content must be a tiptap document";
  if (!isWithinNoteSize(content)) return "ノートが長すぎます。いくつかのノートに分けてください";
  if (findDisallowedImages(content, []).length === 0) return null;

  const template = await getMemoTemplate(lessonId);
  const disallowed = findDisallowedImages(content, template ? collectImageSrcs(template) : []);
  return disallowed.length > 0 ? "ノートに入れられる画像は、先生が用意したものだけです" : null;
}

/**
 * レッスンのノートのひな形（tiptap の文書 JSON）を取得する。なければ null
 */
export async function getMemoTemplate(lessonId: string): Promise<TiptapDoc | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memo_templates")
    .select("content")
    .eq("lesson_id", lessonId)
    .maybeSingle();
  return (data?.content as TiptapDoc | undefined) ?? null;
}

export async function saveMemoTemplate(
  lessonId: string,
  content: TiptapDoc,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("memo_templates").upsert({
    lesson_id: lessonId,
    content: content as unknown as Json,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  });
  return !error;
}

export async function deleteMemoTemplate(lessonId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("memo_templates").delete().eq("lesson_id", lessonId);
  return !error;
}
